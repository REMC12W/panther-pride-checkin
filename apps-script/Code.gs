/**
 * Panther Pride Center – Check-In backend
 *
 * Lives inside the Google Sheet (Extensions → Apps Script). One file, one
 * deployment (Web app, Execute as: Me, Who has access: Anyone).
 *
 * - The kiosk POSTs check-ins, check-outs, incident reports, and feedback,
 *   each carrying KIOSK_TOKEN.
 * - The admin dashboard (staff.html on GitHub Pages) POSTs a Google ID token
 *   from "Sign in with Google". It is verified here on every request, and only
 *   ALLOWED_DOMAIN accounts (or ADMIN_EMAILS) get data back.
 */

// ---- Settings ---------------------------------------------------------------

// Google OAuth Client ID for "Sign in with Google" on staff.html. Must match
// GOOGLE_CLIENT_ID in config.js (README step 5).
const GOOGLE_CLIENT_ID = '680243392561-vod2q88igf1v8mr84uc7b4h075lv6g5p.apps.googleusercontent.com';

// Only Google accounts on this domain may open the dashboard.
const ALLOWED_DOMAIN = 'kresa.org';

// Optional: restrict the dashboard to specific people instead of the whole domain.
//   const ADMIN_EMAILS = ['ben.tomlinson@kresa.org', 'someone@kresa.org'];
const ADMIN_EMAILS = [];

// Who may sign in the kiosk iPad (which turns on badge / student ID lookup).
// Empty = any ALLOWED_DOMAIN account. Add emails to restrict it, e.g. a shared
// Pride Center account:  const KIOSK_ACCOUNTS = ['pridecenter@kresa.org'];
const KIOSK_ACCOUNTS = [];

// How long an iPad stays signed in before a staff member must sign it in again.
const KIOSK_SESSION_DAYS = 30;

const ROSTER_NAME = 'Roster';

// Must match KIOSK_TOKEN in the app's config.js. Check-ins without it are rejected.
// Leave empty to accept any POST (not recommended once the app is live).
const KIOSK_TOKEN = '7b4a5c379eb19ea01f851fea';

const SHEET_NAME   = 'Check-Ins';
const SUMMARY_NAME = 'Summary';

const HEADERS = [
  'Timestamp', 'Date', 'Time', 'Name / ID', 'Referral', 'Reason', 'Energy',
  'Mood Group', 'Mood Word', 'What Happened', 'Need', 'Basic Needs', 'Outcome', 'Kiosk',
  'Station Suggested', 'Station',
  'Checkout Time', 'Minutes in Room', 'Checkout Energy', 'Checkout Mood Group', 'Checkout Mood Word', 'What Helped',
  'Checked Out By', 'Student ID', 'Staff Confirmed'
];
const COL_STUDENT_ID = 24;
const COL_CONFIRMED = 25;
// Column numbers (1-based) used by the check-out matcher.
const COL_CHECKOUT_TIME = 17;

// ---- Kiosk: one check-in per POST -------------------------------------------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.type === 'dashboard') return json_(dashboard_(data));
    if (data.type === 'review') return json_(review_(data));
    if (data.type === 'staffCheckout') return json_(staffCheckout_(data));
    if (data.type === 'confirmVisit') return json_(confirmVisit_(data));
    if (data.type === 'kioskSignIn') return json_(kioskSignIn_(data));
    if (data.type === 'kioskStatus') return json_(kioskStatus_(data));
    if (data.type === 'lookup') return json_(lookup_(data));
    if (KIOSK_TOKEN && String(data.token || '') !== KIOSK_TOKEN) {
      return json_({ ok: false, error: 'Bad token. KIOSK_TOKEN in config.js must match Code.gs.' });
    }
    if (data.type === 'checkout') return json_(checkout_(data));
    if (data.type === 'feedback') return json_(feedback_(data));
    if (data.type === 'incident') return json_(incident_(data));
    if (data.type && data.type !== 'checkin') return json_({ ok: false, error: 'Unknown request type: ' + data.type });
    const sheet = getSheet_();
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    const tz = Session.getScriptTimeZone();
    const dateOnly = new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd'));

    sheet.appendRow([
      ts,
      dateOnly,
      Utilities.formatDate(ts, tz, 'h:mm a'),
      String(data.name || '').trim(),
      data.referral   || '',
      data.reason     || '',
      data.energy     || '',
      data.moodGroup  || '',
      data.moodWord   || '',
      data.happened   || '',
      data.need       || '',
      data.basicNeeds || '',
      data.outcome    || '',
      data.kiosk      || '',
      data.stationSuggested || '',
      data.station    || '',
      '', '', '', '', '', '', '',
      cleanId_(data.studentId)
    ]);
    ensureHeader_(sheet, COL_STUDENT_ID, 'Student ID');
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * Check-out: find the student's most recent check-in today that has no check-out
 * yet and fill in the check-out columns on that same row. If none is found,
 * append a standalone row so nothing is lost.
 */
