/**
 * Panther Pride Center – Check-In backend
 *
 * Lives inside the Google Sheet (Extensions → Apps Script). One file, one
 * deployment (Web app, Execute as: Me, Who has access: Anyone).
 *
 * - The kiosk POSTs check-ins, check-outs, incident reports, and feedback,
 *   each carrying the iPad's staff sign-in session (see kioskSignIn_).
 * - The admin dashboard (staff.html on GitHub Pages) POSTs a Google ID token
 *   from "Sign in with Google". It is verified here on every request, and only
 *   ALLOWED_DOMAIN Workspace accounts, plus anyone in ADMIN_EMAILS, get data back.
 */

// ---- Settings ---------------------------------------------------------------

// Google OAuth Client ID for "Sign in with Google" on staff.html. Must match
// GOOGLE_CLIENT_ID in config.js (README step 5).
const GOOGLE_CLIENT_ID = '680243392561-vod2q88igf1v8mr84uc7b4h075lv6g5p.apps.googleusercontent.com';

// Who may open the staff dashboard: any Google Workspace account on this domain...
const ALLOWED_DOMAIN = 'parchmentschools.org';
// ...plus these specific people from any domain.
const ADMIN_EMAILS = ['ben.tomlinson@kresa.org'];

// Who may sign in the kiosk iPad (turns on the roster name list students pick their name from).
// ONLY Google accounts on this domain are accepted. Checked on every lookup, not just at sign-in.
const KIOSK_DOMAIN = 'parchmentschools.org';
// Optional: narrow it further to specific people on that domain, e.g.
//   const KIOSK_ACCOUNTS = ['pridecenter@parchmentschools.org'];
const KIOSK_ACCOUNTS = [];

// How long an iPad stays signed in before a staff member must sign it in again.
const KIOSK_SESSION_DAYS = 30;

const ROSTER_NAME = 'Roster';
// The roster is a tab in this spreadsheet: the tab with this gid (from the URL, #gid=...).
// setup() renames it "Roster" and formats it. If that tab is missing, a "Roster" tab is used or created.
const ROSTER_SHEET_GID = 1679508098;
// Optional: keep the roster in a separate spreadsheet instead (so roster editors can't see
// check-in data). Put that spreadsheet's ID here; leave empty to use the tab above.
const ROSTER_SPREADSHEET_ID = '';

