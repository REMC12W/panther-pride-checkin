/**
 * Panther Pride Center – Check-In backend + admin dashboard
 *
 * Lives inside the Google Sheet (Extensions → Apps Script). Two files:
 *   Code.gs        this file
 *   Dashboard.html the admin dashboard page
 *
 * Deployed twice from the same project (see README):
 *   1. Kiosk endpoint   Execute as: Me   Who has access: Anyone
 *      → the iPad POSTs check-ins here. Nobody can read data through it.
 *   2. Admin dashboard  Execute as: Me   Who has access: Anyone within kresa.org
 *      → Google makes staff sign in with a district account first.
 */

// ---- Settings ---------------------------------------------------------------

// Who may open the admin dashboard. Leave the list empty to allow anyone who can
// sign in under the dashboard deployment's "Who has access" setting (the district).
// Add emails to restrict it to specific people:
//   const ADMIN_EMAILS = ['ben.tomlinson@kresa.org', 'someone@kresa.org'];
const ADMIN_EMAILS = [];

// Must match KIOSK_TOKEN in the app's config.js. Check-ins without it are rejected.
// Leave empty to accept any POST (not recommended once the app is live).
const KIOSK_TOKEN = '7b4a5c379eb19ea01f851fea';

const SHEET_NAME   = 'Check-Ins';
const SUMMARY_NAME = 'Summary';

const HEADERS = [
  'Timestamp', 'Date', 'Time', 'Name / ID', 'Referral', 'Reason', 'Energy',
  'Mood Group', 'Mood Word', 'What Happened', 'Need', 'Basic Needs', 'Outcome', 'Kiosk',
  'Station Suggested', 'Station',
  'Checkout Time', 'Minutes in Room', 'Checkout Energy', 'Checkout Mood Group', 'Checkout Mood Word', 'What Helped'
];
// Column numbers (1-based) used by the check-out matcher.
const COL_CHECKOUT_TIME = 17;

// ---- Kiosk: one check-in per POST -------------------------------------------

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (KIOSK_TOKEN && String(data.token || '') !== KIOSK_TOKEN) {
      return json_({ ok: false, error: 'Bad token. KIOSK_TOKEN in config.js must match Code.gs.' });
    }
    if (data.type === 'checkout') return json_(checkout_(data));
    if (data.type === 'feedback') return json_(feedback_(data));
    if (data.type === 'incident') return json_(incident_(data));
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
      '', '', '', '', '', ''
    ]);
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
function checkout_(data) {
  const sheet = getSheet_();
  const ts = data.timestamp ? new Date(data.timestamp) : new Date();
  const tz = Session.getScriptTimeZone();
  const nameKey = String(data.name || '').trim().toLowerCase();
  const outVals = [ts, '', data.energy || '', data.moodGroup || '', data.moodWord || '', data.helped || ''];

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const start = Math.max(2, lastRow - 500);
    const vals = sheet.getRange(start, 1, lastRow - start + 1, COL_CHECKOUT_TIME).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      const r = vals[i];
      if (String(r[3]).trim().toLowerCase() !== nameKey) continue;
      if (!(r[0] instanceof Date)) continue;
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
  ].concat(outVals));
  return { ok: true, matched: false };
}

// ---- Incident reports ---------------------------------------------------------

const INCIDENT_NAME = 'Incident Reports';
const INCIDENT_HEADERS = ['Timestamp', 'Date', 'Time', 'Name / ID', 'Grade', 'Safe now?', 'Urgent', 'What happened', 'Where', 'When (hour)',
  'Story', 'Who was involved', 'Witnesses', 'Wants to talk', 'Kiosk', 'Reviewed by', 'Notes'];

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
    data.story || '', data.who || '', data.witness || '', data.talk || '', data.kiosk || '', '', ''
  ]);
  return { ok: true };
}

/** Called from Dashboard.html. Recent incident reports, newest first. */
function getIncidents(days) {
  if (!isAdmin_(currentEmail_())) throw new Error('Not authorized');
  days = Math.min(Math.max(Number(days) || 30, 1), 365);
  const cutoff = new Date(Date.now() - days * 86400000);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INCIDENT_NAME);
  if (!sheet) return { rows: [] };
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({ timestamp: r[0].toISOString(), name: r[3], grade: r[4], safe: r[5], urgent: r[6], types: r[7], place: r[8], period: r[9],
      story: r[10], who: r[11], witness: r[12], talk: r[13], reviewed: r[15], notes: r[16] });
  }
  return { rows: rows };
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

/** Called from Dashboard.html. Recent feedback entries, newest first. */
function getFeedback(days) {
  if (!isAdmin_(currentEmail_())) throw new Error('Not authorized');
  days = Math.min(Math.max(Number(days) || 30, 1), 365);
  const cutoff = new Date(Date.now() - days * 86400000);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEEDBACK_NAME);
  if (!sheet) return { rows: [] };
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = values.length - 1; i >= 1; i--) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({ timestamp: r[0].toISOString(), role: r[2], tried: r[3], rating: r[4], worked: r[5], change: r[6], ideas: r[7], contact: r[8], device: r[9] });
  }
  return { rows: rows };
}

// ---- Admin dashboard: served by doGet, guarded by Google sign-in -------------

function doGet(e) {
  const email = currentEmail_();
  if (!isAdmin_(email)) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;max-width:520px;margin:60px auto;padding:0 20px;color:#333">' +
      '<h2 style="color:#d61f26">Pride Center dashboard</h2>' +
      (email
        ? '<p><b>' + email + '</b> is not on the admin list. Ask the dashboard owner to add you in Code.gs (ADMIN_EMAILS).</p>'
        : '<p>This link needs a district Google sign-in. Open the <b>admin dashboard</b> link, not the kiosk link.</p>') +
      '</div>'
    ).setTitle('Not authorized');
  }
  const t = HtmlService.createTemplateFromFile('Dashboard');
  t.email = email;
  return t.evaluate()
    .setTitle('Pride Center – Admin Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Called from Dashboard.html through google.script.run. */
function getCheckins(days) {
  const email = currentEmail_();
  if (!isAdmin_(email)) throw new Error('Not authorized');

  days = Math.min(Math.max(Number(days) || 14, 1), 365);
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
      outEnergy: r[18], outMoodGroup: r[19], outMoodWord: r[20], helped: r[21]
    });
  }
  return {
    rows: rows,
    days: days,
    email: email,
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  };
}

function currentEmail_() {
  try { return String(Session.getActiveUser().getEmail() || '').toLowerCase(); }
  catch (err) { return ''; }
}

function isAdmin_(email) {
  if (!email) return false; // anonymous (the kiosk deployment) never sees the dashboard
  if (!ADMIN_EMAILS.length) return true;
  return ADMIN_EMAILS.map(function (x) { return String(x).toLowerCase(); }).indexOf(email) !== -1;
}

// ---- One-time setup ---------------------------------------------------------

/** Run this once from the editor. Creates the Check-Ins and Summary tabs. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

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