function checkout_(data, byStaff) {
  const sheet = getSheet_();
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  const nameKey = String(data.name || '').trim().toLowerCase();
  const outVals = [ts, '', data.energy || '', data.moodGroup || '', data.moodWord || '', data.helped || '', byStaff || 'Student'];
  const target = data.checkinTimestamp ? new Date(data.checkinTimestamp).getTime() : 0;
  const sid = cleanId_(data.studentId);

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const start = Math.max(2, lastRow - 500);
    const vals = sheet.getRange(start, 1, lastRow - start + 1, Math.min(COL_STUDENT_ID, sheet.getMaxColumns())).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      const r = vals[i];
      const rowId = cleanId_(r[COL_STUDENT_ID - 1]);
      if (sid && rowId) { if (rowId !== sid) continue; }        // badge / ID match wins
      else if (String(r[3]).trim().toLowerCase() !== nameKey) continue;
      if (!(r[0] instanceof Date)) continue;
      if (byStaff && target && Math.abs(r[0].getTime() - target) > 1000) continue; // staff pick an exact visit
      const diff = ts - r[0];
      if (diff < 0 || diff > 6 * 3600000) continue;      // same visit = within 6 hours
      if (r[COL_CHECKOUT_TIME - 1]) continue;             // already checked out
      outVals[1] = Math.round(diff / 60000);
      sheet.getRange(start + i, COL_CHECKOUT_TIME, 1, outVals.length).setValues([outVals]);
      return { ok: true, matched: true, minutes: outVals[1] };
    }
  }
  const dateOnly = new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd'));
  sheet.appendRow([
    ts, dateOnly, Utilities.formatDate(ts, tz, 'h:mm a'), String(data.name || '').trim(),
    '', '', '', '', '', '', '', '', 'Check Out (no check-in found)', data.kiosk || '', '', ''
  ].concat(outVals, [sid]));
  if (byStaff) throw new Error('That visit is already checked out, or could not be found.');
  return { ok: true, matched: false };
}

/** A staff member checks a student out from the dashboard, using their own read of the student. */
function staffCheckout_(data) {
  const email = verifyIdToken_(String(data.idToken || ''));
  const sheet = getSheet_();
  const head = sheet.getRange(1, COL_CHECKOUT_TIME + 6);
  if (!head.getValue()) head.setValue('Checked Out By').setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
  return checkout_(Object.assign({}, data, { timestamp: new Date().toISOString() }), 'Staff: ' + email);
}

// ---- Incident reports ---------------------------------------------------------

const INCIDENT_NAME = 'Incident Reports';
const INCIDENT_HEADERS = ['Timestamp', 'Date', 'Time', 'Name / ID', 'Grade', 'Safe now?', 'Urgent', 'What happened', 'Where', 'When (hour)',
  'Story', 'Who was involved', 'Witnesses', 'Wants to talk', 'Kiosk', 'Reviewed by', 'Notes', 'Student ID'];

function incidentSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(INCIDENT_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(INCIDENT_NAME);
    sheet.appendRow(INCIDENT_HEADERS);
    sheet.getRange(1, 1, 1, INCIDENT_HEADERS.length).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd h:mm am/pm');
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd');
    sheet.setColumnWidth(8, 240);
    sheet.setColumnWidth(11, 360);
    sheet.getRange('K:M').setWrap(true);
    // Urgent rows turn red.
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$G2="Yes"').setBackground('#f4cccc')
      .setRanges([sheet.getRange('A2:Q')]).build();
    sheet.setConditionalFormatRules([rule]);
  }
  return sheet;
}

function incident_(data) {
  const sheet = incidentSheet_();
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  sheet.appendRow([
    ts, new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd')), Utilities.formatDate(ts, tz, 'h:mm a'),
    String(data.name || '').trim(), data.grade || '', data.safe || '', data.urgent || '', data.types || '', data.place || '', data.period || '',
    data.story || '', data.who || '', data.witness || '', data.talk || '', data.kiosk || '', '', '', cleanId_(data.studentId)
  ]);
  ensureHeader_(sheet, 18, 'Student ID');
  return { ok: true };
}