// Principal dashboard owners. They can always open both dashboards and manage the Access list.
const PRINCIPAL_EMAILS = ['jeremy.andrick@parchmentschools.org', 'ben.tomlinson@kresa.org'];
// Everyone else is on the Access tab, managed from principal.html ("People & access").
// Until the principal saves that list for the first time (the tab doesn't exist yet), the staff
// dashboard keeps the old rule: any ALLOWED_DOMAIN Workspace account. After that, only listed people.
const ACCESS_NAME = 'Access';
const ACCESS_HEADERS = ['Email', 'Staff dashboard', 'Principal dashboard', 'Updated by', 'Updated'];

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
    if (data.type === 'whoami') return json_(whoami_(data));
    if (data.type === 'dashboard') return json_(dashboard_(data));
    if (data.type === 'principalAuth') return json_({ ok: true, email: principal_(data), owner: isOwner_(principal_(data)) });
    if (data.type === 'accessList') return json_(accessList_(data));
    if (data.type === 'accessSave') return json_(accessSave_(data));
    if (data.type === 'principalData') return json_(principalData_(data));
    if (data.type === 'boardLoad') return json_(boardLoad_(data));
    if (data.type === 'boardSave') return json_(boardSave_(data));
    if (data.type === 'review') return json_(review_(data));
    if (data.type === 'staffCheckout') return json_(staffCheckout_(data));
    if (data.type === 'confirmVisit') return json_(confirmVisit_(data));
    if (data.type === 'kioskSignIn') return json_(kioskSignIn_(data));
    if (data.type === 'kioskStatus') return json_(kioskStatus_(data));
    if (data.type === 'lookup') return json_(lookup_(data));
    if (data.type === 'roster') return json_(roster_(data));
    // A signed-in staff request the script doesn't know means Code.gs is out of date, not a kiosk token problem.
    if (data.idToken && data.type && WRITE_TYPES_.indexOf(data.type) === -1) return json_({ ok: false, error: 'Unknown request type: ' + data.type });
    // Writing to the Sheet needs a signed-in staff member: a kiosk iPad signed in with a
    // @parchmentschools.org account (its session pass), or a staff Google sign-in. Nothing public.
    staffWriter_(data);
    if (data.type === 'checkout') return json_(checkout_(data));
    if (data.type === 'feedback') return json_(feedback_(data));
    if (data.type === 'incident') return json_(incident_(data));
    if (data.type && data.type !== 'checkin') return json_({ ok: false, error: 'Unknown request type: ' + data.type });
    const sheet = getSheet_();
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    const tz = Session.getScriptTimeZone();
    const dateOnly = new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd'));
    const who = resolveStudent_(data);

    sheet.appendRow([
      ts,
      dateOnly,
      Utilities.formatDate(ts, tz, 'h:mm a'),
      safe_(who.name),
      data.referral   || '',
      data.reason     || '',
      data.energy     || '',
      data.moodGroup  || '',
      safe_(String(data.moodWord || '').slice(0, 40)),
      data.happened   || '',
      data.need       || '',
      data.basicNeeds || '',
      data.outcome    || '',
      data.kiosk      || '',
      data.stationSuggested || '',
      data.station    || '',
      '', '', '', '', '', '', '',
      who.id
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
  const outVals = [ts, '', data.energy || '', data.moodGroup || '', safe_(String(data.moodWord || '').slice(0, 40)), data.helped || '', byStaff || 'Student'];
  const target = data.checkinTimestamp ? new Date(data.checkinTimestamp).getTime() : 0;
  const who = resolveStudent_(data);
  const sid = who.id;
  const fullKey = who.name.trim().toLowerCase();

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const start = Math.max(2, lastRow - 500);
    const vals = sheet.getRange(start, 1, lastRow - start + 1, Math.min(COL_STUDENT_ID, sheet.getMaxColumns())).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      const r = vals[i];
      const rowId = cleanId_(r[COL_STUDENT_ID - 1]);
      if (sid && rowId) { if (rowId !== sid) continue; }        // badge / ID match wins
      else { const rowName = String(r[3]).trim().toLowerCase(); if (rowName !== nameKey && rowName !== fullKey) continue; }
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
    ts, dateOnly, Utilities.formatDate(ts, tz, 'h:mm a'), safe_(who.name),
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
  'Story', 'Who was involved', 'Witnesses', 'Wants to talk', 'Kiosk', 'Reviewed by', 'Notes', 'Student ID',
  'Follow-up action', 'Follow-up status'];
// Choices on the staff page's incident follow-up form. Anything else is saved blank.
const FOLLOWUP_ACTIONS = ['Talked it through', 'Contacted family', 'Sent to office', 'Referred to counselor', 'Other'];
const FOLLOWUP_STATUSES = ['Resolved', 'Needs more follow-up'];

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
  }
  return sheet;
}

function incident_(data) {
  const sheet = incidentSheet_();
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  const who = resolveStudent_(data);
  sheet.appendRow([
    ts, new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd')), Utilities.formatDate(ts, tz, 'h:mm a'),
    safe_(who.name), who.grade || data.grade || '', data.safe || '', data.urgent || '', data.types || '', data.place || '', data.period || '',
    safe_(data.story), safe_(data.who), safe_(data.witness), data.talk || '', data.kiosk || '', '', '', who.id
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
      story: r[10], who: r[11], witness: r[12], talk: r[13], reviewed: r[15], notes: r[16], studentId: String(r[17] || ''),
      action: String(r[18] || ''), status: String(r[19] || '') });
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
    safe_(data.worked), safe_(data.change), safe_(data.ideas), safe_(data.contact),
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
 * Incident follow-up from the staff page. Fills "Reviewed by" (email + time), adds the note to
 * "Notes", and saves "Follow-up action" and "Follow-up status" on the matching row.
 * staff.html POSTs { type: 'review', idToken, timestamp, name, action, status, notes }.
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
    const note = String(data.notes || '').trim().slice(0, 1000);
    const before = String(r[16] || '').trim();
    const notes = note ? (before ? before + '\n' + note : note) : before;
    sheet.getRange(i + 1, 16, 1, 2).setValues([[stamp, safe_(notes)]]);
    const action = FOLLOWUP_ACTIONS.indexOf(data.action) !== -1 ? data.action : '';
    const status = FOLLOWUP_STATUSES.indexOf(data.status) !== -1 ? data.status : '';
    if (action || status) {
      ensureHeader_(sheet, 19, 'Follow-up action');
      ensureHeader_(sheet, 20, 'Follow-up status');
      sheet.getRange(i + 1, 19, 1, 2).setValues([[action, status]]);
    }
    return { ok: true, followUp: true };
  }
  throw new Error('Could not find that report in the Sheet.');
}

