/**
 * Year of the Salmon — shared log backend.
 *
 * Stores every participant's daily entries and goal ticks in the spreadsheet
 * this script is bound to. Deployed as a web app, it answers JSONP GET requests
 * from the tracker page.
 *
 * Setup: see backend/SETUP.md. The only thing you must edit here is PASSPHRASE.
 */

// ---- edit this -------------------------------------------------------------
var PASSPHRASE = 'CHANGE-ME';
// ----------------------------------------------------------------------------

var ENTRY_SHEET  = 'entries';
var GOAL_SHEET   = 'goals';
var PEOPLE_SHEET = 'people';

var ENTRY_HEADERS  = ['key', 'who', 'date', 'steps', 'hang', 'pull', 'lift', 'text', 'updated'];
var GOAL_HEADERS   = ['who', 'goals', 'updated'];
var PEOPLE_HEADERS = ['who', 'why', 'joined', 'updated'];

/**
 * Apps Script web apps cannot send CORS headers, so the page talks to us with
 * JSONP: it injects a <script> tag and we reply with a function call.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = params.callback;

  var payload;
  try {
    payload = route(params);
  } catch (err) {
    payload = { ok: false, error: String((err && err.message) || err) };
  }

  var body = JSON.stringify(payload);
  if (callback && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function route(params) {
  if (params.pass !== PASSPHRASE) {
    return { ok: false, error: 'bad-pass' };
  }
  switch (params.action) {
    case 'load':       return handleLoad();
    case 'saveEntry':  return handleSaveEntry(params);
    case 'saveGoals':  return handleSaveGoals(params);
    case 'savePerson': return handleSavePerson(params);
    default:           return { ok: false, error: 'unknown-action' };
  }
}

// --- reads ------------------------------------------------------------------

function handleLoad() {
  return {
    ok: true,
    entries: readEntries(),
    goals: readGoals(),
    people: readPeople()
  };
}

function readPeople() {
  var rows = readAll(sheetFor(PEOPLE_SHEET, PEOPLE_HEADERS));
  var out = {};
  rows.forEach(function (r) {
    if (!r.who) return;
    out[slug(String(r.who))] = {
      who: String(r.who),
      why: String(r.why || ''),
      joined: normalizeDate(r.joined)
    };
  });
  return out;
}

function readEntries() {
  var rows = readAll(sheetFor(ENTRY_SHEET, ENTRY_HEADERS));
  return rows.map(function (r) {
    return {
      who:   String(r.who || ''),
      date:  normalizeDate(r.date),
      steps: Number(r.steps) || 0,
      hang:  Number(r.hang) || 0,
      pull:  Number(r.pull) || 0,
      lift:  r.lift === true || r.lift === 'TRUE' || r.lift === 'true',
      text:  String(r.text || '')
    };
  }).filter(function (r) { return r.who && r.date; });
}

function readGoals() {
  var rows = readAll(sheetFor(GOAL_SHEET, GOAL_HEADERS));
  var out = {};
  rows.forEach(function (r) {
    if (!r.who) return;
    try {
      out[slug(String(r.who))] = JSON.parse(r.goals || '{}');
    } catch (err) {
      out[slug(String(r.who))] = {};
    }
  });
  return out;
}

function readAll(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    for (var c = 0; c < headers.length; c++) row[headers[c]] = values[i][c];
    out.push(row);
  }
  return out;
}

// --- writes -----------------------------------------------------------------

/**
 * One row per person per day. Re-saving the same day overwrites that row rather
 * than appending, so the sheet stays the size of the actual log.
 */
function handleSaveEntry(params) {
  var who  = trimmed(params.who);
  var date = normalizeDate(params.date);
  if (!who)  return { ok: false, error: 'missing-who' };
  if (!date) return { ok: false, error: 'missing-date' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = sheetFor(ENTRY_SHEET, ENTRY_HEADERS);
    var key = slug(who) + ':' + date;
    var row = [
      key,
      who,
      date,
      Number(params.steps) || 0,
      Number(params.hang) || 0,
      Number(params.pull) || 0,
      params.lift === 'true' || params.lift === true,
      trimmed(params.text),
      new Date()
    ];

    var existing = findRowByKey(sheet, key);
    if (existing > 0) {
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function handleSaveGoals(params) {
  var who = trimmed(params.who);
  if (!who) return { ok: false, error: 'missing-who' };

  var goals = params.goals || '{}';
  try {
    JSON.parse(goals);
  } catch (err) {
    return { ok: false, error: 'bad-goals' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = sheetFor(GOAL_SHEET, GOAL_HEADERS);
    var row = [who, goals, new Date()];
    var existing = findRowByKey(sheet, slug(who), function (v) { return slug(String(v)); });
    if (existing > 0) {
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** The one-line "why I'm in" shown on a person's profile. */
function handleSavePerson(params) {
  var who = trimmed(params.who);
  if (!who) return { ok: false, error: 'missing-who' };

  var why = trimmed(params.why);
  if (why.length > 160) why = why.substring(0, 160);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = sheetFor(PEOPLE_SHEET, PEOPLE_HEADERS);
    var existing = findRowByKey(sheet, slug(who), function (v) { return slug(String(v)); });
    // Keep the original joined date when updating an existing person.
    var joined = '';
    if (existing > 0) {
      joined = normalizeDate(sheet.getRange(existing, 3).getValue());
    }
    if (!joined) {
      joined = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
    }

    var row = [who, why, joined, new Date()];
    if (existing > 0) {
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function findRowByKey(sheet, key, transform) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var col = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) {
    var v = transform ? transform(col[i][0]) : String(col[i][0]);
    if (v === key) return i + 2;
  }
  return -1;
}

// --- helpers ----------------------------------------------------------------

function sheetFor(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Sheets may hand back a Date object or a string depending on cell formatting. */
function normalizeDate(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd');
  }
  var s = String(v).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function trimmed(v) {
  return String(v == null ? '' : v).trim();
}

function slug(n) {
  return n.toLowerCase().replace(/[^a-z0-9]/g, '-');
}