/** Recent incident reports, newest first. */
function incidentRows_(days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INCIDENT_NAME);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({ timestamp: r[0].toISOString(), name: r[3], grade: r[4], safe: r[5], urgent: r[6], types: r[7], place: r[8], period: r[9],
      story: r[10], who: r[11], witness: r[12], talk: r[13], reviewed: r[15], notes: r[16], studentId: String(r[17] || '') });
  }
  return rows;
}

// ---- Trial feedback (feedback.html) -----------------------------------------

const FEEDBACK_NAME = 'Feedback';
const FEEDBACK_HEADERS = ['Timestamp', 'Date', 'Role', 'Tried', 'Rating', 'What worked', 'What to change', 'Anything else', 'Contact', 'Device', 'Came from', 'Kiosk'];

function feedback_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(FEEDBACK_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(FEEDBACK_NAME);
    sheet.appendRow(FEEDBACK_HEADERS);
    sheet.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd h:mm am/pm');
    sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd');
    [6, 7, 8].forEach(c => sheet.setColumnWidth(c, 320));
    sheet.getRange('F:H').setWrap(true);
  }
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  sheet.appendRow([
    ts, new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd')),
    data.role || '', data.tried || '', data.rating === '' ? '' : Number(data.rating) || '',
    data.worked || '', data.change || '', data.ideas || '', data.contact || '',
    data.device || '', data.version || '', data.kiosk || ''
  ]);
  return { ok: true };
}

/** Recent feedback entries, newest first. */
function feedbackRows_(days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEEDBACK_NAME);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({ timestamp: r[0].toISOString(), role: r[2], tried: r[3], rating: r[4], worked: r[5], change: r[6], ideas: r[7], contact: r[8], device: r[9] });
  }
  return rows;
}

// ---- Admin dashboard: Google sign-in verified on every request ---------------

/** staff.html POSTs { type: 'dashboard', idToken, days }. */
function dashboard_(data) {
  const email = verifyIdToken_(String(data.idToken || ''));
  const days = Math.min(Math.max(Number(data.days) || 14, 1), 365);
  return {
    ok: true,
    email: email,
    days: days,
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    checkins: checkinRows_(days),
    incidents: incidentRows_(days),
    feedback: feedbackRows_(days)
  };
}

/**
 * Marks an incident report reviewed: fills "Reviewed by" (email + date) and
 * "Notes" on the matching row. staff.html POSTs { type: 'review', idToken, timestamp, name, notes }.
 */
function review_(data) {
  const email = verifyIdToken_(String(data.idToken || ''));
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INCIDENT_NAME);
  if (!sheet) throw new Error('No incident reports yet.');
  const target = new Date(data.timestamp).getTime();
  const nameKey = String(data.name || '').trim().toLowerCase();
  const values = sheet.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    if (!(r[0] instanceof Date) || Math.abs(r[0].getTime() - target) > 1000) continue;
    if (String(r[3]).trim().toLowerCase() !== nameKey) continue;
    const stamp = email + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd h:mm a');
    sheet.getRange(i + 1, 16, 1, 2).setValues([[stamp, String(data.notes || '').slice(0, 1000)]]);
    return { ok: true };
  }
  throw new Error('Could not find that report in the Sheet.');
}

/**
 * Verifies a Google ID token from "Sign in with Google" and returns the email.
 * Throws with a message staff.html shows on the sign-in page.
 */
function verifyIdToken_(idToken, forKiosk) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Sign-in is not set up: GOOGLE_CLIENT_ID is empty in Code.gs.');
  if (!idToken) throw new Error('Please sign in.');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Your sign-in expired. Please sign in again.');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error('Sign-in token was issued for a different app.');
  if (info.iss !== 'https://accounts.google.com' && info.iss !== 'accounts.google.com') throw new Error('Sign-in token is not from Google.');
  if (Number(info.exp) * 1000 < Date.now()) throw new Error('Your sign-in expired. Please sign in again.');
  if (String(info.email_verified) !== 'true') throw new Error('This Google account is not verified.');
  const email = String(info.email || '').toLowerCase();
  if (forKiosk) {
    const inDomain = !ALLOWED_DOMAIN || String(info.hd || '').toLowerCase() === ALLOWED_DOMAIN || email.endsWith('@' + ALLOWED_DOMAIN);
    const listed = !KIOSK_ACCOUNTS.length || KIOSK_ACCOUNTS.map(x => String(x).toLowerCase()).indexOf(email) !== -1;
    if (!inDomain || !listed) throw new Error(email + ' is not allowed to sign in the kiosk iPad.');
    return email;
  }
  if (!isAdmin_(email, info.hd)) throw new Error(email + ' is not authorized. Use a ' + ALLOWED_DOMAIN + ' account, or ask to be added to ADMIN_EMAILS.');
  return email;
}