/**
 * Verifies a Google ID token from "Sign in with Google" and returns the email.
 * Throws with a message staff.html shows on the sign-in page.
 */
/** Checks a Google ID token is genuine, for this app, current, and verified. Returns { email, hd }. No role check. */
function tokenInfo_(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Sign-in is not set up: GOOGLE_CLIENT_ID is empty in Code.gs.');
  if (!idToken) throw new Error('Please sign in.');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Your sign-in expired. Please sign in again.');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== GOOGLE_CLIENT_ID) throw new Error('Sign-in token was issued for a different app.');
  if (info.iss !== 'https://accounts.google.com' && info.iss !== 'accounts.google.com') throw new Error('Sign-in token is not from Google.');
  if (Number(info.exp) * 1000 < Date.now()) throw new Error('Your sign-in expired. Please sign in again.');
  if (String(info.email_verified) !== 'true') throw new Error('This Google account is not verified.');
  return { email: String(info.email || '').toLowerCase(), hd: info.hd };
}

/** login.html POSTs { type: 'whoami', idToken }: which pages this person may open. Never throws for a valid sign-in. */
function whoami_(data) {
  const t = tokenInfo_(String(data.idToken || ''));
  const staff = isAdmin_(t.email, t.hd);
  const access = accessMap_() || {};
  const principal = staff && (isOwner_(t.email) || !!(access[t.email] && access[t.email].principal));
  const kiosk = !!t.hd && kioskAllowed_(t.email, t.hd);
  return { ok: true, email: t.email, staff, principal, kiosk, listStarted: !!accessMap_() };
}

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
    // Must be a real Workspace account on KIOSK_DOMAIN: Google sets hd only for those. A personal
    // Google account that merely uses an @parchmentschools.org address has no hd and is refused.
    if (!info.hd || !kioskAllowed_(email, info.hd)) throw new Error(email + ' can\'t sign in this iPad. Use a @' + KIOSK_DOMAIN + ' staff account.');
    return email;
  }
  if (!isAdmin_(email, info.hd)) throw new Error(email + (accessMap_() ? ' can\'t open the dashboard. Ask the principal to add you under People & access.' : ' can\'t open the dashboard. Use a @' + ALLOWED_DOMAIN + ' staff account.'));
  return email;
}

function isAdmin_(email, hd) {
  email = String(email || '').toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS.map(x => String(x).toLowerCase()).indexOf(email) !== -1) return true;
  if (isOwner_(email)) return true;
  const access = accessMap_();
  if (access) {
    // The principal's list decides. Listed people must sign in with a Workspace account on their own
    // email's domain (Google sets hd), so a personal Google account using that address is refused.
    const workspace = !!hd && email.endsWith('@' + String(hd).toLowerCase());
    return workspace && !!(access[email] && (access[email].staff || access[email].principal));
  }
  const domain = String(ALLOWED_DOMAIN || '').toLowerCase();
  // Domain accounts must be real Workspace accounts on that domain (hd claim), not just a matching address.
  return !!domain && email.endsWith('@' + domain) && String(hd || '').toLowerCase() === domain;
}

/** Recent check-ins, oldest first, with check-out columns. */
function checkinRows_(days) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const values = getSheet_().getDataRange().getValues();
  let roster = {}; try { roster = rosterMap_(); } catch (err) {} // grade per student, for the principal dashboard
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
      outEnergy: r[18], outMoodGroup: r[19], outMoodWord: r[20], helped: r[21], checkedOutBy: r[22] || '', studentId: String(r[23] || ''), confirmed: String(r[24] || ''),
      grade: roster[String(r[23] || '')] ? gradeLabel_(roster[String(r[23] || '')].grade) : ''
    });
  }
  return rows;
}

