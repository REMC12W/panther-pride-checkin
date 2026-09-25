/**
 * Panther Pride Center – Check-In backend
 *
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * change STAFF_PIN, run setup() once, then Deploy → New deployment → Web app.
 * Full steps are in the project README.
 */

// ---- Settings ---------------------------------------------------------------

// Staff type this PIN into staff.html to view the dashboard. Change it!
const STAFF_PIN = '2468';

const SHEET_NAME   = 'Check-Ins';
const SUMMARY_NAME = 'Summary';

const HEADERS = [
  'Timestamp', 'Date', 'Time', 'Name / ID', 'Reason', 'Energy',
  'Mood Group', 'Mood Word', 'What Happened', 'Need', 'Outcome', 'Kiosk'
];

// ---- Web app entry points ---------------------------------------------------

/** The kiosk POSTs one check-in as JSON. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const ts = data.timestamp ? new Date(data.timestamp) : new Date();
    const tz = Session.getScriptTimeZone();
    const dateOnly = new Date(Utilities.formatDate(ts, tz, 'yyyy/MM/dd'));

    sheet.appendRow([
      ts,
      dateOnly,
      Utilities.formatDate(ts, tz, 'h:mm a'),
      String(data.name || '').trim(),
      data.reason    || '',
      data.energy    || '',
      data.moodGroup || '',
      data.moodWord  || '',
      data.happened  || '',
      data.need      || '',
      data.outcome   || '',
      data.kiosk     || ''
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** The staff dashboard GETs recent rows. Requires ?pin=STAFF_PIN. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (String(p.pin || '') !== String(STAFF_PIN)) {
    return json_({ ok: false, error: 'Wrong PIN' });
  }
  const days = Math.min(Math.max(Number(p.days) || 14, 1), 90);
  const cutoff = new Date(Date.now() - days * 86400000);

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!(r[0] instanceof Date) || r[0] < cutoff) continue;
    rows.push({
      timestamp: r[0].toISOString(),
      name: r[3], reason: r[4], energy: r[5], moodGroup: r[6], moodWord: r[7],
      happened: r[8], need: r[9], outcome: r[10], kiosk: r[11]
    });
  }
  return json_({ ok: true, days: days, rows: rows });
}

// ---- One-time setup ---------------------------------------------------------

/** Run this once from the editor. Creates the Check-Ins and Summary tabs. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Check-Ins tab
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header.setFontWeight('bold').setBackground('#d61f26').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd h:mm am/pm');
  sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd');
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(9, 150);

  // Remove the default empty "Sheet1" if it is still around and empty
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
  push('Today',       `=COUNTIF(${C}B:B, TODAY())`);
  push('This week',   `=COUNTIFS(${C}B:B, ">="&(TODAY()-WEEKDAY(TODAY(),2)+1), ${C}B:B, "<="&TODAY())`);
  push('This month',  `=COUNTIFS(${C}B:B, ">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1), ${C}B:B, "<="&TODAY())`);
  push('All time',    `=COUNTA(${C}A:A)-1`);
  push('');

  const section = (title, col, items) => {
    push(title, 'Today', 'All time');
    items.forEach(v => {
      const r = rows.length + 1; // 1-based sheet row this item will land on
      push(v,
        `=COUNTIFS(${C}${col}:${col}, A${r}, ${C}B:B, TODAY())`,
        `=COUNTIF(${C}${col}:${col}, A${r})`);
    });
    push('');
  };

  section('By reason', 'E', ['Sent by a teacher or staff', 'Scheduled Break', 'Drop In: I need a reset', 'Drop In: I have a need']);
  section('By energy', 'F', ['Moving Fast', 'Moving Slow', 'Moving Ok']);
  section('By mood group', 'G', ['Red', 'Yellow', 'Blue', 'Green']);
  section('By what happened', 'I', ['At Home', 'With my Teacher', 'With a friend', 'Just with myself']);
  section('By outcome', 'K', ['Check In', 'Incident Report', 'Basic Need']);

  push('Most common feelings (all time)', 'Count');
  const r0 = rows.length + 1;
  push(`=IFERROR(INDEX(SORT(QUERY(${C}H2:H, "select H, count(H) where H <> '' group by H label count(H) ''"), 2, FALSE), 1, 1), "")`,
       `=IFERROR(INDEX(SORT(QUERY(${C}H2:H, "select H, count(H) where H <> '' group by H label count(H) ''"), 2, FALSE), 1, 2), "")`);
  for (let i = 2; i <= 5; i++) {
    push(`=IFERROR(INDEX(SORT(QUERY(${C}H2:H, "select H, count(H) where H <> '' group by H label count(H) ''"), 2, FALSE), ${i}, 1), "")`,
         `=IFERROR(INDEX(SORT(QUERY(${C}H2:H, "select H, count(H) where H <> '' group by H label count(H) ''"), 2, FALSE), ${i}, 2), "")`);
  }

  s.getRange(1, 1, rows.length, 3).setValues(rows);
  s.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#d61f26');
  s.setColumnWidth(1, 260);
  s.setColumnWidth(2, 100);
  s.setColumnWidth(3, 100);
  // Bold the section headers (any row whose column B says Today/Count)
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
      timestamp: new Date().toISOString(), name: 'Test Student', reason: 'Drop In: I need a reset',
      energy: 'Moving Fast', moodGroup: 'Red', moodWord: 'Frustrated', happened: 'With a friend',
      need: '', outcome: 'Check In', kiosk: 'Editor test'
    }) }
  };
  Logger.log(doPost(fake).getContent());
}