function isAdmin_(email, hd) {
  if (!email) return false;
  if (ADMIN_EMAILS.length) return ADMIN_EMAILS.map(x => String(x).toLowerCase()).indexOf(email) !== -1;
  if (!ALLOWED_DOMAIN) return true;
  return String(hd || '').toLowerCase() === ALLOWED_DOMAIN || email.endsWith('@' + ALLOWED_DOMAIN);
}

/** Recent check-ins, oldest first, with check-out columns. */
function checkinRows_(days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const values = getSheet_().getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({
      timestamp: r[0].toISOString(),
      name: r[3], referral: r[4], reason: r[5], energy: r[6], moodGroup: r[7], moodWord: r[8],
      happened: r[9], need: r[10], basicNeeds: r[11], outcome: r[12], kiosk: r[13],
      stationSuggested: r[14], station: r[15],
      checkoutTime: r[16] instanceof Date ? r[16].toISOString() : '',
      minutes: r[17] === '' ? '' : Number(r[17]),
      outEnergy: r[18], outMoodGroup: r[19], outMoodWord: r[20], helped: r[21], checkedOutBy: r[22] || '', studentId: String(r[23] || ''), confirmed: String(r[24] || '')
    });
  }
  return rows;
}

/** Opening the script URL in a browser: a plain page, no data. */
function doGet() {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;max-width:480px;margin:60px auto;padding:0 20px;color:#333">' +
    '<h2 style="color:#d61f26">Pride Center check-in endpoint</h2>' +
    '<p>This address only receives check-ins from the kiosk. The staff dashboard is the <b>staff.html</b> page on the app site.</p></div>'
  ).setTitle('Pride Center');
}

/**
 * Staff confirm that the student who checked in is who they said they were,
 * or flag "Not them". Writes "Confirmed · email · time" to the Staff Confirmed column.
 */
function confirmVisit_(data) {
  const email = verifyIdToken_(String(data.idToken || ''));
  const result = data.result === 'Not them' ? 'Not them' : 'Confirmed';
  const sheet = getSheet_();
  const target = new Date(data.timestamp).getTime();
  const nameKey = String(data.name || '').trim().toLowerCase();
  const lastRow = sheet.getLastRow();
  const start = Math.max(2, lastRow - 500);
  if (lastRow < 2) throw new Error('No check-ins yet.');
  const vals = sheet.getRange(start, 1, lastRow - start + 1, 4).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    const r = vals[i];
    if (!(r[0] instanceof Date) || Math.abs(r[0].getTime() - target) > 1000) continue;
    if (String(r[3]).trim().toLowerCase() !== nameKey) continue;
    ensureHeader_(sheet, COL_CONFIRMED, 'Staff Confirmed');
    const stamp = result + ' · ' + email + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'h:mm a');
    sheet.getRange(start + i, COL_CONFIRMED).setValue(stamp);
    return { ok: true, confirmed: stamp };
  }
  throw new Error('Could not find that check-in in the Sheet.');
}

// ---- Kiosk sign-in + roster lookup ------------------------------------------

/**
 * A staff member signs the iPad in with Google. We verify that sign-in once and
 * hand the iPad its own session pass (random, stored hashed in Script Properties),
 * so it stays signed in for KIOSK_SESSION_DAYS instead of Google's one hour.
 */
function kioskSignIn_(data) {
  const email = verifyIdToken_(String(data.idToken || ''), true);
  const session = Utilities.getUuid() + Utilities.getUuid();
  const exp = Date.now() + KIOSK_SESSION_DAYS * 86400000;
  PropertiesService.getScriptProperties().setProperty('kiosk_' + sha_(session),
    JSON.stringify({ email: email, exp: exp, kiosk: String(data.kiosk || '').slice(0, 80), at: Date.now() }));
  return { ok: true, session: session, email: email, expires: new Date(exp).toISOString() };
}