// ---- Principal dashboard: allowlist, data, saved boards -----------------------

function isOwner_(email) { return PRINCIPAL_EMAILS.map(x => String(x).toLowerCase()).indexOf(String(email || '').toLowerCase()) !== -1; }

/** Verifies the sign-in and checks principal access (owners, or Principal dashboard on the Access tab). Returns the email. */
function principal_(data) {
  const email = verifyIdToken_(String(data.idToken || ''));
  const access = accessMap_() || {};
  if (!isOwner_(email) && !(access[email] && access[email].principal)) throw new Error(email + " can't open the principal dashboard. Ask the principal to add you under People & access.");
  return email;
}

/** The Access tab as { email: { staff, principal } }, or null if the principal hasn't saved a list yet. */
function accessMap_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACCESS_NAME);
  if (!sheet) return null;
  const map = {};
  const yes = v => v === true || /^(yes|y|true|1|x|✓|ok)$/i.test(String(v).trim());
  sheet.getDataRange().getValues().slice(1).forEach(r => {
    const e = String(r[0] || '').trim().toLowerCase();
    if (e) map[e] = { staff: yes(r[1]), principal: yes(r[2]), by: String(r[3] || ''), at: r[4] instanceof Date ? r[4].toISOString() : String(r[4] || '') };
  });
  return map;
}
/** principal.html POSTs { type: 'accessList', idToken }. */
function accessList_(data) {
  principal_(data);
  const map = accessMap_();
  return { ok: true, started: !!map, owners: PRINCIPAL_EMAILS, admins: ADMIN_EMAILS, domain: ALLOWED_DOMAIN,
    people: Object.keys(map || {}).sort().map(e => Object.assign({ email: e }, map[e])) };
}
/** principal.html POSTs { type: 'accessSave', idToken, people: [{ email, staff, principal }] }. Replaces the list. */
function accessSave_(data) {
  const who = principal_(data);
  const before = accessMap_() || {};
  const seen = {}, rows = [];
  (Array.isArray(data.people) ? data.people : []).forEach(p => {
    if (!p || (!p.staff && !p.principal)) return; // no access at all = not on the list (and a stray junk row can't block the save)
    const e = String(p.email || '').trim().toLowerCase().replace(/\.+$/, '');
    if (!e || seen[e]) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('"' + e + '" is not an email address.');
    seen[e] = true;
    // Someone whose access didn't change keeps their original "Updated by" and date, so the list still says who added whom.
    const old = before[e], same = old && !!old.staff === !!p.staff && !!old.principal === !!p.principal;
    rows.push([e, p.staff ? 'Yes' : '', p.principal ? 'Yes' : '', same ? old.by : who, same && old.at ? new Date(old.at) : new Date()]);
  });
  if (rows.length > 500) throw new Error('The list is limited to 500 people.');
  return withLock_(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ACCESS_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(ACCESS_NAME);
      sheet.getRange(1, 1, 1, ACCESS_HEADERS.length).setValues([ACCESS_HEADERS]).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
      sheet.setFrozenRows(1); sheet.setColumnWidth(1, 280);
    }
    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, ACCESS_HEADERS.length).clearContent();
    if (rows.length) sheet.getRange(2, 1, rows.length, ACCESS_HEADERS.length).setValues(rows);
    return { ok: true, saved: rows.length };
  });
}
/** principal.html POSTs { type: 'principalData', idToken, days }: the same data as the staff dashboard, for allowed accounts only. */
function principalData_(data) {
  principal_(data);
  const d = dashboard_(data);
  // Only the columns the principal page shows. The free-text story, who was involved, witnesses and notes stay in the Sheet.
  d.incidents = d.incidents.map(r => {
    const m = String(r.reviewed || '').match(/\d{4}-\d{2}-\d{2}/);
    return { timestamp: r.timestamp, name: r.name, grade: r.grade, types: r.types, place: r.place, period: r.period, talk: r.talk,
      reviewed: m ? m[0] : (r.reviewed ? 'Reviewed' : ''), studentId: r.studentId, action: r.action, status: r.status };
  });
  d.feedback = [];
  return d;
}

/** Runs fn while holding the script lock, so two saves at the same moment can't interleave their writes. */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}
/** Splits text into pieces of at most n characters without cutting an emoji (a surrogate pair) in half. */
function chunk_(s, n) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    let j = Math.min(i + n, s.length);
    if (j < s.length) { const c = s.charCodeAt(j - 1); if (c >= 0xD800 && c <= 0xDBFF) j--; }
    out.push(s.slice(i, j));
    i = j;
  }
  return out.length ? out : [''];
}

const BOARDS_NAME = 'Dashboards';
function boardsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BOARDS_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BOARDS_NAME);
    sheet.appendRow(['Email', 'Updated', 'Boards (JSON, do not edit)']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(3, 500);
  }
  return sheet;
}
function boardRow_(sheet, email) {
  const vals = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 1).getValues();
  for (let i = 1; i < vals.length; i++) if (String(vals[i][0]).toLowerCase() === email) return i + 1;
  return 0;
}
/** principal.html POSTs { type: 'boardLoad', idToken } and gets back that person's boards. */
function boardLoad_(data) {
  const email = principal_(data);
  const sheet = boardsSheet_();
  const row = boardRow_(sheet, email);
  if (!row) return { ok: true, boards: [] };
  // Long layouts are split across cells C, D, E… (a cell holds 50,000 characters).
  const cells = sheet.getRange(row, 3, 1, Math.max(1, sheet.getLastColumn() - 2)).getValues()[0];
  try { return { ok: true, boards: JSON.parse(cells.join('')) || [] }; } catch (err) { return { ok: true, boards: [] }; }
}
/** principal.html POSTs { type: 'boardSave', idToken, boards }. */
function boardSave_(data) {
  const email = principal_(data);
  // A missing or empty list is a mistake, not a request to erase someone's boards.
  if (!Array.isArray(data.boards) || !data.boards.length) throw new Error('Nothing was saved: the boards were missing or empty.');
  const json = JSON.stringify(data.boards);
  if (json.length > 400000) throw new Error('These boards are too large to save. Delete some tiles or boards.');
  return withLock_(() => {
    const sheet = boardsSheet_();
    let row = boardRow_(sheet, email);
    if (!row) { sheet.appendRow([email, new Date(), '']); row = sheet.getLastRow(); }
    const parts = chunk_(json, 45000);
    const width = Math.max(parts.length, sheet.getLastColumn() - 2, 1);
    const vals = parts.concat(new Array(width - parts.length).fill(''));
    sheet.getRange(row, 2).setValue(new Date());
    const cells = sheet.getRange(row, 3, 1, width);
    cells.setNumberFormat('@'); // plain text, so a piece that starts with = or is all digits isn't turned into a formula or a number
    cells.setValues([vals]);
    return { ok: true, saved: new Date().toISOString() };
  });
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

/** Only KIOSK_DOMAIN Workspace accounts (and KIOSK_ACCOUNTS, if listed) may run the kiosk. */
function kioskAllowed_(email, hd) {
  email = String(email || '').toLowerCase();
  const domain = String(KIOSK_DOMAIN || '').toLowerCase();
  if (!domain || !email.endsWith('@' + domain)) return false;
  if (hd !== undefined && String(hd || '').toLowerCase() !== domain) return false; // must be a Workspace account on that domain
  return !KIOSK_ACCOUNTS.length || KIOSK_ACCOUNTS.map(x => String(x).toLowerCase()).indexOf(email) !== -1;
}

function kioskSession_(session) {
  if (!session) throw new Error('iPad not signed in.');
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('kiosk_' + sha_(String(session)));
  if (!raw) throw new Error('iPad not signed in.');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) { props.deleteProperty('kiosk_' + sha_(String(session))); throw new Error('iPad sign-in expired.'); }
  if (!kioskAllowed_(s.email)) { props.deleteProperty('kiosk_' + sha_(String(session))); throw new Error('iPad not signed in.'); }
  return s;
}