function kioskSession_(session) {
  if (!session) throw new Error('iPad not signed in.');
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('kiosk_' + sha_(String(session)));
  if (!raw) throw new Error('iPad not signed in.');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) { props.deleteProperty('kiosk_' + sha_(String(session))); throw new Error('iPad sign-in expired.'); }
  return s;
}

function kioskStatus_(data) {
  try { const s = kioskSession_(data.session); return { ok: true, signedIn: true, email: s.email, expires: new Date(s.exp).toISOString() }; }
  catch (err) { return { ok: true, signedIn: false }; }
}

/** Student ID -> first name (and last initial, grade). Needs a signed-in iPad. */
function lookup_(data) {
  kioskSession_(data.session);
  const id = cleanId_(data.id);
  if (!id) return { ok: true, found: false };
  const r = rosterMap_()[id];
  return r ? { ok: true, found: true, id: id, firstName: r.first, lastInitial: r.last, grade: r.grade } : { ok: true, found: false };
}

/** Reads the Roster tab. Header names are matched loosely, so most exports work as pasted. */
function rosterMap_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('roster_v1');
  if (hit) return JSON.parse(hit);
  const sheet = rosterSheet_();
  const values = sheet.getDataRange().getValues();
  const head = (values[0] || []).map(h => String(h).trim().toLowerCase());
  const find = re => head.findIndex(h => re.test(h));
  const cId = find(/(student\s*(id|number|#|no)|^id$|^number$|badge)/);
  const cFirst = find(/(first|preferred|nick)/);
  const cLast = find(/(last|surname|family)/);
  const cGrade = find(/grade/);
  const map = {};
  if (cId < 0 || cFirst < 0) return map;
  for (let i = 1; i < values.length; i++) {
    const id = cleanId_(values[i][cId]);
    if (!id) continue;
    map[id] = {
      first: String(values[i][cFirst] || '').trim(),
      last: cLast >= 0 ? String(values[i][cLast] || '').trim().charAt(0).toUpperCase() : '',
      grade: cGrade >= 0 ? String(values[i][cGrade] || '').trim() : ''
    };
  }
  try { cache.put('roster_v1', JSON.stringify(map), 600); } catch (err) {} // 10 minutes; skipped if too large
  return map;
}

function rosterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROSTER_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([['Student ID', 'First Name', 'Last Name', 'Grade']])
      .setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@'); // keep leading zeros
  }
  return sheet;
}

/** Run from the editor after pasting a new roster, so lookups see it right away. */
function refreshRoster() {
  CacheService.getScriptCache().remove('roster_v1');
  Logger.log(Object.keys(rosterMap_()).length + ' students in the roster.');
}

/** Run from the editor to sign every iPad out (for example, if one is lost). */
function signOutAllKiosks() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.indexOf('kiosk_') === 0);
  keys.forEach(k => props.deleteProperty(k));
  Logger.log('Signed out ' + keys.length + ' iPad session(s).');
}

function cleanId_(v) {
  // Badge scanners sometimes add spaces or a prefix/suffix; keep letters and digits only.
  return String(v == null ? '' : v).replace(/[^0-9A-Za-z]/g, '').replace(/^0+(?=\d)/, '').toUpperCase().slice(0, 32);
}

function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

function ensureHeader_(sheet, col, name) {
  const cell = sheet.getRange(1, col);
  if (!cell.getValue()) cell.setValue(name).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
}

// ---- One-time setup ---------------------------------------------------------