const WRITE_TYPES_ = ['checkin', 'checkout', 'incident', 'feedback'];

/** Who may add check-ins, check-outs, incident reports, and feedback. Throws if nobody signed in. */
function staffWriter_(data) {
  let why = 'Not signed in. Sign this iPad in with a @' + KIOSK_DOMAIN + ' staff account.';
  if (data.session) { try { return kioskSession_(data.session).email; } catch (err) { why = String(err.message || err); } }
  if (data.idToken) return verifyIdToken_(String(data.idToken), true); // KIOSK_DOMAIN Workspace staff only
  throw new Error(why);
}

function kioskStatus_(data) {
  try { const s = kioskSession_(data.session); return { ok: true, signedIn: true, email: s.email, expires: new Date(s.exp).toISOString() }; }
  catch (err) { return { ok: true, signedIn: false }; }
}

/** Older kiosks only: student ID -> first name (and last initial, grade). Needs a signed-in iPad. */
function lookup_(data) {
  kioskSession_(data.session);
  const id = cleanId_(data.id);
  if (!id) return { ok: true, found: false };
  const r = rosterMap_()[id];
  return r ? { ok: true, found: true, id: id, firstName: r.first, lastInitial: r.last.charAt(0).toUpperCase(), grade: r.grade } : { ok: true, found: false };
}

/**
 * The kiosk's name list. Needs a signed-in iPad. Each student gets an opaque key (a salted
 * hash, so raw student IDs never reach the iPad) and a unique label such as "Jordan S. · 7th".
 * Same first name, initial, and grade? The label adds letters of the last name until it differs.
 */
function roster_(data) {
  kioskSession_(data.session);
  const map = rosterMap_();
  const list = Object.keys(map).map(id => {
    const r = map[id];
    return { id: id, first: r.first, last: r.last, grade: gradeShort_(r.grade) };
  }).filter(r => r.first);
  const labelFor = (r, n) => r.first + (r.last ? ' ' + r.last.slice(0, n) + (n < r.last.length ? '.' : '') : '') + (r.grade ? ' · ' + r.grade : '');
  const groups = {};
  list.forEach(r => { r.n = 1; r.label = labelFor(r, 1); (groups[r.label] = groups[r.label] || []).push(r); });
  Object.keys(groups).forEach(k => {
    let g = groups[k];
    for (let n = 2; g.length > 1 && n <= 20; n++) {
      g.forEach(r => { r.n = n; r.label = labelFor(r, n); });
      const seen = {}; g.forEach(r => { seen[r.label] = (seen[r.label] || 0) + 1; });
      g = g.filter(r => seen[r.label] > 1);
    }
    if (g.length > 1) g.forEach(r => { r.label += ' · …' + r.id.slice(-3); }); // still identical: add the last 3 ID digits
  });
  const salt = rosterSalt_();
  list.sort((a, b) => a.label.localeCompare(b.label));
  return { ok: true, students: list.map(r => ({ key: rosterKey_(r.id, salt), label: r.label, first: r.first, last: r.last.slice(0, r.n) })) };
}

function rosterSalt_() {
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty('roster_salt');
  if (!salt) { salt = Utilities.getUuid(); props.setProperty('roster_salt', salt); }
  return salt;
}

function rosterKey_(id, salt) { return sha_(salt + '|' + id).slice(0, 24); }

/**
 * Who a kiosk record is about, worked out at save time from the roster key (or an older
 * kiosk's student ID). Returns the roster's full name and grade. Never blocks a save:
 * on any roster problem it falls back to what the kiosk sent.
 */
function resolveStudent_(data) {
  const sent = String(data.name || '').trim();
  const fallback = { id: cleanId_(data.studentId), name: sent, grade: '' };
  try {
    const map = rosterMap_();
    let id = '';
    if (data.rosterKey) {
      const salt = rosterSalt_();
      id = Object.keys(map).find(x => rosterKey_(x, salt) === String(data.rosterKey)) || '';
    } else if (fallback.id && map[fallback.id]) id = fallback.id;
    if (!id) return fallback;
    const r = map[id];
    return { id: id, name: (r.first + ' ' + r.last).trim() || sent, grade: gradeLabel_(r.grade) };
  } catch (err) { return fallback; }
}

/** "7" -> "7th"; anything else as typed. */
function gradeShort_(g) {
  g = String(g || '').trim();
  const m = g.match(/^(\d{1,2})(st|nd|rd|th)?(\s*grade)?$/i);
  if (!m) return g;
  const n = Number(m[1]);
  const suf = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return n + suf;
}

/** "7" -> "7th Grade", matching the incident report's old grade answers. */
function gradeLabel_(g) { const s = gradeShort_(g); return /^\d+(st|nd|rd|th)$/.test(s) ? s + ' Grade' : s; }

/** Text a person typed: never let the Sheet treat it as a formula. */
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Reads the Roster tab. Header names are matched loosely, so most exports work as pasted. */
function rosterMap_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(ROSTER_CACHE);
  if (hit) { const map = {}; JSON.parse(hit).forEach(a => { map[a[0]] = { first: a[1], last: a[2], grade: a[3] }; }); return map; }
  const sheet = rosterSheet_();
  const values = sheet.getDataRange().getValues();
  const head = (values[0] || []).map(h => String(h).trim().toLowerCase());
  const find = re => head.findIndex(h => re.test(h));
  const cId = find(/(student\s*(id|number|#|no)|^id$|^number$|badge)/);
  // A filled-in Preferred / Nickname cell wins over the legal First Name on that row.
  const cPref = find(/(preferred|nick)/);
  const cLegal = find(/first/);
  const cFirst = cLegal >= 0 ? cLegal : cPref;
  const cLast = find(/(last|surname|family)/);
  const cGrade = find(/grade/);
  const map = {};
  if (cId < 0 || cFirst < 0) return map;
  for (let i = 1; i < values.length; i++) {
    const id = cleanId_(values[i][cId]);
    if (!id) continue;
    map[id] = {
      first: String((cPref >= 0 && values[i][cPref]) || values[i][cFirst] || '').trim(),
      last: cLast >= 0 ? String(values[i][cLast] || '').trim() : '',
      grade: cGrade >= 0 ? String(values[i][cGrade] || '').trim() : ''
    };
  }
  try { // compact arrays keep a school-size roster well under the 100 KB cache limit
    cache.put(ROSTER_CACHE, JSON.stringify(Object.keys(map).map(id => [id, map[id].first, map[id].last, map[id].grade])), 600);
  } catch (err) {} // skipped if too large; the Sheet is then read on each request
  return map;
}
const ROSTER_CACHE = 'roster_v2';

function rosterSheet_() {
  if (ROSTER_SPREADSHEET_ID) {
    const book = SpreadsheetApp.openById(ROSTER_SPREADSHEET_ID);
    return book.getSheetByName(ROSTER_NAME) || book.getSheets()[0];
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ROSTER_SHEET_GID ? ss.getSheets().find(sh => sh.getSheetId() === ROSTER_SHEET_GID) : null;
  if (!sheet) sheet = ss.getSheetByName(ROSTER_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([['Student ID', 'First Name', 'Last Name', 'Grade']]);
  }
  return sheet;
}

/** Formats the roster for staff: header, frozen row, text IDs, grade dropdown, instructions. Safe to re-run. */
function formatRoster_() {
  const sheet = rosterSheet_();
  // Rename to "Roster" unless another tab already has that name (Sheets requires unique names).
  if (sheet.getName() !== ROSTER_NAME && !sheet.getParent().getSheetByName(ROSTER_NAME)) sheet.setName(ROSTER_NAME);
  if (!sheet.getRange('A1').getValue()) sheet.getRange(1, 1, 1, 4).setValues([['Student ID', 'First Name', 'Last Name', 'Grade']]);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.getRange('A2:A').setNumberFormat('@'); // keep leading zeros exactly as on the badge
  sheet.setColumnWidth(1, 140); sheet.setColumnWidth(2, 160); sheet.setColumnWidth(3, 160); sheet.setColumnWidth(4, 90);
  sheet.getRange('D2:D').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['6', '7', '8'], true).setAllowInvalid(true).build());
  sheet.getRange('A1').setNote('One student per row. Student ID = the school student ID (never shown on the iPad). ' +
    'First Name = what the student goes by; the kiosk name list shows it with the last initial and grade, ' +
    'and says "Hi, <First Name>!". To keep legal names off the iPad, add a "Preferred Name" column: it is used instead of First Name. ' +
    'Grade is optional (6, 7, 8). Changes are picked up within 10 minutes, or right away after running refreshRoster.');
}

/** Run from the editor after pasting a new roster, so lookups see it right away. */
function refreshRoster() {
  const cache = CacheService.getScriptCache();
  cache.remove('roster_v1'); cache.remove(ROSTER_CACHE);
  const n = Object.keys(rosterMap_()).length;
  const cached = cache.get(ROSTER_CACHE);
  Logger.log(n + ' students in the roster. Cache: ' + (cached ? Math.round(cached.length / 1024) + ' KB' : 'too large, reading the Sheet each time'));
}

/** Run from the editor to sign every iPad out (for example, if one is lost). */
function signOutAllKiosks() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys().filter(k => k.indexOf('kiosk_') === 0);
  keys.forEach(k => props.deleteProperty(k));
  Logger.log('Signed out ' + keys.length + ' iPad session(s).');
}