/** Run this once from the editor. Creates the Check-Ins and Summary tabs. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  rosterSheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd h:mm am/pm');
  sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd');
  sheet.getRange('Q:Q').setNumberFormat('h:mm am/pm');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(6, 200);
  sheet.setColumnWidth(10, 150);
  sheet.setColumnWidth(12, 220);

  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);

  buildSummary_(ss);
  ss.setActiveSheet(sheet);
}

/** Live summary tab. Every cell is a formula, so it updates as check-ins arrive. */
function buildSummary_(ss) {
  let s = ss.getSheetByName(SUMMARY_NAME);
  if (!s) s = ss.insertSheet(SUMMARY_NAME);
  s.clear();

  const C = "'" + SHEET_NAME + "'!";
  const rows = [];
  const push = (a, b, c) => rows.push([a, b === undefined ? '' : b, c === undefined ? '' : c]);

  push('Panther Pride Center – Summary');
  push('');
  push('Totals', 'Count');
  push('Today',      `=COUNTIF(${C}B:B, TODAY())`);
  push('This week',  `=COUNTIFS(${C}B:B, ">="&(TODAY()-WEEKDAY(TODAY(),2)+1), ${C}B:B, "<="&TODAY())`);
  push('This month', `=COUNTIFS(${C}B:B, ">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1), ${C}B:B, "<="&TODAY())`);
  push('All time',   `=COUNTA(${C}A:A)-1`);
  push('');

  const section = (title, col, items) => {
    push(title, 'Today', 'All time');
    items.forEach(v => {
      const r = rows.length + 1;
      push(v,
        `=COUNTIFS(${C}${col}:${col}, A${r}, ${C}B:B, TODAY())`,
        `=COUNTIF(${C}${col}:${col}, A${r})`);
    });
    push('');
  };

  section('By referral', 'E', ['Self Referred', 'Staff Referred']);
  section('By reason', 'F', ['Drop In: I need a reset', 'Scheduled Break', 'Drop In: I have a need']);
  section('By energy', 'G', ['Moving Fast', 'Moving Slow', 'Moving Ok']);
  section('By mood group', 'H', ['Red', 'Yellow', 'Blue', 'Green']);
  section('By what happened', 'J', ['At Home', 'With my Teacher', 'With a friend', 'Just with myself']);
  section('By outcome', 'M', ['Check In', 'Incident Report', 'Basic Need']);
  section('By station', 'P', ['Red', 'Yellow', 'Blue', 'Green', 'Staff first']);
  section('Mood at check-out', 'T', ['Red', 'Yellow', 'Blue', 'Green']);

  push('Check-outs', 'Today', 'All time');
  push('Checked out', `=COUNTIFS(${C}Q:Q, "<>", ${C}B:B, TODAY())`, `=COUNTA(${C}Q2:Q)`);
  push('Average minutes in room', `=IFERROR(ROUND(AVERAGEIFS(${C}R:R, ${C}B:B, TODAY()), 0), "")`, `=IFERROR(ROUND(AVERAGE(${C}R2:R), 0), "")`);
  push('');
  push('What helped (all time)', 'Count');
  push(`=IFERROR(QUERY(FLATTEN(ARRAYFORMULA(SPLIT(FILTER(${C}V2:V, ${C}V2:V<>""), ", ", FALSE))), "select Col1, count(Col1) where Col1 <> '' group by Col1 order by count(Col1) desc label count(Col1) ''"), "None yet")`);
  push(''); push(''); push(''); push(''); push(''); push(''); push(''); push(''); push(''); push(''); push('');

  push('Most common feelings (all time)', 'Count');
  const q = `QUERY(${C}I2:I, "select I, count(I) where I <> '' group by I label count(I) ''")`;
  for (let i = 1; i <= 5; i++) {
    push(`=IFERROR(INDEX(SORT(${q}, 2, FALSE), ${i}, 1), "")`,
         `=IFERROR(INDEX(SORT(${q}, 2, FALSE), ${i}, 2), "")`);
  }
  push('');
  push('Basic needs requested (all time)', 'Count');
  push(`=IFERROR(QUERY(FLATTEN(ARRAYFORMULA(SPLIT(FILTER(${C}L2:L, ${C}L2:L<>""), ", ", FALSE))), "select Col1, count(Col1) where Col1 <> '' group by Col1 order by count(Col1) desc label count(Col1) ''"), "None yet")`);

  s.getRange(1, 1, rows.length, 3).setValues(rows);
  s.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#d61f26');
  s.setColumnWidth(1, 260);
  s.setColumnWidth(2, 100);
  s.setColumnWidth(3, 100);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'Count' || rows[i][1] === 'Today') {
      s.getRange(i + 1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
    }
  }
  s.setFrozenRows(1);
}

// ---- Helpers ----------------------------------------------------------------

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SHEET_NAME); }
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run this to add a fake check-in and confirm the sheet works. */
function testInsert() {
  const fake = {
    postData: { contents: JSON.stringify({
      timestamp: new Date().toISOString(), name: 'Test Student', referral: 'Self Referred', reason: 'Drop In: I need a reset',
      energy: 'Moving Fast', moodGroup: 'Red', moodWord: 'Frustrated', happened: 'With a friend',
      need: '', basicNeeds: '', outcome: 'Check In', kiosk: 'Editor test', token: KIOSK_TOKEN
    }) }
  };
  Logger.log(doPost(fake).getContent());
}