function cleanId_(v) {
  // Keep letters and digits only, so IDs match however they were pasted or typed.
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

  formatRoster_();
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

  // Incident reports no longer ask "Are you safe?": remove the old red-row rule, keep any other rules.
  const inc = ss.getSheetByName(INCIDENT_NAME);
  if (inc) {
    const keep = inc.getConditionalFormatRules().filter(rule => {
      const c = rule.getBooleanCondition();
      return !(c && c.getCriteriaType() === SpreadsheetApp.BooleanCriteria.CUSTOM_FORMULA &&
        String(c.getCriteriaValues()[0]).replace(/\s/g, '') === '=$G2="Yes"');
    });
    inc.setConditionalFormatRules(keep);
    ensureHeader_(inc, 19, 'Follow-up action');
    ensureHeader_(inc, 20, 'Follow-up status');
  }

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
  section('By reason', 'F', ['Drop In: I need a reset', 'Scheduled Break', 'Drop In: I have a need', 'Break', 'Defiance', 'Sickness']);
  section('By energy', 'G', ['Moving Fast', 'Moving Slow', 'Moving Ok']);
  section('By mood group', 'H', ['Red', 'Yellow', 'Blue', 'Green']);
  section('By what happened', 'J', ['At Home', 'With my Teacher', 'With a friend', 'Just with myself', 'Not sure', 'Not sure right now', 'Nothing happened']);
  section('By outcome', 'M', ['Check In', 'Incident Report', 'Basic Need']);
  section('By station', 'P', ['Red', 'Yellow', 'Blue', 'Green', 'Staff first']);
  section('Alert word picked (Station Suggested)', 'O', ['Staff first']);
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

/**
 * Removes every sample row (Kiosk = "SAMPLE DATA") from Check-Ins and Incident Reports.
 * Run from the editor when the sample data is no longer needed. Real rows are untouched.
 */
function deleteSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targets = [[SHEET_NAME, 14], [INCIDENT_NAME, 15]]; // tab, Kiosk column (1-based)
  let removed = 0;
  targets.forEach(([name, col]) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return;
    const vals = sheet.getRange(2, col, sheet.getLastRow() - 1, 1).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]).trim() === 'SAMPLE DATA') { sheet.deleteRow(i + 2); removed++; }
    }
  });
  Logger.log('Removed ' + removed + ' sample row(s).');
}

/** Optional: run this to add a fake check-in and confirm the sheet works. */
function testInsert() {
  const fake = {
    postData: { contents: JSON.stringify({
      timestamp: new Date().toISOString(), name: 'Test Student', referral: 'Self Referred', reason: 'Drop In: I need a reset',
      energy: 'Moving Fast', moodGroup: 'Red', moodWord: 'Frustrated', happened: 'With a friend',
      need: '', basicNeeds: '', outcome: 'Check In', kiosk: 'Editor test'
    }) }
  };
  Logger.log(doPost(fake).getContent()); // expect "Not signed in": check-ins need a signed-in staff member now
}
