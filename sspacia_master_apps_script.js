/**
 * =============================================================================
 * SSPACIA MASTER GOOGLE APPS SCRIPT ENGINE (100% LIVE EVENT-DRIVEN)
 * =============================================================================
 * 1. EXPENSE FMS (Tab: "EXPENSE FMS" - Cols A to T: Data Set + Log Timestamp + 4 Approval Steps)
 * 2. SUSPENSE ADVANCE PAYMENT FMS (Tab: "SUSPENSE" - Cols A to H: Data Set + Log TimeStamp)
 * 3. INVOICE PROCESS FMS (Tab: "INV PROCESS FMS" - Cols A to O: Strict Gating)
 * 4. ACCOUNTS FMS (Tab: "Accounts" - Old Invoices archive & Daily Checks Cols Q:T)
 * 5. SCOT SSPACIA (Dedicated Spreadsheet: 12kfSFji8Jkq6a-lja0y2tQdohPL99s-_HVaoDzdacsE, Tab: "scot-sspacia")
 * 6. BOOK A WORKSPACE TOUR (Tab: "book a tour" + Automatic Sales Email)
 * 7. PURCHASE FMS (Tab: "sspacia-purchase" - Dedicated Isolated Module)
 * 8. HR CAREER APPLICATIONS + RESUME CV LINK (Tab: "HR" - Dedicated Isolated Module)
 * =============================================================================
 * Primary Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit
 * SCOT Spreadsheet: https://docs.google.com/spreadsheets/d/12kfSFji8Jkq6a-lja0y2tQdohPL99s-_HVaoDzdacsE/edit
 *
 * TIMESTAMP FORMAT: dd/MM/yyyy HH:mm:ss (24-hour, NO AM/PM, NO comma)
 * Stored as real Date objects with dd/MM/yyyy HH:mm:ss number format.
 * Status cells: Plain text only, NO background color, NO font color.
 * Delay formulas: NOT overwritten by script — managed manually in sheet.
 * =============================================================================
 * FIX LOG:
 * - EXPENSE FMS row alignment: Subheaders at Row 6, Data at Row 7+ (matches existing sheet)
 * - Bootstrap sync clears ALL old data before writing (removes ghost deleted entries)
 * - Planned columns = "" (blank) for all 4 steps in EXPENSE FMS
 * - Status/TimeDelay columns = "" (blank) for user formulas
 * =============================================================================
 */

var CONFIG = {
  SPREADSHEET_ID: "1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0",
  EXPENSE_FMS_SHEET_NAME: "EXPENSE FMS",
  SUSPENSE_SHEET_NAME: "SUSPENSE",
  INV_PROCESS_SHEET_NAME: "INV PROCESS FMS",
  ACCOUNTS_SHEET_NAME: "Accounts",
  TOUR_SHEET_NAME: "book a tour",
  PURCHASE_SHEET_NAME: "sspacia-purchase",
  HR_SHEET_NAME: "HR",
  
  // 🌟 Dedicated SCOT Spreadsheet Settings
  SCOT_SPREADSHEET_ID: "12kfSFji8Jkq6a-lja0y2tQdohPL99s-_HVaoDzdacsE",
  SCOT_SHEET_NAME: "scot-sspacia",
  SCOT_API_URL: "https://sspacia.com/api/admin/scot-data",
  SCOT_CONTACTS_PER_CLIENT: 4,
  SCOT_CALL_DATE_COUNT: 15,
  SCOT_WEEK_COUNT: 3,
  SCOT_DAYS_PER_WEEK: 7,

  // Destination email where tour booking alerts will be sent
  SALES_EMAIL: "sales@sspacia.com",
  
  // EXPENSE FMS Layout: Subheaders at Row 6, Data starts at Row 7
  HEADER_ROW: 6,
  DATA_START_ROW: 7,
  ACTIVE_CENTERS: [
    "Agarwal Complex",
    "Mercado",
    "Premier House"
  ],
  TIMEZONE: "Asia/Kolkata",
  DATE_FORMAT: "dd/MM/yyyy",
  TIMESTAMP_FORMAT: "dd/MM/yyyy HH:mm:ss"
};

// ─────────────────────────────────────────────────────────────────────────────
// SPREADSHEET & SHEET GETTERS
// ─────────────────────────────────────────────────────────────────────────────

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getExpenseFmsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.EXPENSE_FMS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheetByName("Expense FMS") || ss.getSheetByName("expense fms");
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.EXPENSE_FMS_SHEET_NAME);
    }
  }
  return sheet;
}

function getSuspenseSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SUSPENSE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheetByName("expense fms") || ss.getSheetByName("Expense FMS") || ss.getActiveSheet();
  }
  return sheet;
}

function getInvProcessSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.INV_PROCESS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheetByName("inv process fms");
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.INV_PROCESS_SHEET_NAME);
    }
  }
  return sheet;
}

function getAccountsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.ACCOUNTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ACCOUNTS_SHEET_NAME);
  }
  return sheet;
}

function getTodayDateString(d) {
  var date = d || new Date();
  return Utilities.formatDate(date, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
}

function getNowTimestampString(d) {
  var date = d || new Date();
  return Utilities.formatDate(date, CONFIG.TIMEZONE, CONFIG.TIMESTAMP_FORMAT);
}

/**
 * Normalization helper: strips all punctuation, spaces, and lowercases for 100% resilient live matching
 */
function normFmsText(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse any timestamp string (dd/MM/yyyy HH:mm:ss, ISO, etc.)
 * with automatic detection of inverted MM/DD vs DD/MM.
 */
function parseTimestampToDate(ts) {
  if (!ts) return new Date();
  if (ts instanceof Date && !isNaN(ts.getTime())) return ts;
  var s = String(ts).trim();
  var cleaned = s.replace(/,/g, '').trim();

  // Try dd/MM/yyyy HH:mm:ss (or MM/dd/yyyy HH:mm:ss)
  var m = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    var p1 = parseInt(m[1], 10);
    var p2 = parseInt(m[2], 10);
    var y = parseInt(m[3], 10);
    var hour = parseInt(m[4], 10);
    if (/\bpm\b/i.test(s) && hour < 12) hour += 12;
    if (/\bam\b/i.test(s) && hour === 12) hour = 0;

    var day = p1;
    var month = p2;
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }
    return new Date(y, month - 1, day, hour, parseInt(m[5], 10), parseInt(m[6], 10));
  }

  // Try dd/MM/yyyy HH:mm (without seconds)
  var m2 = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (m2) {
    var p1 = parseInt(m2[1], 10);
    var p2 = parseInt(m2[2], 10);
    var y2 = parseInt(m2[3], 10);
    var hour2 = parseInt(m2[4], 10);
    if (/\bpm\b/i.test(s) && hour2 < 12) hour2 += 12;
    if (/\bam\b/i.test(s) && hour2 === 12) hour2 = 0;
    var day2 = p1;
    var month2 = p2;
    if (p2 > 12 && p1 <= 12) {
      month2 = p1;
      day2 = p2;
    }
    return new Date(y2, month2 - 1, day2, hour2, parseInt(m2[5], 10), 0);
  }

  // Try dd/MM/yyyy (date only)
  var mDateOnly = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mDateOnly) {
    var p1 = parseInt(mDateOnly[1], 10);
    var p2 = parseInt(mDateOnly[2], 10);
    var yDate = parseInt(mDateOnly[3], 10);
    var dayDate = p1;
    var monthDate = p2;
    if (p2 > 12 && p1 <= 12) {
      monthDate = p1;
      dayDate = p2;
    }
    return new Date(yDate, monthDate - 1, dayDate, 0, 0, 0);
  }

  // Try ISO format (yyyy-MM-ddTHH:mm:ss)
  var m4 = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (m4) {
    return new Date(parseInt(m4[1], 10), parseInt(m4[2], 10) - 1, parseInt(m4[3], 10), parseInt(m4[4], 10), parseInt(m4[5], 10), parseInt(m4[6], 10));
  }

  var d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}


/**
 * Write a proper Date object to a cell with dd/MM/yyyy HH:mm:ss number format.
 */
function setDateValue(cell, dateOrString) {
  var d = parseTimestampToDate(dateOrString);
  cell.setValue(d)
      .setNumberFormat("dd/MM/yyyy HH:mm:ss")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Roboto")
      .setFontSize(10);
  return d;
}

/**
 * Parse date without time into a real Date object
 */
function parseDateOnly(dateVal) {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }
  var s = String(dateVal).trim();

  var mIso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (mIso) {
    return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10));
  }

  var mDmY = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mDmY) {
    return new Date(parseInt(mDmY[3], 10), parseInt(mDmY[2], 10) - 1, parseInt(mDmY[1], 10));
  }

  var d = new Date(s);
  if (!isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return new Date();
}

/**
 * Write a date-only value (dd/MM/yyyy) to a cell as a real Date object.
 */
function setDateOnlyValue(cell, dateVal) {
  var d = parseDateOnly(dateVal);
  cell.setValue(d)
      .setNumberFormat("dd/MM/yyyy")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Roboto")
      .setFontSize(10);
  return d;
}

/**
 * Set status as plain text — NO background color, NO font color.
 */
function setPlainStatus(cell, statusVal) {
  cell.setValue(statusVal)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Roboto")
      .setFontSize(10)
      .setFontWeight("bold")
      .setBackground(null)
      .setFontColor(null);
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 1: EXPENSE FMS (Tab: "EXPENSE FMS" - Cols A to T)
// ═════════════════════════════════════════════════════════════════════════════
// LAYOUT:
//   Rows 2-5, Cols A-D (Merged): Data Set
//   Rows 2-5, Cols E-H: Approve or reject with remarks Expense Entered by CM's (Dipendra | sspacia site | 8)
//   Rows 2-5, Cols I-L: Get Approval From Super Admin For The Same (Dipendra | sspacia site | 8)
//   Rows 2-5, Cols M-P: Take Approval before entering UTR Details (Dipendra | sspacia site | 8)
//   Rows 2-5, Cols Q-T: Enter UTR Details (Dipendra | sspacia site | 4)
//
//   Row 6: Subheaders:
//     Col A (1): Center
//     Col B (2): Expense Date
//     Col C (3): header - item desc
//     Col D (4): Log Timestamp (exact timestamp when submitted by CM or accountant)
//     Col E (5): Planned (Step 1 - left for user formula)
//     Col F (6): Actual (Step 1 - accountant approve/reject or log timestamp if accountant-entered)
//     Col G (7): Status (Step 1 - left for user formula)
//     Col H (8): TimeDelay (Step 1 - left for user formula)
//     Col I (9): Planned (Step 2 - left for user formula)
//     Col J (10): Actual (Step 2 - Super Admin approval)
//     Col K (11): Status (Step 2 - left for user formula)
//     Col L (12): TimeDelay (Step 2 - left for user formula)
//     Col M (13): Planned (Step 3 - left for user formula)
//     Col N (14): Actual (Step 3 - UTR approval before entering UTR)
//     Col O (15): Status (Step 3 - left for user formula)
//     Col P (16): TimeDelay (Step 3 - left for user formula)
//     Col Q (17): Planned (Step 4 - left for user formula)
//     Col R (18): Actual (Step 4 - accountant submitted UTR details)
//     Col S (19): Status (Step 4 - left for user formula)
//     Col T (20): TimeDelay (Step 4 - left for user formula)
//
//   Row 7+: Data rows in ascending chronological order
// ═════════════════════════════════════════════════════════════════════════════

function setupExpenseFmsHeaders() {
  var sheet = getExpenseFmsSheet();

  // Safely break apart entire header area to avoid merge conflicts
  try { sheet.getRange("A1:T6").breakApart(); } catch (e) {}

  // ── 1. DATA SET (Cols A to D, Rows 2-5) ──────────────────────────────────
  sheet.getRange("A2:D5").merge()
       .setValue("Data Set")
       .setFontFamily("Roboto")
       .setFontSize(14)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  // ── 2. Step 1: Approve or reject with remarks Expense Entered by CM's (Cols E to H) ──
  sheet.getRange("E2:H2").merge().setValue("Approve or reject with remarks Expense Entered by CM's").setFontWeight("bold");
  sheet.getRange("E3:H3").merge().setValue("Dipendra");
  sheet.getRange("E4:H4").merge().setValue("sspacia site");
  sheet.getRange("E5:H5").merge().setValue("8");

  // ── 3. Step 2: Get Approval From Super Admin For The Same (Cols I to L) ──
  sheet.getRange("I2:L2").merge().setValue("Get Approval From Super Admin For The Same").setFontWeight("bold");
  sheet.getRange("I3:L3").merge().setValue("Dipendra");
  sheet.getRange("I4:L4").merge().setValue("sspacia site");
  sheet.getRange("I5:L5").merge().setValue("8");

  // ── 4. Step 3: Take Approval before entering UTR Details (Cols M to P) ──
  sheet.getRange("M2:P2").merge().setValue("Take Approval before entering UTR Details").setFontWeight("bold");
  sheet.getRange("M3:P3").merge().setValue("Dipendra");
  sheet.getRange("M4:P4").merge().setValue("sspacia site");
  sheet.getRange("M5:P5").merge().setValue("8");

  // ── 5. Step 4: Enter UTR Details (Cols Q to T) ──
  sheet.getRange("Q2:T2").merge().setValue("Enter UTR Details").setFontWeight("bold");
  sheet.getRange("Q3:T3").merge().setValue("Dipendra");
  sheet.getRange("Q4:T4").merge().setValue("sspacia site");
  sheet.getRange("Q5:T5").merge().setValue("4");

  // ── Subheaders (Row 6) ──────────────────────────────────────────────────
  sheet.getRange(6, 1).setValue("Center");
  sheet.getRange(6, 2).setValue("Expense Date");
  sheet.getRange(6, 3).setValue("header - item desc");
  sheet.getRange(6, 4).setValue("Log Timestamp");

  var subHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
  for (var s = 0; s < 4; s++) {
    var startCol = 5 + s * 4; // Col 5 (E), Col 9 (I), Col 13 (M), Col 17 (Q)
    for (var h = 0; h < 4; h++) {
      sheet.getRange(6, startCol + h).setValue(subHeaders[h]);
    }
  }

  // Format Header Block (A1:T6)
  sheet.getRange("A1:T6")
       .setFontFamily("Roboto")
       .setFontSize(10)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
  sheet.getRange("A2:D5").setFontSize(14).setFontWeight("bold");
  sheet.getRange("A6:T6").setFontWeight("bold");
  sheet.getRange("A2:T6").setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Column Widths
  sheet.setColumnWidth(1, 130); // Center
  sheet.setColumnWidth(2, 110); // Expense Date
  sheet.setColumnWidth(3, 260); // header - item desc
  sheet.setColumnWidth(4, 160); // Log Timestamp
  for (var c = 5; c <= 20; c++) {
    var mod = (c - 5) % 4;
    if (mod === 0 || mod === 1) sheet.setColumnWidth(c, 160); // Planned, Actual
    else sheet.setColumnWidth(c, 90);                         // Status, TimeDelay
  }

  sheet.setRowHeight(1, 24);
  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 22);
  sheet.setRowHeight(5, 22);
  sheet.setRowHeight(6, 28);
  sheet.setFrozenRows(6);

  return { status: "success", message: "EXPENSE FMS headers successfully configured on tab 'EXPENSE FMS' (Cols A:T, Subheaders Row 6, Data Row 7+)" };
}

/**
 * Find an existing expense row in the EXPENSE FMS sheet.
 * Data rows start at ROW 7 (Row 6 = subheaders).
 */
function findExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 7) return -1;

  var normCenter = normFmsText(centerName);
  var normDate = normFmsText(expenseDate);
  var normDesc = normFmsText(headerItemDesc);

  // 1. Try exact match by record ID note in Col C
  if (recordId) {
    var targetNote = "id:" + recordId;
    var notes = sheet.getRange(7, 3, lastRow - 6, 1).getNotes();
    for (var n = 0; n < notes.length; n++) {
      if (notes[n][0] && notes[n][0].indexOf(targetNote) !== -1) {
        return 7 + n;
      }
    }
  }

  // 2. Match by Center, Date, and Description
  var values = sheet.getRange(7, 1, lastRow - 6, 3).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    var rCenter = normFmsText(values[i][0]);
    var rDate = normFmsText(values[i][1]);
    var rDesc = normFmsText(values[i][2]);

    var centerMatch = (!normCenter || rCenter === normCenter || rCenter.indexOf(normCenter) !== -1 || normCenter.indexOf(rCenter) !== -1);
    var dateMatch = (!normDate || rDate === normDate || rDate.indexOf(normDate) !== -1 || normDate.indexOf(rDate) !== -1);
    var descMatch = (rDesc === normDesc || rDesc.indexOf(normDesc) !== -1 || normDesc.indexOf(rDesc) !== -1);

    if (centerMatch && dateMatch && descMatch) {
      return 7 + i;
    }
  }

  return -1;
}

/**
 * Find or create an expense row in the EXPENSE FMS sheet.
 * Data rows start at ROW 7.
 */
function getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc, logTimestamp) {
  var targetRow = findExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
  if (targetRow !== -1) {
    if (!sheet.getRange(targetRow, 1).getValue() && centerName) sheet.getRange(targetRow, 1).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
    if (!sheet.getRange(targetRow, 2).getValue() && expenseDate) setDateOnlyValue(sheet.getRange(targetRow, 2), expenseDate);
    if (!sheet.getRange(targetRow, 3).getValue() && headerItemDesc) {
      var dCell = sheet.getRange(targetRow, 3).setValue(headerItemDesc).setFontWeight("bold");
      if (recordId) dCell.setNote("id:" + recordId);
    }
    if (logTimestamp && (!sheet.getRange(targetRow, 4).getValue() || String(sheet.getRange(targetRow, 4).getValue()).trim() === "")) {
      setDateValue(sheet.getRange(targetRow, 4), logTimestamp);
    }
    return targetRow;
  }

  var lastRow = Math.max(sheet.getLastRow(), 6);
  for (var r = 7; r <= lastRow + 1; r++) {
    var aVal = String(sheet.getRange(r, 1).getValue() || "").trim();
    if (!aVal) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) targetRow = lastRow + 1;

  sheet.getRange(targetRow, 1).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
  setDateOnlyValue(sheet.getRange(targetRow, 2), expenseDate);
  var descCell = sheet.getRange(targetRow, 3).setValue(headerItemDesc).setFontWeight("bold");
  if (recordId) {
    descCell.setNote("id:" + recordId);
  }
  if (logTimestamp) {
    setDateValue(sheet.getRange(targetRow, 4), logTimestamp);
  }
  sheet.getRange(targetRow, 1, 1, 20).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

  return targetRow;
}

function handleExpenseFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getExpenseFmsSheet();

  var recordId = payload.recordId || payload.id;
  var centerName = String(payload.centerName || "Mercado").trim();
  var expenseDate = String(payload.expenseDate || "").trim();
  var headerItemDesc = String(payload.headerItemDesc || "").trim();
  var timestamp = payload.actual || payload.timestamp || getNowTimestampString();
  var logTimestamp = payload.logTimestamp || payload.timestamp || getNowTimestampString();

  if (action === "expense_fms_setup_headers") {
    var res = setupExpenseFmsHeaders();
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 1. EXPENSE CREATED: CM or Accountant enters expense record ─────────────
  else if (action === "expense_fms_create") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc, logTimestamp);

    // If accountant entered expense, accountant does not approve their own expense,
    // so Step 1 Actual (Col F: Col 6) is immediately the log timestamp!
    if (payload.isAccountantEntered || payload.step1Actual) {
      var s1Time = payload.step1Actual || logTimestamp;
      setDateValue(sheet.getRange(row, 6), s1Time);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Expense record created in EXPENSE FMS row " + row + " with Log Timestamp in Col D",
      row: row,
      logTimestamp: logTimestamp
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. STEP 1: Accountant Approval / Rejection ───────────────────────────
  else if (action === "expense_fms_step1_accountant") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col F (Col 6): Step 1 Actual (Col E Planned, Col G Status, Col H TimeDelay left untouched for user formulas)
    setDateValue(sheet.getRange(row, 6), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 1 Accountant approval logged in EXPENSE FMS Col F row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 3. STEP 2: Super Admin Approval / Rejection ──────────────────────────
  else if (action === "expense_fms_step2_super_admin") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col J (Col 10): Step 2 Actual (Col I Planned, Col K Status, Col L TimeDelay left untouched for user formulas)
    setDateValue(sheet.getRange(row, 10), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 2 Super Admin approval logged in EXPENSE FMS Col J row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 4. STEP 3: Payment Approval ("Take Approval before entering UTR") ─────
  else if (action === "expense_fms_step3_payment_approval") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col N (Col 14): Step 3 Actual (Col M Planned, Col O Status, Col P TimeDelay left untouched for user formulas)
    setDateValue(sheet.getRange(row, 14), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 3 Payment Approval logged in EXPENSE FMS Col N row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 5. STEP 4: Accountant Enters & Saves UTR Details ─────────────────────
  else if (action === "expense_fms_step4_utr") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col R (Col 18): Step 4 Actual (Col Q Planned, Col S Status, Col T TimeDelay left untouched for user formulas)
    setDateValue(sheet.getRange(row, 18), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 4 UTR Details logged in EXPENSE FMS Col R row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 6. BOOTSTRAP FAST BATCH SYNC & POPULATE ──────────────────────────────
  else if (action === "expense_fms_bootstrap_sync") {
    setupExpenseFmsHeaders();
    var items = payload.items || [];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No expense items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastExistingRow = sheet.getLastRow();

    // Sort items strictly in ascending order by expenseDate, then id
    items.sort(function(a, b) {
      var da = a.expenseDate ? new Date(a.expenseDate).getTime() : 0;
      var db = b.expenseDate ? new Date(b.expenseDate).getTime() : 0;
      if (da !== db) return da - db;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    if (lastExistingRow >= 7) {
      var numRows = lastExistingRow - 6;

      // Read existing identifiers and notes
      var notesColC = sheet.getRange(7, 3, numRows, 1).getNotes();
      var idMap = {};
      var descMap = {};

      for (var r = 0; r < numRows; r++) {
        var note = notesColC[r][0] || "";
        var m = note.match(/id:(\d+)/);
        if (m) {
          idMap[m[1]] = 7 + r;
        }
      }

      var displayValues = sheet.getRange(7, 1, numRows, 3).getDisplayValues();
      for (var r = 0; r < numRows; r++) {
        var key = (displayValues[r][0] + "|" + displayValues[r][1] + "|" + displayValues[r][2]).toLowerCase().replace(/\s+/g, " ").trim();
        if (!descMap[key]) {
          descMap[key] = 7 + r;
        }
      }

      // Read current values of Col D, F, J, N, R
      var colD = sheet.getRange(7, 4, numRows, 1).getValues();  // Log Timestamp
      var colF = sheet.getRange(7, 6, numRows, 1).getValues();  // Step 1 Actual
      var colJ = sheet.getRange(7, 10, numRows, 1).getValues(); // Step 2 Actual
      var colN = sheet.getRange(7, 14, numRows, 1).getValues(); // Step 3 Actual
      var colR = sheet.getRange(7, 18, numRows, 1).getValues(); // Step 4 Actual

      var updatedRows = 0;
      var newItems = [];

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var targetRow = -1;

        if (it.id && idMap[it.id]) {
          targetRow = idMap[it.id];
        } else {
          var key = ((it.centerName || "") + "|" + (it.expenseDate || "") + "|" + (it.headerItemDesc || "")).toLowerCase().replace(/\s+/g, " ").trim();
          if (descMap[key]) {
            targetRow = descMap[key];
          } else if (i < numRows) {
            targetRow = 7 + i;
          }
        }

        if (targetRow >= 7 && targetRow <= lastExistingRow) {
          var rowIdx = targetRow - 7;

          // 1. Col D: Log Timestamp
          if (it.logTimestamp) {
            colD[rowIdx][0] = parseTimestampToDate(it.logTimestamp) || it.logTimestamp;
          }

          // 2. Col F: Step 1 Actual
          // Rule: If accountant entered, use logTimestamp; else if approved, use step1Actual
          var s1 = it.isAccountantEntered ? it.logTimestamp : (it.step1Actual || "");
          if (s1 && (!colF[rowIdx][0] || String(colF[rowIdx][0]).trim() === "")) {
            colF[rowIdx][0] = parseTimestampToDate(s1) || s1;
          }

          // 3. Col J: Step 2 Actual (Super Admin)
          if (it.step2Actual && (!colJ[rowIdx][0] || String(colJ[rowIdx][0]).trim() === "")) {
            colJ[rowIdx][0] = parseTimestampToDate(it.step2Actual) || it.step2Actual;
          }

          // 4. Col N: Step 3 Actual (Payment Approval)
          if (it.step3Actual && (!colN[rowIdx][0] || String(colN[rowIdx][0]).trim() === "")) {
            colN[rowIdx][0] = parseTimestampToDate(it.step3Actual) || it.step3Actual;
          }

          // 5. Col R: Step 4 Actual (UTR Details)
          if (it.step4Actual && (!colR[rowIdx][0] || String(colR[rowIdx][0]).trim() === "")) {
            colR[rowIdx][0] = parseTimestampToDate(it.step4Actual) || it.step4Actual;
          }

          if (it.id && (!notesColC[rowIdx][0] || notesColC[rowIdx][0].indexOf("id:") === -1)) {
            notesColC[rowIdx][0] = "id:" + it.id;
          }

          updatedRows++;
        } else {
          newItems.push(it);
        }
      }

      // Write back updated columns without touching Planned, Status, TimeDelay formulas!
      sheet.getRange(7, 4, numRows, 1).setValues(colD).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
      sheet.getRange(7, 6, numRows, 1).setValues(colF).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
      sheet.getRange(7, 10, numRows, 1).setValues(colJ).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
      sheet.getRange(7, 14, numRows, 1).setValues(colN).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
      sheet.getRange(7, 18, numRows, 1).setValues(colR).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
      sheet.getRange(7, 3, numRows, 1).setNotes(notesColC);

      // Append any brand new items at bottom
      if (newItems.length > 0) {
        var startAppend = lastExistingRow + 1;
        var appendRows = [];
        var appendNotes = [];
        for (var n = 0; n < newItems.length; n++) {
          var nit = newItems[n];
          var s1New = nit.isAccountantEntered ? nit.logTimestamp : (nit.step1Actual || "");
          appendRows.push([
            nit.centerName || "Mercado",                                    // Col A: Center
            parseDateOnly(nit.expenseDate),                                  // Col B: Expense Date
            nit.headerItemDesc || "",                                        // Col C: header - item desc
            nit.logTimestamp ? parseTimestampToDate(nit.logTimestamp) : "", // Col D: Log Timestamp
            "",                                                              // Col E: Planned (Blank for formula)
            s1New ? parseTimestampToDate(s1New) : "",                        // Col F: Step 1 Actual
            "",                                                              // Col G: Status (Blank for formula)
            "",                                                              // Col H: TimeDelay (Blank for formula)
            "",                                                              // Col I: Planned (Blank for formula)
            nit.step2Actual ? parseTimestampToDate(nit.step2Actual) : "",   // Col J: Step 2 Actual
            "",                                                              // Col K: Status (Blank for formula)
            "",                                                              // Col L: TimeDelay (Blank for formula)
            "",                                                              // Col M: Planned (Blank for formula)
            nit.step3Actual ? parseTimestampToDate(nit.step3Actual) : "",   // Col N: Step 3 Actual
            "",                                                              // Col O: Status (Blank for formula)
            "",                                                              // Col P: TimeDelay (Blank for formula)
            "",                                                              // Col Q: Planned (Blank for formula)
            nit.step4Actual ? parseTimestampToDate(nit.step4Actual) : "",   // Col R: Step 4 Actual
            "",                                                              // Col S: Status (Blank for formula)
            ""                                                               // Col T: TimeDelay (Blank for formula)
          ]);
          appendNotes.push(["id:" + (nit.id || "")]);
        }
        sheet.getRange(startAppend, 1, appendRows.length, 20).setValues(appendRows);
        sheet.getRange(startAppend, 1, appendRows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
        sheet.getRange(startAppend, 2, appendRows.length, 1).setNumberFormat("dd/MM/yyyy").setHorizontalAlignment("center");
        sheet.getRange(startAppend, 3, appendRows.length, 1).setFontWeight("bold").setNotes(appendNotes);
        var actCols = [4, 6, 10, 14, 18];
        for (var a = 0; a < actCols.length; a++) {
          sheet.getRange(startAppend, actCols[a], appendRows.length, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
        }
        sheet.getRange(startAppend, 1, appendRows.length, 20).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Updated " + updatedRows + " existing rows and appended " + newItems.length + " new rows in EXPENSE FMS! All user Planned/Status/TimeDelay formulas preserved!",
        updatedCount: updatedRows,
        appendedCount: newItems.length
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // First-time setup on fresh empty sheet (starting at Row 7)
      var rows = [];
      var notesColC = [];

      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var s1First = it.isAccountantEntered ? it.logTimestamp : (it.step1Actual || "");

        rows.push([
          it.centerName || "Mercado",                                    // Col A: Center
          parseDateOnly(it.expenseDate),                                  // Col B: Expense Date
          it.headerItemDesc || "",                                        // Col C: header - item desc
          it.logTimestamp ? parseTimestampToDate(it.logTimestamp) : "", // Col D: Log Timestamp
          "",                                                              // Col E: Step 1 Planned
          s1First ? parseTimestampToDate(s1First) : "",                   // Col F: Step 1 Actual
          "",                                                              // Col G: Step 1 Status
          "",                                                              // Col H: Step 1 TimeDelay
          "",                                                              // Col I: Step 2 Planned
          it.step2Actual ? parseTimestampToDate(it.step2Actual) : "",     // Col J: Step 2 Actual
          "",                                                              // Col K: Step 2 Status
          "",                                                              // Col L: Step 2 TimeDelay
          "",                                                              // Col M: Step 3 Planned
          it.step3Actual ? parseTimestampToDate(it.step3Actual) : "",     // Col N: Step 3 Actual
          "",                                                              // Col O: Step 3 Status
          "",                                                              // Col P: Step 3 TimeDelay
          "",                                                              // Col Q: Step 4 Planned
          it.step4Actual ? parseTimestampToDate(it.step4Actual) : "",     // Col R: Step 4 Actual
          "",                                                              // Col S: Step 4 Status
          ""                                                               // Col T: Step 4 TimeDelay
        ]);

        notesColC.push(["id:" + (it.id || "")]);
      }

      sheet.getRange(7, 1, rows.length, 20).setValues(rows);
      sheet.getRange(7, 1, rows.length, 20)
           .setFontFamily("Roboto")
           .setFontSize(10)
           .setVerticalAlignment("middle")
           .setBackground(null)
           .setFontColor(null);

      sheet.getRange(7, 1, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
      sheet.getRange(7, 2, rows.length, 1).setNumberFormat("dd/MM/yyyy").setHorizontalAlignment("center");
      sheet.getRange(7, 3, rows.length, 1).setFontWeight("bold").setNotes(notesColC);

      var actCols2 = [4, 6, 10, 14, 18];
      for (var a2 = 0; a2 < actCols2.length; a2++) {
        sheet.getRange(7, actCols2[a2], rows.length, 1)
             .setNumberFormat("dd/MM/yyyy HH:mm:ss")
             .setHorizontalAlignment("center");
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Populated " + items.length + " expense records in tab 'EXPENSE FMS' (Row 7+) successfully with blank Planned/Status/TimeDelay!",
        count: items.length
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

function populateExpenseFms() {
  setupExpenseFmsHeaders();
  var urls = [
    "https://sspacia.com/api/admin/expense-fms-data",
    "https://sspacia.com/api/admin/expenses/fms-sync"
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = UrlFetchApp.fetch(urls[u], { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        var json = JSON.parse(res.getContentText());
        if (json && json.items && json.items.length > 0) {
          var result = handleExpenseFms({
            action: "expense_fms_bootstrap_sync",
            items: json.items
          });
          Logger.log("✅ EXPENSE FMS Population Complete from " + urls[u] + ": " + result.getContent());
          return;
        }
      }
      Logger.log("Notice: API " + urls[u] + " returned HTTP " + res.getResponseCode());
    } catch (e) {
      Logger.log("Notice fetching from " + urls[u] + ": " + e.toString());
    }
  }
}

/**
 * 🗑️ Clean up old daily 1AM triggers (since daily expense FMS is removed)
 */
function removeDaily1AMTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === 'dailyPlanned1AM' || fn === 'dailyPlanned') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  Logger.log("✅ Removed " + count + " old dailyPlanned1AM triggers successfully!");
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 2: INVOICE PROCESS FMS (Tab: "INV PROCESS FMS" - Cols A to O)
// ═════════════════════════════════════════════════════════════════════════════
// STRICT SEQUENTIAL GATING:
// - Step 1 Planned: when invoice arrives
// - Step 1 Actual: when CM sends to accountant
// - Step 2 Planned: EQUALS Step 1 Actual (BLANK if Step 1 Actual has NOT arrived!)
// - Step 2 Actual: when accountant attaches tally PDF & sends back to CM
// - Step 3 Planned: EQUALS Step 2 Actual (BLANK if Step 2 Actual has NOT arrived!)
// - Step 3 Actual: when CM approves invoice to send to client
// ═════════════════════════════════════════════════════════════════════════════

function setupInvoiceWorkflowHeaders() {
  var sheet = getInvProcessSheet();

  // ── Safely Break Apart Any Previous Merges in Rows 1 to 6 ───────────────
  try { sheet.getRange(1, 1, 6, 26).breakApart(); } catch (e) {}

  // ── 1. Data Set (Cols A to D, Rows 2-5) ──────────────────────────────────
  sheet.getRange("A2:D5").merge()
       .setValue("Data Set")
       .setFontFamily("Roboto")
       .setFontSize(14)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  // ── 2. Step 1: Review Invoice entries & Send to Accountant (Cols E to H, Rows 2-5) ──
  sheet.getRange("E2:H2").merge().setValue("Review Invoice entries & Send to Accountant to attach tally pdf").setFontWeight("bold");
  sheet.getRange("E3:H3").merge().setValue("Community Managers");
  sheet.getRange("E4:H4").merge().setValue("sspacia site - when invoice entry arrive in invoice section");
  sheet.getRange("E5:H5").merge().setValue("8");

  // ── 3. Step 2: Attach Tally Invoice PDF and send back to CM (Cols I to L, Rows 2-5) ──
  sheet.getRange("I2:L2").merge().setValue("Attach Tally Invoice PDF and send back to CM").setFontWeight("bold");
  sheet.getRange("I3:L3").merge().setValue("Dipendra");
  sheet.getRange("I4:L4").merge().setValue("sspacia site - when CM sent to accountant");
  sheet.getRange("I5:L5").merge().setValue("8");

  // ── 4. Step 3: approve or reject accountant attached invoice pdf (Cols M to P, Rows 2-5) ──
  sheet.getRange("M2:P2").merge().setValue("approve or reject accountant attached invoice pdf").setFontWeight("bold");
  sheet.getRange("M3:P3").merge().setValue("Community Managers");
  sheet.getRange("M4:P4").merge().setValue("sspacia site - when accountant send back with attached inv pdf");
  sheet.getRange("M5:P5").merge().setValue("8");

  // ── 5. Step 4: Website Auto send Email to Client with Attached Invoice (Col Q, Rows 2-5) ──
  sheet.getRange("Q2:Q5").merge()
       .setValue("Website Auto send Email to Client with Attached Invoice")
       .setFontWeight("bold")
       .setWrap(true);

  // ── 6. Subheaders (Row 6: Cols A to Q) ──────────────────────────────────
  var subHeaders = [
    "Doer Centre",    // Col 1 (A)
    "Invoice Month",  // Col 2 (B)
    "Company Name",   // Col 3 (C)
    "Log Timestamp",  // Col 4 (D)
    "Planned",        // Col 5 (E)
    "Actual",         // Col 6 (F)
    "Status",         // Col 7 (G)
    "TimeDelay",      // Col 8 (H)
    "Planned",        // Col 9 (I)
    "Actual",         // Col 10 (J)
    "Status",         // Col 11 (K)
    "TimeDelay",      // Col 12 (L)
    "Planned",        // Col 13 (M)
    "Actual",         // Col 14 (N)
    "Status",         // Col 15 (O)
    "TimeDelay",      // Col 16 (P)
    "Status"          // Col 17 (Q)
  ];
  for (var h = 0; h < subHeaders.length; h++) {
    sheet.getRange(6, h + 1).setValue(subHeaders[h]);
  }

  // Format Header Block (A2:Q6)
  sheet.getRange("A2:Q6")
       .setFontFamily("Roboto")
       .setFontSize(10)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle")
       .setBackground(null)
       .setFontColor(null);
  sheet.getRange("A2:D5").setFontSize(14);
  sheet.getRange("A6:Q6").setFontWeight("bold");
  sheet.getRange("A2:Q6").setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Column Widths
  sheet.setColumnWidth(1, 130);  // Doer Centre
  sheet.setColumnWidth(2, 120);  // Invoice Month
  sheet.setColumnWidth(3, 260);  // Company Name
  sheet.setColumnWidth(4, 160);  // Log Timestamp
  sheet.setColumnWidth(5, 160);  // Step 1 Planned
  sheet.setColumnWidth(6, 160);  // Step 1 Actual
  sheet.setColumnWidth(7, 90);   // Step 1 Status
  sheet.setColumnWidth(8, 90);   // Step 1 TimeDelay
  sheet.setColumnWidth(9, 160);  // Step 2 Planned
  sheet.setColumnWidth(10, 160); // Step 2 Actual
  sheet.setColumnWidth(11, 90);  // Step 2 Status
  sheet.setColumnWidth(12, 90);  // Step 2 TimeDelay
  sheet.setColumnWidth(13, 160); // Step 3 Planned
  sheet.setColumnWidth(14, 160); // Step 3 Actual
  sheet.setColumnWidth(15, 90);  // Step 3 Status
  sheet.setColumnWidth(16, 90);  // Step 3 TimeDelay
  sheet.setColumnWidth(17, 120); // Step 4 Email Status

  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 22);
  sheet.setRowHeight(5, 22);
  sheet.setRowHeight(6, 28);
  sheet.setFrozenRows(6);

  return { status: "success", message: "INV PROCESS FMS headers successfully configured on tab 'INV PROCESS FMS' (Cols A:Q, Data Row 7+)" };
}

function findInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 7) return -1;
  var normCenter = normFmsText(centerName);
  var normMonth = normFmsText(invoiceMonth);
  var normCompany = normFmsText(companyName);

  var values = sheet.getRange(7, 1, lastRow - 6, 3).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    var rCenter = normFmsText(values[i][0]);
    var rMonth = normFmsText(values[i][1]);
    var rCompany = normFmsText(values[i][2]);

    var monthMatch = (!normMonth || rMonth === normMonth || rMonth.indexOf(normMonth) !== -1 || normMonth.indexOf(rMonth) !== -1);
    var compMatch = (rCompany === normCompany || rCompany.indexOf(normCompany) !== -1 || normCompany.indexOf(rCompany) !== -1);

    if (compMatch && monthMatch) {
      return 7 + i;
    }
  }
  return -1;
}

function getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName) {
  var targetRow = findInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
  if (targetRow !== -1) return targetRow;

  var lastRow = Math.max(sheet.getLastRow(), 6);
  for (var r = 7; r <= lastRow + 1; r++) {
    var aVal = String(sheet.getRange(r, 1).getValue() || "").trim();
    var cVal = String(sheet.getRange(r, 3).getValue() || "").trim();
    if (!aVal && !cVal) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) targetRow = lastRow + 1;

  sheet.getRange(targetRow, 1).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(targetRow, 2).setValue(invoiceMonth).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 3).setValue(companyName).setFontWeight("bold");
  sheet.getRange(targetRow, 1, 1, 17).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

  return targetRow;
}

function handleInvoiceWorkflowFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getInvProcessSheet();

  var centerName = String(payload.centerName || "Mercado").trim();
  var invoiceMonth = String(payload.invoiceMonth || "").trim();
  var companyName = String(payload.companyName || "").trim();
  var timestamp = payload.timestamp || payload.actual || getNowTimestampString();

  if (action === "invoice_fms_setup_headers") {
    var res = setupInvoiceWorkflowHeaders();
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── STEP 1 ARRIVAL: Invoice entry arrives in invoice section ──────────────
  if (action === "invoice_fms_arrival") {
    var logTime = payload.logTimestamp || payload.createdAt || payload.planned || timestamp;
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    // Col D (4): Log Timestamp (exact timestamp where invoice entry got generated)
    setDateValue(sheet.getRange(row, 4), parseTimestampToDate(logTime));
    // Clear actuals in Col F (6), Col J (10), Col N (14)
    sheet.getRange(row, 6).clearContent();
    sheet.getRange(row, 10).clearContent();
    sheet.getRange(row, 14).clearContent();
    // Col Q (17): Email status -> Pending
    sheet.getRange(row, 17).setValue("Pending").setHorizontalAlignment("center").setFontWeight("bold");
    // Preserve formula columns: E, G, H, I, K, L, M, O, P untouched!
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Invoice Logged for " + companyName + " in row " + row, row: row,
      logTimestamp: getNowTimestampString(parseTimestampToDate(logTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── STEP 1 ACTUAL: CM sends to accountant ─────────────────────────────────
  else if (action === "invoice_fms_sent_accountant") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    // Col F (6): Actual (when CM sent to accountant)
    setDateValue(sheet.getRange(row, 6), parseTimestampToDate(actualTime));
    // User formula in Col G, H, I calculates Status, TimeDelay, Step 2 Planned automatically
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 1 Sent to Accountant logged in row " + row, row: row,
      sentAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── STEP 2 ACTUAL: Accountant attaches Tally PDF & sends back to CM ────────
  else if (action === "invoice_fms_pdf_attached") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    // Col J (10): Actual (when accountant attached PDF)
    setDateValue(sheet.getRange(row, 10), parseTimestampToDate(actualTime));
    // User formula in Col K, L, M calculates Status, TimeDelay, Step 3 Planned automatically
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 2 Tally PDF Attached logged in row " + row, row: row,
      attachedAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── STEP 3 ACTUAL: CM approves or rejects tally PDF ────────────────────────
  else if (action === "invoice_fms_approved_client") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    // Col N (14): Actual (when CM approved or rejected tally PDF)
    setDateValue(sheet.getRange(row, 14), parseTimestampToDate(actualTime));
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 3 CM Approval logged in row " + row, row: row,
      approvedAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── STEP 4: Website Auto send Email to Client with Attached Invoice ────────
  else if (action === "invoice_fms_email_sent") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var emailStatus = payload.status || "Sent";
    // Col Q (17): Status -> Sent or Pending
    sheet.getRange(row, 17).setValue(emailStatus).setHorizontalAlignment("center").setFontWeight("bold");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Client Email Status set to '" + emailStatus + "' in row " + row, row: row
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_sort_sheet") {
    var sortRes = sortExistingInvProcessSheet();
    return ContentService.createTextOutput(JSON.stringify(sortRes)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── BOOTSTRAP FAST SYNC: Populate All Invoices into INV PROCESS FMS ────────
  else if (action === "invoice_fms_bootstrap_sync") {
    if (payload.setupHeaders || sheet.getLastRow() < 6) {
      setupInvoiceWorkflowHeaders();
    }
    var items = payload.items || [];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Chronologically sort items by invoiceMonth (August 2026 -> September 2026 -> October 2026)
    items.sort(function(a, b) {
      var keyA = parseInvoiceMonthSortKey(a.invoiceMonth || "");
      var keyB = parseInvoiceMonthSortKey(b.invoiceMonth || "");
      if (keyA !== keyB) return keyA - keyB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    var lastExistingRow = sheet.getLastRow();
    if (lastExistingRow >= 7) {
      var clearCount = lastExistingRow - 6;
      // Clear ONLY script-managed columns: Cols A-D, Col F, Col J, Col N, Col Q
      // Leaving user formula columns E, G, H, I, K, L, M, O, P 100% UNTOUCHED!
      sheet.getRange(7, 1, clearCount, 4).clearContent();  // A to D
      sheet.getRange(7, 6, clearCount, 1).clearContent();  // F
      sheet.getRange(7, 10, clearCount, 1).clearContent(); // J
      sheet.getRange(7, 14, clearCount, 1).clearContent(); // N
      sheet.getRange(7, 17, clearCount, 1).clearContent(); // Q
    }

    var dataSetRows = [];
    var step1Actuals = [];
    var step2Actuals = [];
    var step3Actuals = [];
    var emailStatuses = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var center = it.centerName || "Mercado";
      var month = it.invoiceMonth || "";
      var company = it.companyName || "";

      // Log Timestamp: exact timestamp invoice entry arrived / created
      var logTs = it.logTimestamp || it.createdAt || it.step1Planned || "";
      var logDate = logTs ? parseTimestampToDate(logTs) : "";

      // Step 1 Actual: when CM sent to accountant
      var s1Act = it.step1Actual ? parseTimestampToDate(it.step1Actual) : "";

      // Step 2 Actual: when accountant attached PDF
      var s2Act = it.step2Actual ? parseTimestampToDate(it.step2Actual) : "";

      // Step 3 Actual: when CM approved or rejected PDF
      var s3Act = it.step3Actual ? parseTimestampToDate(it.step3Actual) : "";

      // Col Q: Website Auto send Email to Client ("Sent" or "Pending")
      var emailSt = (it.emailStatus === "Sent" || it.clientEmailSentAt) ? "Sent" : "Pending";

      dataSetRows.push([center, month, company, logDate]);
      step1Actuals.push([s1Act]);
      step2Actuals.push([s2Act]);
      step3Actuals.push([s3Act]);
      emailStatuses.push([emailSt]);
    }

    var totalRows = items.length;

    // Completely clear all columns A to Q for any phantom rows beyond active items (e.g. rows 164+)
    if (lastExistingRow > 6 + totalRows) {
      sheet.getRange(7 + totalRows, 1, lastExistingRow - (6 + totalRows), 17).clearContent();
    }

    // 1. Write Data Set (Cols A to D)
    sheet.getRange(7, 1, totalRows, 4).setValues(dataSetRows);
    sheet.getRange(7, 1, totalRows, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange(7, 2, totalRows, 1).setHorizontalAlignment("center");
    sheet.getRange(7, 3, totalRows, 1).setFontWeight("bold");
    sheet.getRange(7, 4, totalRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");

    // 2. Write Step 1 Actual (Col F: Col 6)
    sheet.getRange(7, 6, totalRows, 1).setValues(step1Actuals);
    sheet.getRange(7, 6, totalRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");

    // 3. Write Step 2 Actual (Col J: Col 10)
    sheet.getRange(7, 10, totalRows, 1).setValues(step2Actuals);
    sheet.getRange(7, 10, totalRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");

    // 4. Write Step 3 Actual (Col N: Col 14)
    sheet.getRange(7, 14, totalRows, 1).setValues(step3Actuals);
    sheet.getRange(7, 14, totalRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");

    // 5. Write Website Auto Send Email Status (Col Q: Col 17)
    sheet.getRange(7, 17, totalRows, 1).setValues(emailStatuses);
    sheet.getRange(7, 17, totalRows, 1).setHorizontalAlignment("center").setFontWeight("bold");

    // Formatting
    sheet.getRange(7, 1, totalRows, 17)
         .setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle")
         .setBackground(null).setFontColor(null);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Populated " + totalRows + " invoice workflow records into INV PROCESS FMS (Rows 7 to " + (6 + totalRows) + ")", count: totalRows
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error", message: "Unknown invoice FMS action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 📅 Parse Invoice Month into a numeric sort key (e.g., 'August 2026' -> 202608, 'September 2026' -> 202609, 'October 2026' -> 202610)
 */
function parseInvoiceMonthSortKey(monthStr) {
  if (!monthStr) return 0;
  var clean = String(monthStr).toLowerCase().trim();

  var isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    return parseInt(isoMatch[1], 10) * 100 + parseInt(isoMatch[2], 10);
  }

  var monthMap = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12
  };

  var year = 0;
  var month = 0;
  var parts = clean.split(/[\s,_\-]+/);
  for (var p = 0; p < parts.length; p++) {
    var part = parts[p];
    if (/^\d{4}$/.test(part)) {
      year = parseInt(part, 10);
    } else if (monthMap[part]) {
      month = monthMap[part];
    }
  }

  if (year > 0 && month > 0) {
    return year * 100 + month;
  }
  return 0;
}

/**
 * 🔄 Sort Existing INV PROCESS FMS Tab Chronologically by Month (Rows 7+)
 */
function sortExistingInvProcessSheet() {
  var sheet = getInvProcessSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 7) {
    Logger.log("No data rows to sort in INV PROCESS FMS.");
    return { status: "notice", message: "No data rows to sort" };
  }

  var numRows = lastRow - 6;
  var range = sheet.getRange(7, 1, numRows, 17);
  var values = range.getValues();

  values.sort(function(rowA, rowB) {
    var monthA = String(rowA[1] || "");
    var monthB = String(rowB[1] || "");
    var keyA = parseInvoiceMonthSortKey(monthA);
    var keyB = parseInvoiceMonthSortKey(monthB);
    if (keyA !== keyB) return keyA - keyB;
    return 0;
  });

  range.setValues(values);

  var dateCols = [4, 6, 10, 14];
  for (var dc = 0; dc < dateCols.length; dc++) {
    sheet.getRange(7, dateCols[dc], numRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
  }
  sheet.getRange(7, 1, numRows, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(7, 2, numRows, 1).setHorizontalAlignment("center");
  sheet.getRange(7, 3, numRows, 1).setFontWeight("bold");
  sheet.getRange(7, 17, numRows, 1).setHorizontalAlignment("center").setFontWeight("bold");

  Logger.log("✅ INV PROCESS FMS sorted successfully (" + numRows + " rows)!");
  return { status: "success", message: "Sorted " + numRows + " rows chronologically by month" };
}

function populateInvProcessFms() {
  setupInvoiceWorkflowHeaders();
  var apiUrl = "https://sspacia.com/api/admin/Invoices/fms-sync";
  try {
    var res = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      if (json && json.items && json.items.length > 0) {
        var result = handleInvoiceWorkflowFms({ action: "invoice_fms_bootstrap_sync", items: json.items });
        Logger.log("✅ INV PROCESS FMS Population Complete: " + result.getContent());
        return;
      }
    }
    Logger.log("Notice: API returned HTTP " + res.getResponseCode());
  } catch (e) {
    Logger.log("Notice fetching from API: " + e.toString());
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 3: SUSPENSE ADVANCE PAYMENT FMS (Tab: "SUSPENSE" - Cols A to H)
// ═════════════════════════════════════════════════════════════════════════════
// LAYOUT:
//   Rows 2-5, Cols A-D (Merged): Data Set
//   Rows 2-5, Cols E-H:
//     Row 2: Recognise suspense advance payment receive entry entered by accountant
//     Row 3: Community Managers
//     Row 4: sspacia site - when entry come in suspense section
//     Row 5: 8
//   Row 6: Subheaders:
//     Col A (1): pay receive date
//     Col B (2): suspense payment type
//     Col C (3): center
//     Col D (4): Log TimeStamp (exact timestamp accountant created entry, unmerged)
//     Col E (5): planned (left blank for user formula)
//     Col F (6): actual (exact timestamp when CM yes or no suspense entry)
//     Col G (7): status (left blank for user formula)
//     Col H (8): delay (left blank for user formula)
//   Row 7+: Data rows (3 rows per entry: mercado, premier house, agarwal complex)
//     - Col A & Col B merged across 3 rows
//     - Cols C, D, E, F, G, H NOT merged
// ═════════════════════════════════════════════════════════════════════════════

function setupSuspenseHeaders() {
  var sheet = getSuspenseSheet();

  // Safely break apart existing merges in A1:H6
  try { sheet.getRange("A1:H6").breakApart(); } catch (e) {}

  // ── 1. DATA SET (Cols A to D, Rows 2-5) ──────────────────────────────────
  sheet.getRange("A2:D5").merge()
       .setValue("Data Set")
       .setFontFamily("Roboto")
       .setFontSize(14)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  // ── 2. STEP HEADER (Cols E to H, Rows 2-5) ───────────────────────────────
  sheet.getRange("E2:H2").merge()
       .setValue("Recognise suspense advance payment receive entry entered by accountant")
       .setFontWeight("bold");
  sheet.getRange("E3:H3").merge().setValue("Community Managers");
  sheet.getRange("E4:H4").merge().setValue("sspacia site - when entry come in suspense section");
  sheet.getRange("E5:H5").merge().setValue("8");

  // ── 3. Subheaders (Row 6) ────────────────────────────────────────────────
  var headers = [
    "pay receive date",
    "suspense payment type",
    "center",
    "Log TimeStamp",
    "planned",
    "actual",
    "status",
    "delay"
  ];
  for (var c = 0; c < headers.length; c++) {
    sheet.getRange(6, c + 1).setValue(headers[c]);
  }

  // Format Header Block (A2:H6)
  sheet.getRange("A2:H6")
       .setFontFamily("Roboto")
       .setFontSize(10)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle")
       .setBackground(null)
       .setFontColor(null);
  sheet.getRange("A2:D5").setFontSize(14);
  sheet.getRange("A6:H6").setFontWeight("bold");
  sheet.getRange("A2:H6").setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Column Widths
  sheet.setColumnWidth(1, 120); // pay receive date
  sheet.setColumnWidth(2, 180); // suspense payment type
  sheet.setColumnWidth(3, 130); // center
  sheet.setColumnWidth(4, 160); // Log TimeStamp
  sheet.setColumnWidth(5, 160); // planned
  sheet.setColumnWidth(6, 160); // actual
  sheet.setColumnWidth(7, 90);  // status
  sheet.setColumnWidth(8, 90);  // delay

  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 22);
  sheet.setRowHeight(5, 22);
  sheet.setRowHeight(6, 28);
  sheet.setFrozenRows(6);

  return { status: "success", message: "SUSPENSE headers successfully configured on tab 'SUSPENSE' (Cols A:H, Data Row 7+)" };
}

function handleSuspenseFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getSuspenseSheet();
  var centersList = ["mercado", "premier house", "agarwal complex"];

  if (action === "suspense_setup_headers") {
    var res = setupSuspenseHeaders();
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 1. SUSPENSE PLANNED: Accountant enters suspense record ─────────────────
  else if (action === "suspense_planned") {
    var payReceiveDate = String(payload.payReceiveDate || getTodayDateString()).trim();
    var suspensePaymentType = String(payload.suspensePaymentType || "x payment received").trim();
    var logTs = payload.logTimestamp || payload.createdAt || payload.enteredAt || payload.timestamp || getNowTimestampString();
    var logDate = parseTimestampToDate(logTs);

    var lastRow = Math.max(sheet.getLastRow(), 6);
    var targetStartRow = 7;
    var foundEmptySlot = false;
    for (var r = 7; r <= lastRow + 3; r += 3) {
      var val1 = sheet.getRange(r, 1).getValue();
      var val3 = sheet.getRange(r, 3).getValue();
      if ((!val1 || String(val1).trim() === "") && (!val3 || String(val3).trim() === "")) {
        targetStartRow = r;
        foundEmptySlot = true;
        break;
      }
    }
    if (!foundEmptySlot) {
      targetStartRow = Math.max(lastRow + 1, 7);
      var offset = (targetStartRow - 7) % 3;
      if (offset !== 0) targetStartRow += (3 - offset);
    }

    try { sheet.getRange(targetStartRow, 1, 3, 1).breakApart(); } catch (e) {}
    try { sheet.getRange(targetStartRow, 2, 3, 1).breakApart(); } catch (e) {}

    for (var c = 0; c < 3; c++) {
      var cRow = targetStartRow + c;
      // Col C (3): Center
      sheet.getRange(cRow, 3).setValue(centersList[c])
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      // Col D (4): Log TimeStamp (unmerged, exact timestamp accountant created entry)
      setDateValue(sheet.getRange(cRow, 4), logDate);

      // Col E (5): Planned (Left blank for user formula)
      // Col F (6): Actual (Cleared on new planned entry)
      sheet.getRange(cRow, 6).clearContent();

      // Col G (7): Status (Left blank for user formula)
      // Col H (8): Delay (Left blank for user formula)
    }

    // Col A (1): pay receive date (merged 3 rows)
    sheet.getRange(targetStartRow, 1, 3, 1).merge()
         .setValue(payReceiveDate)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    // Col B (2): suspense payment type (merged 3 rows)
    sheet.getRange(targetStartRow, 2, 3, 1).merge()
         .setValue(suspensePaymentType)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Suspense Planned logged across rows " + targetStartRow + " to " + (targetStartRow + 2),
      rowStart: targetStartRow,
      payReceiveDate: payReceiveDate,
      suspensePaymentType: suspensePaymentType,
      logTimestamp: getNowTimestampString(logDate)
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. SUSPENSE BOOTSTRAP FAST SYNC ───────────────────────────────────────
  else if (action === "suspense_bootstrap_sync") {
    setupSuspenseHeaders();
    var items = payload.items || [];
    if (!items || items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No suspense items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Sort items chronologically by id or payReceiveDate
    items.sort(function(a, b) {
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    var lastExistingRow = sheet.getLastRow();
    if (lastExistingRow >= 7) {
      for (var r = 7; r <= lastExistingRow; r += 3) {
        try { sheet.getRange(r, 1, 3, 1).breakApart(); } catch (e) {}
        try { sheet.getRange(r, 2, 3, 1).breakApart(); } catch (e) {}
      }
      var clearCount = lastExistingRow - 6;
      // Clear data columns A, B, C, D, F (leave E, G, H user formulas untouched)
      sheet.getRange(7, 1, clearCount, 4).clearContent();
      sheet.getRange(7, 6, clearCount, 1).clearContent();
    }

    var startRow = 7;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var rStart = startRow + i * 3;
      var pDate = String(item.payReceiveDate || "").trim();
      var pType = String(item.suspensePaymentType || "x payment received").trim();
      var logTs = item.logTimestamp || item.createdAt || item.enteredAt || item.timestamp || "";
      var logDate = logTs ? parseTimestampToDate(logTs) : new Date();

      try { sheet.getRange(rStart, 1, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(rStart, 2, 3, 1).breakApart(); } catch (e) {}

      for (var c = 0; c < 3; c++) {
        var rowNum = rStart + c;
        var center = centersList[c];

        // Col C (3): Center
        sheet.getRange(rowNum, 3).setValue(center)
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle")
             .setFontFamily("Roboto")
             .setFontSize(10);

        // Col D (4): Log TimeStamp (unmerged, exact timestamp)
        setDateValue(sheet.getRange(rowNum, 4), logDate);

        // Col E (5): Planned (Left blank for user formula)

        // Col F (6): Actual (exact timestamp when CM yes or no suspense entry)
        var alloc = item.allocations ? item.allocations.find(function(a) { return String(a.centerName).toLowerCase().trim() === center; }) : null;
        var actualTs = alloc && (alloc.actualTimestamp || alloc.actual || alloc.reviewedAt);
        if (actualTs) {
          setDateValue(sheet.getRange(rowNum, 6), parseTimestampToDate(actualTs));
        } else {
          sheet.getRange(rowNum, 6).clearContent();
        }

        // Col G (7): Status (Left blank for user formula)
        // Col H (8): Delay (Left blank for user formula)
      }

      // Col A (1): pay receive date (merged 3 rows)
      sheet.getRange(rStart, 1, 3, 1).merge()
           .setValue(pDate)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      // Col B (2): suspense payment type (merged 3 rows)
      sheet.getRange(rStart, 2, 3, 1).merge()
           .setValue(pType)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Populated " + items.length + " suspense records across rows 7 to " + (startRow + items.length * 3 - 1) + " (Cols A:H)",
      count: items.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 3. SUSPENSE ACTUAL: CM Takes Action (Accepts/Rejects for their Center) ─
  else if (action === "suspense_actual") {
    var rawCenter = String(payload.centerName || "").toLowerCase().trim();
    var normCenter = normFmsText(rawCenter);
    var rowStart = payload.rowStart ? Number(payload.rowStart) : -1;
    var targetDate = String(payload.payReceiveDate || "").trim();
    var normTargetDate = normFmsText(targetDate);
    var actualDate = new Date();
    if (payload.actual || payload.actualTimestamp) actualDate = parseTimestampToDate(payload.actual || payload.actualTimestamp);
    var targetRow = -1;

    // 1. If rowStart is known, check within that 3-row block in Col C (Col 3)
    if (rowStart >= 7) {
      for (var k = 0; k < 3; k++) {
        var checkR = rowStart + k;
        var cVal = normFmsText(sheet.getRange(checkR, 3).getValue());
        if (cVal && (cVal === normCenter || normCenter.indexOf(cVal) !== -1 || cVal.indexOf(normCenter) !== -1)) {
          targetRow = checkR;
          break;
        }
      }
    }

    // 2. Search by payReceiveDate block in Col A (Col 1), then match center in Col C (Col 3)
    if (targetRow === -1 && normTargetDate) {
      var lastRow = sheet.getLastRow();
      for (var r = 7; r <= lastRow; r += 3) {
        var bDate = normFmsText(sheet.getRange(r, 1).getDisplayValue());
        if (bDate && (bDate === normTargetDate || bDate.indexOf(normTargetDate) !== -1 || normTargetDate.indexOf(bDate) !== -1)) {
          for (var c = 0; c < 3; c++) {
            var checkR = r + c;
            var cVal = normFmsText(sheet.getRange(checkR, 3).getValue());
            if (cVal && (cVal === normCenter || normCenter.indexOf(cVal) !== -1 || cVal.indexOf(normCenter) !== -1)) {
              targetRow = checkR;
              break;
            }
          }
          if (targetRow !== -1) break;
        }
      }
    }

    // 3. Fallback: match by non-empty center name alone, prioritizing empty Col F (Actual)
    if (targetRow === -1 && normCenter) {
      var lastRow = sheet.getLastRow();
      for (var r = lastRow; r >= 7; r--) {
        var cVal = normFmsText(sheet.getRange(r, 3).getValue());
        if (cVal && (cVal === normCenter || normCenter.indexOf(cVal) !== -1 || cVal.indexOf(normCenter) !== -1)) {
          var existingActual = sheet.getRange(r, 6).getValue();
          if (!existingActual) {
            targetRow = r;
            break;
          } else if (targetRow === -1) {
            targetRow = r;
          }
        }
      }
    }

    if (targetRow !== -1) {
      // Col F (6): Exact timestamp when CM takes action
      setDateValue(sheet.getRange(targetRow, 6), actualDate);
      // Col G (7) & Col H (8) left untouched for user formulas
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Suspense Actual logged for " + rawCenter + " in row " + targetRow,
        row: targetRow,
        center: rawCenter,
        actual: getNowTimestampString(actualDate)
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "notice",
        message: "Could not find matching row for center: " + rawCenter
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── 4. SUSPENSE UPDATE: Edit existing entry ────────────────────────────────
  else if (action === "suspense_update" || action === "suspense_edit") {
    var updateRowStart = payload.rowStart ? Number(payload.rowStart) : -1;
    var updatedDate = payload.payReceiveDate ? String(payload.payReceiveDate).trim() : null;
    var updatedType = payload.suspensePaymentType ? String(payload.suspensePaymentType).trim() : null;
    var updatedLogTs = payload.logTimestamp || payload.createdAt || payload.enteredAt;

    if (updateRowStart >= 7) {
      if (updatedDate) sheet.getRange(updateRowStart, 1, 3, 1).setValue(updatedDate);
      if (updatedType) sheet.getRange(updateRowStart, 2, 3, 1).setValue(updatedType);
      if (updatedLogTs) {
        var logD = parseTimestampToDate(updatedLogTs);
        for (var c = 0; c < 3; c++) {
          setDateValue(sheet.getRange(updateRowStart + c, 4), logD);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Suspense Entry updated in rows " + updateRowStart + " to " + (updateRowStart + 2),
        rowStart: updateRowStart
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return handleSuspenseFms({
        action: "suspense_planned",
        payReceiveDate: updatedDate,
        suspensePaymentType: updatedType,
        logTimestamp: updatedLogTs
      });
    }
  }

  // ── 5. SUSPENSE DELETE: Remove entry ───────────────────────────────────────
  else if (action === "suspense_delete") {
    var targetRow = -1;
    if (payload.rowStart && Number(payload.rowStart) >= 7) {
      targetRow = Number(payload.rowStart);
    } else {
      var searchDate = payload.payReceiveDate ? String(payload.payReceiveDate).trim() : "";
      var searchType = payload.suspensePaymentType ? String(payload.suspensePaymentType).trim().toLowerCase() : "";
      var lastRow = sheet.getLastRow();
      for (var r = 7; r <= lastRow; r += 3) {
        var cellDate = String(sheet.getRange(r, 1).getDisplayValue() || "").trim();
        var cellType = String(sheet.getRange(r, 2).getDisplayValue() || "").trim().toLowerCase();
        if (cellDate === searchDate && (searchType === "" || cellType === searchType)) {
          targetRow = r;
          break;
        }
      }
    }
    if (targetRow >= 7) {
      try { sheet.getRange(targetRow, 1, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(targetRow, 2, 3, 1).breakApart(); } catch (e) {}
      var rangeToClear = sheet.getRange(targetRow, 1, 3, 8);
      rangeToClear.clearContent();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "suspense_delete",
        message: "Suspense entry cleared from rows " + targetRow + "-" + (targetRow + 2),
        rowStart: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "suspense_delete",
        message: "Entry not found or already removed",
        rowStart: null
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
}

/**
 * 🚀 MASTER RUNNER: Populate All Database Suspense Payments into "SUSPENSE" Tab
 */
function populateSuspenseFms() {
  setupSuspenseHeaders();
  var urls = [
    "https://sspacia.com/api/admin/suspense"
  ];
  for (var u = 0; u < urls.length; u++) {
    try {
      var res = UrlFetchApp.fetch(urls[u], { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        var json = JSON.parse(res.getContentText());
        var items = (json && (json.data || json.payments || json.items)) || [];
        if (items && items.length > 0) {
          var result = handleSuspenseFms({ action: "suspense_bootstrap_sync", items: items });
          Logger.log("✅ SUSPENSE FMS Population Complete: " + result.getContent());
          return;
        }
      }
      Logger.log("Notice: API " + urls[u] + " returned HTTP " + res.getResponseCode());
    } catch (e) {
      Logger.log("Notice fetching suspense from " + urls[u] + ": " + e.toString());
    }
  }
}



// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 4: ACCOUNTS FMS (Tab: "Accounts")
// ═════════════════════════════════════════════════════════════════════════════

function handleAccountsFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getAccountsSheet();

  if (action === "accounts_daily_fms_check" || action === "accounts_daily_check") {
    var actualDate = new Date();
    if (payload.actual || payload.actualTimestamp) actualDate = parseTimestampToDate(payload.actual || payload.actualTimestamp);
    var checkDate = new Date();
    if (payload.date) {
      var dateParts = String(payload.date).split("-");
      if (dateParts.length === 3) checkDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
    }
    var targetDay = payload.targetDay || checkDate.getDate();
    var targetMonth = payload.targetMonth || (checkDate.getMonth() + 1);
    var targetYear = payload.targetYear || checkDate.getFullYear();
    var lastRow = Math.max(sheet.getLastRow(), 6);
    var targetRow = -1;
    if (lastRow >= 6) {
      var qRange = sheet.getRange(6, 17, lastRow - 5, 1);
      var qValues = qRange.getValues();
      var qDisplayVals = qRange.getDisplayValues();
      for (var i = 0; i < qValues.length; i++) {
        var rawVal = qValues[i][0]; var dispVal = String(qDisplayVals[i][0] || "").trim();
        var qDay = null, qMonth = null, qYear = null;
        if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
          qDay = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "d"));
          qMonth = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "M"));
          qYear = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "yyyy"));
        } else if (dispVal) {
          var match = dispVal.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
          if (match) {
            var p1 = parseInt(match[1], 10), p2 = parseInt(match[2], 10), p3 = parseInt(match[3], 10);
            if (p1 > 1000) { qYear = p1; qMonth = p2; qDay = p3; }
            else if (p3 > 1000) { qYear = p3; if (p1 > 12) { qDay = p1; qMonth = p2; } else if (p2 > 12) { qMonth = p1; qDay = p2; } else { qDay = p1; qMonth = p2; } }
          }
        }
        if (qDay === targetDay && qMonth === targetMonth && qYear === targetYear) { targetRow = 6 + i; break; }
      }
    }
    if (targetRow === -1) {
      for (var r = 6; r <= lastRow + 1; r++) {
        var qValCheck = sheet.getRange(r, 17).getValue();
        if (!qValCheck || String(qValCheck).trim() === "") { targetRow = r; break; }
      }
      if (targetRow === -1) targetRow = lastRow + 1;
      var plannedDate = new Date(targetYear, targetMonth - 1, targetDay, 10, 30, 0);
      setDateValue(sheet.getRange(targetRow, 17), plannedDate);
    }
    setDateValue(sheet.getRange(targetRow, 18), actualDate);
    setPlainStatus(sheet.getRange(targetRow, 19), "Done");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Daily FMS check logged in row " + targetRow, row: targetRow, col: 18,
      matchedDate: targetDay + "/" + targetMonth + "/" + targetYear, actual: getNowTimestampString(actualDate), statusValue: "Done"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "accounts_repopulate_daily") {
    sheet.getRange("Q1:T1").merge().setValue("daily select atleast yes or no before 10:30 AM").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#1565C0").setFontColor("#ffffff").setFontSize(10);
    sheet.getRange("Q2:T2").merge().setValue("from sspacia site - Invoice Payment Receive Management").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#BBDEFB").setFontColor("#0D47A1").setFontSize(10);
    sheet.getRange("Q3:T3").merge().setValue("dipendra").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f8fafc").setFontSize(10);
    sheet.getRange("Q4:T4").merge().setValue("daily").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f8fafc").setFontSize(10);
    var colHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
    for (var h = 0; h < 4; h++) {
      sheet.getRange(5, 17 + h).setValue(colHeaders[h]).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#E0E0E0").setFontColor("#212121").setFontSize(10);
    }
    var dailyChecks = payload.dailyChecks || [];
    var checksMap = {};
    for (var i = 0; i < dailyChecks.length; i++) {
      if (dailyChecks[i].date && dailyChecks[i].timestamp) checksMap[dailyChecks[i].date] = dailyChecks[i].timestamp;
    }
    var plannedDates = payload.plannedDates || [];
    var now = new Date();
    var lastRow = Math.max(sheet.getLastRow(), 25);
    var count = Math.max(plannedDates.length, lastRow - 5);
    for (var idx = 0; idx < count; idx++) {
      var r = 6 + idx; var planStr = ""; var dateKey = "";
      if (idx < plannedDates.length) {
        planStr = plannedDates[idx].planned; dateKey = plannedDates[idx].date;
        setDateValue(sheet.getRange(r, 17), planStr);
      } else {
        planStr = String(sheet.getRange(r, 17).getDisplayValue() || "").trim();
        var match = planStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) { var d = Number(match[1]), m = Number(match[2]), y = Number(match[3]); dateKey = y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d; }
      }
      if (!planStr) continue;
      var actualVal = checksMap[dateKey] || "";
      if (!actualVal && idx < plannedDates.length && plannedDates[idx].actual) actualVal = plannedDates[idx].actual;
      if (!actualVal) actualVal = String(sheet.getRange(r, 18).getDisplayValue() || "").trim();
      var rCell = sheet.getRange(r, 18);
      if (actualVal) { setDateValue(rCell, actualVal); } else { rCell.clearContent().setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10); }
      var sCell = sheet.getRange(r, 19);
      if (actualVal) { setPlainStatus(sCell, "Done"); } else {
        var isPast = false;
        var pMatch = planStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
        if (pMatch) { var pDateObj = new Date(Number(pMatch[3]), Number(pMatch[2]) - 1, Number(pMatch[1]), Number(pMatch[4]), Number(pMatch[5]), Number(pMatch[6])); if (pDateObj < now) isPast = true; }
        if (isPast) { setPlainStatus(sCell, "Pending"); } else { sCell.setValue("").setBackground(null).setFontColor(null); }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "accounts_repopulate_daily", message: "Daily FMS checks repopulated for rows 6 to " + (5 + count) })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "accounts_old_actual") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var actualDate = new Date();
    if (payload.actual) actualDate = parseTimestampToDate(payload.actual);
    var targetNormMonth = normFmsText(invoiceMonth);
    var targetNormComp = normFmsText(companyName);
    var lastRow = sheet.getLastRow();
    var targetRow = -1;
    if (lastRow >= 6) {
      var dispVals = sheet.getRange(6, 9, lastRow - 5, 6).getDisplayValues();
      for (var i = 0; i < dispVals.length; i++) {
        var rMonthDisp = normFmsText(dispVals[i][0]);
        var rCompDisp = normFmsText(dispVals[i][1]);
        var rStatusDisp = String(dispVals[i][5] || "").trim().toLowerCase();
        var monthMatch = (rMonthDisp === targetNormMonth || rMonthDisp.indexOf(targetNormMonth) !== -1 || targetNormMonth.indexOf(rMonthDisp) !== -1);
        var compMatch = (rCompDisp === targetNormComp || rCompDisp.indexOf(targetNormComp) !== -1 || targetNormComp.indexOf(rCompDisp) !== -1);
        if (monthMatch && compMatch) { if (rStatusDisp !== "done") { targetRow = 6 + i; break; } else if (targetRow === -1) { targetRow = 6 + i; } }
      }
    }
    if (targetRow !== -1) {
      setDateValue(sheet.getRange(targetRow, 13), actualDate);
      setPlainStatus(sheet.getRange(targetRow, 14), "Done");
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Old Invoice Actual logged in row " + targetRow, row: targetRow, actual: getNowTimestampString(actualDate) })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: "notice", message: "Old invoice entry not found for " + companyName + " (" + invoiceMonth + ")" })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  else if (action === "accounts_bootstrap_sync") {
    var oldItems = payload.oldItems || [];
    if (oldItems.length > 0) {
      var oldRows = [];
      for (var b = 0; b < oldItems.length; b++) {
        var oItem = oldItems[b];
        var isOldDone = oItem.status === "Done" || Boolean(oItem.actual);
        var oldPlanned = oItem.planned ? parseTimestampToDate(oItem.planned) : "";
        var oldActual = oItem.actual ? parseTimestampToDate(oItem.actual) : "";
        oldRows.push([oItem.invoiceMonth || "", oItem.companyName || "", oItem.invoiceLink || "", oldPlanned, oldActual, isOldDone ? "Done" : "Pending", ""]);
      }
      sheet.getRange(6, 9, oldRows.length, 7).setValues(oldRows);
      sheet.getRange(6, 9, oldRows.length, 7).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle").setBackground(null).setFontColor(null);
      sheet.getRange(6, 9, oldRows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(6, 10, oldRows.length, 1).setFontWeight("bold");
      sheet.getRange(6, 12, oldRows.length, 2).setHorizontalAlignment("center").setNumberFormat("dd/MM/yyyy HH:mm:ss");
      for (var n = 0; n < oldRows.length; n++) { setPlainStatus(sheet.getRange(6 + n, 14), oldRows[n][5]); }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Accounts tab bootstrapped", oldCount: oldItems.length })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "notice", message: "Action handled or bypassed: " + action })).setMimeType(ContentService.MimeType.JSON);
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 5: HR CAREER APPLICATIONS + RESUME CV LINK (Tab: "HR")
// ═════════════════════════════════════════════════════════════════════════════

function getHrSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.HR_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(CONFIG.HR_SHEET_NAME); }
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() < 12) {
    var headers = ["Date & Time (IST)", "Candidate Name", "Email Address", "Mobile Number", "Age", "Gender", "Educational Qualification", "Experience", "Applied Position", "Address / Location", "Resume / CV Link", "Status"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#006064").setFontColor("#ffffff").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(1, 32); sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleHrApplication(payload) {
  payload = payload || {};
  var sheet = getHrSheet();
  var tsDate = new Date();
  if (payload.timestamp) tsDate = parseTimestampToDate(payload.timestamp);
  var fullName = String(payload.fullName || payload.candidateName || "").trim();
  var email = String(payload.email || "N/A").trim();
  var mobileNo = String(payload.mobileNo || payload.phone || "").trim();
  var age = payload.age || "";
  var gender = String(payload.gender || "N/A").trim();
  var qualification = String(payload.qualification || "").trim();
  var experience = String(payload.experience || "").trim();
  var appliedPosition = String(payload.appliedPosition || payload.position || "").trim();
  var address = String(payload.address || "N/A").trim();
  var cvUrl = String(payload.cvUrl || payload.resumeUrl || payload.resume || "N/A").trim();
  var status = String(payload.status || "APPLIED").trim();
  var nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1, 1, 12).setValues([[tsDate, fullName, email, mobileNo, age, gender, qualification, experience, appliedPosition, address, cvUrl, status]]);
  sheet.getRange(nextRow, 1, 1, 12).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(nextRow, 1).setHorizontalAlignment("center").setNumberFormat("dd/MM/yyyy HH:mm:ss");
  sheet.getRange(nextRow, 2).setFontWeight("bold");
  sheet.getRange(nextRow, 4).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 5).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 6).setHorizontalAlignment("center");
  setPlainStatus(sheet.getRange(nextRow, 12), status);
  return ContentService.createTextOutput(JSON.stringify({
    status: "success", message: "Candidate application added to HR tab", row: nextRow,
    candidateName: fullName, position: appliedPosition, cvSaved: cvUrl !== "N/A"
  })).setMimeType(ContentService.MimeType.JSON);
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 6: PURCHASE FMS (Tab: "sspacia-purchase")
// ═════════════════════════════════════════════════════════════════════════════

function getPurchaseSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.PURCHASE_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(CONFIG.PURCHASE_SHEET_NAME); }
  if (sheet.getLastRow() < 5) {
    var headers = ["Item Description", "Planned", "Actual", "Status", "Delay"];
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(5, 1, 1, headers.length).setFontWeight("bold").setBackground("#006064").setFontColor("#ffffff").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(5, 28);
  }
  return sheet;
}

function handlePurchaseFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getPurchaseSheet();
  if (action === "purchase_planned") {
    var itemDesc = String(payload.itemDescription || (payload.itemName + " (" + payload.centerName + ") - " + (payload.reorderQty || "3x") + " units")).trim();
    var plannedDate = new Date();
    if (payload.plannedTimestamp || payload.timestamp) plannedDate = parseTimestampToDate(payload.plannedTimestamp || payload.timestamp);
    var nextRow = Math.max(sheet.getLastRow() + 1, 6);
    sheet.getRange(nextRow, 1, 1, 4).setValues([[itemDesc, plannedDate, "", "Pending"]]);
    sheet.getRange(nextRow, 1, 1, 4).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(nextRow, 1).setFontWeight("bold");
    sheet.getRange(nextRow, 2).setHorizontalAlignment("center").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    sheet.getRange(nextRow, 3).setHorizontalAlignment("center");
    setPlainStatus(sheet.getRange(nextRow, 4), "Pending");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Purchase Planned logged", row: nextRow, itemDescription: itemDesc, planned: getNowTimestampString(plannedDate)
    })).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === "purchase_actual") {
    var itemName = String(payload.itemName || "").trim().toLowerCase();
    var actualDate = new Date();
    if (payload.actualTimestamp || payload.timestamp) actualDate = parseTimestampToDate(payload.actualTimestamp || payload.timestamp);
    var lastRow = sheet.getLastRow();
    var targetRow = -1;
    if (lastRow >= 6) {
      var range = sheet.getRange(6, 1, lastRow - 5, 4);
      var values = range.getValues();
      for (var i = values.length - 1; i >= 0; i--) {
        var rowDesc = String(values[i][0] || "").toLowerCase();
        var rowStatus = String(values[i][3] || "").trim().toLowerCase();
        if (rowStatus === "pending") { if (!itemName || rowDesc.indexOf(itemName) !== -1) { targetRow = 6 + i; break; } }
      }
    }
    if (targetRow === -1) {
      targetRow = Math.max(sheet.getLastRow() + 1, 6);
      sheet.getRange(targetRow, 1).setValue((payload.itemName || "Consumable Item") + " (" + (payload.centerName || "Centre") + ")").setFontWeight("bold");
      setDateValue(sheet.getRange(targetRow, 2), actualDate);
    }
    setDateValue(sheet.getRange(targetRow, 3), actualDate);
    setPlainStatus(sheet.getRange(targetRow, 4), "Done");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Purchase Actual recorded", row: targetRow, actual: getNowTimestampString(actualDate), statusValue: "Done"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown purchase action: " + action })).setMimeType(ContentService.MimeType.JSON);
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 7: BOOK A WORKSPACE TOUR
// ═════════════════════════════════════════════════════════════════════════════

function handleBookATour(payload) {
  payload = payload || {};
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.TOUR_SHEET_NAME);
  if (!sheet) { sheet = ss.insertSheet(CONFIG.TOUR_SHEET_NAME); }
  if (sheet.getLastRow() === 0) {
    var headers = ["Full Name", "Mobile Number (+91)", "Email Address", "Preferred Office Location", "Preferred Visit Date", "Submitted At"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1ab0bc").setFontColor("#ffffff").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setRowHeight(1, 32); sheet.setFrozenRows(1);
  }
  var name = String(payload.username || payload.name || "Test Visitor").trim();
  var mobileNo = String(payload.mobileNo || payload.phone || "+91 76003 93779").trim();
  var email = String(payload.email || "sales@sspacia.com").trim();
  var locationName = String(payload.locationName || payload.location || "Premier House (SG Highway)").trim();
  var preferredDate = String(payload.preferredDate || payload.date || "Not Specified").trim();
  var submittedDate = new Date();
  if (payload.timestamp) submittedDate = parseTimestampToDate(payload.timestamp);
  var submittedAtStr = getNowTimestampString(submittedDate);
  var nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1, 1, 6).setValues([[name, mobileNo, email, locationName, preferredDate, submittedDate]]);
  sheet.getRange(nextRow, 1, 1, 6).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(nextRow, 1).setFontWeight("bold");
  sheet.getRange(nextRow, 2).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 5).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 6).setHorizontalAlignment("center").setNumberFormat("dd/MM/yyyy HH:mm:ss");
  try {
    var emailSubject = "🚀 New Workspace Tour Booking: " + name + " (" + locationName + ")";
    var emailHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;"><div style="background-color: #1ab0bc; padding: 20px; text-align: center; color: #ffffff;"><h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">SSPACIA COWORKING</h2><p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">New Workspace Tour Request Received</p></div><div style="padding: 24px; color: #1e293b; line-height: 1.6;"><p style="font-size: 15px; margin-top: 0;">Hello Sales Team,</p><p style="font-size: 14px;">A new visitor has just requested a coworking space tour on the SSPACIA website:</p><table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;"><tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; width: 40%; color: #475569;">👤 Full Name:</td><td style="padding: 12px; font-weight: bold; color: #0f172a;">' + name + '</td></tr><tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">📱 Mobile Number:</td><td style="padding: 12px;"><a href="tel:' + mobileNo + '" style="color: #1ab0bc; text-decoration: none; font-weight: bold;">' + mobileNo + '</a></td></tr><tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">✉️ Email Address:</td><td style="padding: 12px;"><a href="mailto:' + email + '" style="color: #1ab0bc; text-decoration: none;">' + email + '</a></td></tr><tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">🏢 Preferred Center:</td><td style="padding: 12px; font-weight: bold; color: #0f172a;">' + locationName + '</td></tr><tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #166534; background-color: #dcfce7;">' + preferredDate + '</td></tr><tr><td style="padding: 12px; font-weight: bold; color: #475569;">⏰ Requested At:</td><td style="padding: 12px; color: #64748b;">' + submittedAtStr + '</td></tr></table><div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; font-size: 13px; color: #166534; margin-top: 20px;">⚡ Please call the customer at <strong>' + mobileNo + '</strong> to confirm the tour timing.</div></div><div style="background-color: #f8fafc; padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">SSPACIA Coworking Solutions Ltd. • Ahmedabad</div></div>';
    GmailApp.sendEmail(CONFIG.SALES_EMAIL, emailSubject, "New Workspace Tour Booking for " + name, { htmlBody: emailHtml, replyTo: email || undefined, name: "SSPACIA Website" });
  } catch (mailErr) { Logger.log("❌ Email error: " + mailErr.toString()); }
  return { status: "success", message: "Tour lead saved and email dispatched", row: nextRow };
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 MODULE 8: SCOT SSPACIA (Dedicated Spreadsheet)
// ═════════════════════════════════════════════════════════════════════════════

var SCOT_SHADE_SCHEDULED = '#ffd966';
var SCOT_SHADE_DONE = '#93c47d';
var SCOT_SHADE_NONE = '#ffffff';
var SCOT_DONE_MARK = 'Y';
var SCOT_MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function getScotSheet() {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SCOT_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CONFIG.SCOT_SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(CONFIG.SCOT_SHEET_NAME);
    return sheet;
  } catch (e) {
    Logger.log("Notice opening SCOT spreadsheet: " + e.toString());
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    return activeSs.getSheetByName(CONFIG.SCOT_SHEET_NAME) || activeSs.getActiveSheet();
  }
}

function scotMondayOf(date) { var day = date.getDay(); var shift = (day === 0) ? -6 : 1 - day; return new Date(date.getFullYear(), date.getMonth(), date.getDate() + shift); }
function scotAddDays(date, days) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days); }
function scotDateKey(date) { return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(); }
function scotWeekLabel(monday) { var ordinal = Math.floor((monday.getDate() - 1) / 7) + 1; return SCOT_MONTH_NAMES[monday.getMonth()] + '- WEEK-' + ordinal; }
function scotCurrentWeekWindow() { var start = scotAddDays(scotMondayOf(new Date()), -7); var dates = []; for (var i = 0; i < CONFIG.SCOT_WEEK_COUNT * CONFIG.SCOT_DAYS_PER_WEEK; i++) { dates.push(scotAddDays(start, i)); } return dates; }

function setupScotHeaders() {
  var sheet = getScotSheet();
  var callCols = [];
  for (var i = 1; i <= CONFIG.SCOT_CALL_DATE_COUNT; i++) callCols.push("Date for calling " + i);
  var groups = [
    { title: "Client Details", span: 5, bg: "#0f766e", color: "#ffffff" },
    { title: "Contract & Space Profile", span: 6, bg: "#334155", color: "#ffffff" },
    { title: "Calling Schedule Log", span: CONFIG.SCOT_CALL_DATE_COUNT + 1, bg: "#fef08a", color: "#713f12" },
    { title: "Past Week", span: 7, bg: "#e2e8f0", color: "#0f172a" },
    { title: "Current Week", span: 7, bg: "#bbf7d0", color: "#14532d" },
    { title: "Future Week", span: 7, bg: "#bae6fd", color: "#0369a1" }
  ];
  var subHeaders = ["Center", "Company Name", "Contact Person", "Designation", "Mobile No", "Cabin / Seats", "Monthly Rent (₹)", "Agreement End Date", "Lock-in End Date", "Due Day", "Status"].concat(callCols).concat(["Frequency Of Calling (days)"]);
  var weekDates = scotCurrentWeekWindow();
  var totalCols = subHeaders.length + weekDates.length;
  if (sheet.getMaxColumns() < totalCols) sheet.insertColumnsAfter(sheet.getMaxColumns(), totalCols - sheet.getMaxColumns());
  try { sheet.getRange(1, 1, 1, totalCols).breakApart(); } catch (e) {}
  var colIdx = 1;
  for (var g = 0; g < groups.length; g++) {
    var grp = groups[g];
    sheet.getRange(1, colIdx, 1, grp.span).merge().setValue(grp.title).setBackground(grp.bg).setFontColor(grp.color).setFontFamily("Roboto").setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
    colIdx += grp.span;
  }
  sheet.getRange(2, 1, 1, subHeaders.length).setValues([subHeaders]).setFontFamily("Roboto").setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true).setBackground("#ffffff").setFontColor("#000000");
  sheet.getRange(2, subHeaders.length + 1, 1, weekDates.length).setValues([weekDates]).setNumberFormat("dd").setFontFamily("Roboto").setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#ffffff").setFontColor("#000000");
  sheet.setRowHeight(1, 28); sheet.setRowHeight(2, 45); sheet.setFrozenRows(2); sheet.setFrozenColumns(2);
  sheet.setColumnWidth(1, 120); sheet.setColumnWidth(2, 200); sheet.setColumnWidth(3, 150); sheet.setColumnWidth(4, 140); sheet.setColumnWidth(5, 120); sheet.setColumnWidth(6, 160); sheet.setColumnWidth(7, 120); sheet.setColumnWidth(8, 120); sheet.setColumnWidth(9, 120); sheet.setColumnWidth(10, 80); sheet.setColumnWidth(11, 80);
  for (var c = 12; c <= 11 + CONFIG.SCOT_CALL_DATE_COUNT; c++) sheet.setColumnWidth(c, 100);
  sheet.setColumnWidth(12 + CONFIG.SCOT_CALL_DATE_COUNT, 110);
  for (var w = 13 + CONFIG.SCOT_CALL_DATE_COUNT; w <= totalCols; w++) sheet.setColumnWidth(w, 42);
  sheet.getRange(1, 1, 2, totalCols).setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  return { status: "success", message: "SCOT Headers successfully created" };
}

function syncScotClients(providedItems) {
  setupScotHeaders();
  var sheet = getScotSheet();
  var clients = providedItems || [];
  if (!clients.length) {
    try {
      var res = UrlFetchApp.fetch(CONFIG.SCOT_API_URL, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) { var json = JSON.parse(res.getContentText()); if (json && json.items && json.items.length) { clients = json.items; } }
    } catch (e) { Logger.log("Error fetching clients: " + e.toString()); }
  }
  if (!clients.length) return { status: "notice", message: "No active clients found to sync." };
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= 3) { var bVals = sheet.getRange(3, 2, lastRow - 2, 1).getValues(); for (var r = 0; r < bVals.length; r++) { var nameKey = normFmsText(bVals[r][0]); if (nameKey) existing[nameKey] = 3 + r; } }
  var callDateFirstCol = 12;
  var callDateLastCol = 11 + CONFIG.SCOT_CALL_DATE_COUNT;
  var freqCol = callDateLastCol + 1;
  var weekStripFirstCol = freqCol + 1;
  var totalCols = weekStripFirstCol + (CONFIG.SCOT_WEEK_COUNT * CONFIG.SCOT_DAYS_PER_WEEK) - 1;
  var blockRows = [];
  var currentRow = 3;
  for (var i = 0; i < clients.length; i++) {
    var c = clients[i];
    var cKey = normFmsText(c.companyName);
    var blockStart = existing[cKey];
    if (!blockStart) {
      var targetR = Math.max(sheet.getLastRow() + 1, currentRow);
      var offset = (targetR - 3) % CONFIG.SCOT_CONTACTS_PER_CLIENT;
      if (offset !== 0) targetR += (CONFIG.SCOT_CONTACTS_PER_CLIENT - offset);
      blockStart = targetR; existing[cKey] = blockStart;
    }
    var neededRows = blockStart + CONFIG.SCOT_CONTACTS_PER_CLIENT - 1;
    if (sheet.getMaxRows() < neededRows) sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
    sheet.getRange(blockStart, 1, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.center || "Mercado").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
    sheet.getRange(blockStart, 2, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.companyName).setFontWeight("bold").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
    var contacts = c.contacts || [];
    for (var k = 0; k < CONFIG.SCOT_CONTACTS_PER_CLIENT; k++) {
      var cp = contacts[k] || {};
      var rowNum = blockStart + k;
      if (cp.name) sheet.getRange(rowNum, 3).setValue(cp.name);
      if (cp.designation) sheet.getRange(rowNum, 4).setValue(cp.designation);
      if (cp.mobileNo) sheet.getRange(rowNum, 5).setValue(cp.mobileNo);
    }
    sheet.getRange(blockStart, 6, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.cabinSeats || "").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(blockStart, 7, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.monthlyRent || "").setNumberFormat("₹#,##0").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(blockStart, 8, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.agreementEndDate || "").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(blockStart, 9, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.lockinEndDate || "").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(blockStart, 10, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.paymentDueDay || "").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.getRange(blockStart, 11, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setValue(c.status || "Active").setHorizontalAlignment("center").setVerticalAlignment("middle");
    for (var col = callDateFirstCol; col <= freqCol; col++) { sheet.getRange(blockStart, col, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setHorizontalAlignment("center").setVerticalAlignment("middle"); }
    for (var wCol = weekStripFirstCol; wCol <= totalCols; wCol++) { sheet.getRange(blockStart, wCol, CONFIG.SCOT_CONTACTS_PER_CLIENT, 1).breakApart().merge().setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold"); }
    var fullBlock = sheet.getRange(blockStart, 1, CONFIG.SCOT_CONTACTS_PER_CLIENT, totalCols);
    fullBlock.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
    fullBlock.setBorder(true, true, true, true, null, null, "#000000", SpreadsheetApp.BorderStyle.SOLID);
    blockRows.push(blockStart);
    currentRow = blockStart + CONFIG.SCOT_CONTACTS_PER_CLIENT;
  }
  var dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build();
  sheet.getRange(3, callDateFirstCol, sheet.getMaxRows() - 2, CONFIG.SCOT_CALL_DATE_COUNT).setDataValidation(dateRule).setNumberFormat("dd/MM/yyyy");
  revealScotCallDateColumns(sheet);
  buildScotWeekStrip(sheet, blockRows);
  applyScotCallHighlights(sheet, blockRows);
  try { installScotEditTrigger(); } catch (trigErr) {}
  return { status: "success", message: "Successfully synced " + clients.length + " clients into SCOT sheet", count: clients.length };
}

function revealScotCallDateColumns(sheet) {
  var lastRow = sheet.getLastRow(); var used = 0;
  var callDateFirstCol = 12; var count = CONFIG.SCOT_CALL_DATE_COUNT;
  if (lastRow >= 3) { var vals = sheet.getRange(3, callDateFirstCol, lastRow - 2, count).getValues(); for (var r = 0; r < vals.length; r++) { for (var c = 0; c < count; c++) { if (vals[r][c] !== "" && vals[r][c] !== null && (c + 1 > used)) used = c + 1; } } }
  var visible = Math.min(used + 1, count);
  sheet.showColumns(callDateFirstCol, visible);
  if (visible < count) sheet.hideColumns(callDateFirstCol + visible, count - visible);
  sheet.showColumns(callDateFirstCol + count, 1);
}

function buildScotWeekStrip(sheet, blockRows) {
  if (!blockRows || !blockRows.length) return;
  var firstBlock = Math.min.apply(null, blockRows);
  var lastBlock = Math.max.apply(null, blockRows);
  var numRows = lastBlock + CONFIG.SCOT_CONTACTS_PER_CLIENT - firstBlock;
  var firstCol = 12 + CONFIG.SCOT_CALL_DATE_COUNT + 1;
  var numCols = CONFIG.SCOT_WEEK_COUNT * CONFIG.SCOT_DAYS_PER_WEEK;
  var oldHeader = sheet.getRange(2, firstCol, 1, numCols).getValues()[0];
  var oldValues = sheet.getRange(firstBlock, firstCol, numRows, numCols).getValues();
  var saved = {};
  for (var c = 0; c < numCols; c++) { var hVal = oldHeader[c]; if (hVal instanceof Date) { var key = scotDateKey(hVal); var colData = []; var hasData = false; for (var r = 0; r < numRows; r++) { colData.push(oldValues[r][c]); if (oldValues[r][c] !== "" && oldValues[r][c] !== null) hasData = true; } if (hasData) saved[key] = colData; } }
  var dates = scotCurrentWeekWindow();
  for (var w = 0; w < CONFIG.SCOT_WEEK_COUNT; w++) { var monday = dates[w * CONFIG.SCOT_DAYS_PER_WEEK]; var grpCol = firstCol + w * CONFIG.SCOT_DAYS_PER_WEEK; sheet.getRange(1, grpCol).setValue(scotWeekLabel(monday)); }
  sheet.getRange(2, firstCol, 1, numCols).setValues([dates]).setNumberFormat("dd").setFontFamily("Roboto").setFontSize(10).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  var restored = [];
  for (var r2 = 0; r2 < numRows; r2++) restored.push(new Array(numCols).fill(""));
  for (var d = 0; d < dates.length; d++) { var dKey = scotDateKey(dates[d]); if (saved[dKey]) { for (var r3 = 0; r3 < numRows; r3++) restored[r3][d] = saved[dKey][r3]; } }
  sheet.getRange(firstBlock, firstCol, numRows, numCols).setValues(restored);
}

function applyScotCallHighlights(sheet, blockRows) {
  if (!blockRows || !blockRows.length) return;
  var firstBlock = Math.min.apply(null, blockRows);
  var lastBlock = Math.max.apply(null, blockRows);
  var numRows = lastBlock + CONFIG.SCOT_CONTACTS_PER_CLIENT - firstBlock;
  var callDateFirstCol = 12;
  var weekStripFirstCol = 12 + CONFIG.SCOT_CALL_DATE_COUNT + 1;
  var weekCols = CONFIG.SCOT_WEEK_COUNT * CONFIG.SCOT_DAYS_PER_WEEK;
  var stripDates = sheet.getRange(2, weekStripFirstCol, 1, weekCols).getValues()[0];
  var stripValues = sheet.getRange(firstBlock, weekStripFirstCol, numRows, weekCols).getValues();
  var callDates = sheet.getRange(firstBlock, callDateFirstCol, numRows, CONFIG.SCOT_CALL_DATE_COUNT).getValues();
  var backgrounds = [];
  for (var r = 0; r < numRows; r++) backgrounds.push(new Array(weekCols).fill(SCOT_SHADE_NONE));
  blockRows.forEach(function (blockRow) {
    var offset = blockRow - firstBlock;
    if (offset < 0 || offset >= numRows) return;
    var scheduled = {};
    for (var c = 0; c < CONFIG.SCOT_CALL_DATE_COUNT; c++) { var val = callDates[offset][c]; if (val instanceof Date) scheduled[scotDateKey(val)] = true; }
    for (var col = 0; col < weekCols; col++) {
      var day = stripDates[col];
      var marked = String(stripValues[offset][col] || "").trim().toUpperCase() === SCOT_DONE_MARK;
      var shade = SCOT_SHADE_NONE;
      if (marked) shade = SCOT_SHADE_DONE;
      else if (day instanceof Date && scheduled[scotDateKey(day)]) shade = SCOT_SHADE_SCHEDULED;
      for (var row = 0; row < CONFIG.SCOT_CONTACTS_PER_CLIENT; row++) { if (offset + row < numRows) backgrounds[offset + row][col] = shade; }
    }
  });
  sheet.getRange(firstBlock, weekStripFirstCol, numRows, weekCols).setBackgrounds(backgrounds);
}

function refreshScotWeekStrip() {
  var sheet = getScotSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  var blockRows = [];
  for (var r = 3; r <= lastRow; r += CONFIG.SCOT_CONTACTS_PER_CLIENT) blockRows.push(r);
  buildScotWeekStrip(sheet, blockRows);
  applyScotCallHighlights(sheet, blockRows);
  revealScotCallDateColumns(sheet);
}

function handleScotEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SCOT_SHEET_NAME) return;
  var col = e.range.getColumn();
  var lastCol = col + e.range.getNumColumns() - 1;
  var row = e.range.getRow();
  if (row < 3) return;
  var callDateFirstCol = 12;
  var callDateLastCol = 11 + CONFIG.SCOT_CALL_DATE_COUNT;
  var weekStripFirstCol = callDateLastCol + 2;
  var weekStripLastCol = weekStripFirstCol + (CONFIG.SCOT_WEEK_COUNT * CONFIG.SCOT_DAYS_PER_WEEK) - 1;
  var touchedDates = lastCol >= callDateFirstCol && col <= callDateLastCol;
  var touchedStrip = lastCol >= weekStripFirstCol && col <= weekStripLastCol;
  if (!touchedDates && !touchedStrip) return;
  if (touchedDates) revealScotCallDateColumns(sheet);
  var blockStart = 3 + Math.floor((row - 3) / CONFIG.SCOT_CONTACTS_PER_CLIENT) * CONFIG.SCOT_CONTACTS_PER_CLIENT;
  applyScotCallHighlights(sheet, [blockStart]);
}

function handleScotModule(payload) {
  payload = payload || {};
  var action = payload.action;
  if (action === "scot_setup_headers") return ContentService.createTextOutput(JSON.stringify(setupScotHeaders())).setMimeType(ContentService.MimeType.JSON);
  if (action === "scot_sync") return ContentService.createTextOutput(JSON.stringify(syncScotClients(payload.items))).setMimeType(ContentService.MimeType.JSON);
  if (action === "scot_roll_week" || action === "scot_refresh") { refreshScotWeekStrip(); return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "SCOT 3-week calendar rolled" })).setMimeType(ContentService.MimeType.JSON); }
  return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown scot action: " + action })).setMimeType(ContentService.MimeType.JSON);
}

function installScotEditTrigger() {
  removeScotEditTrigger();
  try {
    var scotSs = SpreadsheetApp.openById(CONFIG.SCOT_SPREADSHEET_ID);
    ScriptApp.newTrigger('handleScotEdit').forSpreadsheet(scotSs).onEdit().create();
  } catch (err) { Logger.log("Notice installing trigger: " + err.toString()); }
}

function removeScotEditTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) { if (triggers[i].getHandlerFunction() === 'handleScotEdit') ScriptApp.deleteTrigger(triggers[i]); }
}

function onEdit(e) {
  try { handleScotEdit(e); } catch (err) { Logger.log("onEdit notice: " + err); }
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 HTTP GET & POST ROUTERS (100% Live Operations)
// ═════════════════════════════════════════════════════════════════════════════

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "SSPACIA MASTER Webhook Engine (EXPENSE FMS, INV PROCESS FMS, SUSPENSE, ACCOUNTS & SCOT) is online."
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(contents);
    var action = payload.action || "";

    if (action.indexOf("scot_") === 0 || payload.sheetName === CONFIG.SCOT_SHEET_NAME || payload.sheetName === "scot-sspacia") return handleScotModule(payload);
    if (action.indexOf("expense_fms_") === 0 || payload.sheetName === CONFIG.EXPENSE_FMS_SHEET_NAME || payload.sheetName === "EXPENSE FMS") return handleExpenseFms(payload);
    if (action.indexOf("invoice_fms_") === 0 || payload.sheetName === CONFIG.INV_PROCESS_SHEET_NAME || payload.sheetName === "INV PROCESS FMS" || payload.sheetName === "inv process fms") return handleInvoiceWorkflowFms(payload);
    if (action.indexOf("suspense") === 0 || payload.sheetName === CONFIG.SUSPENSE_SHEET_NAME || payload.sheetName === "SUSPENSE" || payload.sheetName === "expense fms") return handleSuspenseFms(payload);
    if (action.indexOf("accounts_") === 0 || payload.sheetName === CONFIG.ACCOUNTS_SHEET_NAME || payload.sheetName === "Accounts") return handleAccountsFms(payload);
    if (action === "hr_application" || payload.sheetName === CONFIG.HR_SHEET_NAME || payload.tabName === "HR") return handleHrApplication(payload);
    if (action === "purchase_planned" || action === "purchase_actual") return handlePurchaseFms(payload);
    if (action === "book_a_tour") { var tourResult = handleBookATour(payload); return ContentService.createTextOutput(JSON.stringify(tourResult)).setMimeType(ContentService.MimeType.JSON); }

    return ContentService.createTextOutput(JSON.stringify({ status: "notice", message: "Action received and acknowledged: " + action })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}


// ═════════════════════════════════════════════════════════════════════════════
// 🌟 GOOGLE SHEETS UI MENU
// ═════════════════════════════════════════════════════════════════════════════

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('EXPENSE FMS')
    .addItem('📥 Populate EXPENSE FMS', 'populateExpenseFms')
    .addItem('⚙️ Setup EXPENSE FMS Headers', 'setupExpenseFmsHeaders')
    .addItem('🗑️ Remove Old Daily 1AM Trigger', 'removeDaily1AMTrigger')
    .addToUi();
  ui.createMenu('INV PROCESS FMS')
    .addItem('📥 Populate Invoices into INV PROCESS FMS', 'populateInvProcessFms')
    .addItem('⚙️ Setup INV PROCESS FMS Headers', 'setupInvoiceWorkflowHeaders')
    .addItem('🔄 Sort Months Chronologically', 'sortExistingInvProcessSheet')
    .addToUi();
  ui.createMenu('SUSPENSE FMS')
    .addItem('📥 Populate SUSPENSE FMS', 'populateSuspenseFms')
    .addItem('⚙️ Setup SUSPENSE Headers', 'setupSuspenseHeaders')
    .addToUi();
  ui.createMenu('SSPACIA SCOT')
    .addItem('🚀 Sync Clients from SSPACIA Portal', 'syncScotClients')
    .addItem('🔄 Roll / Refresh 3-Week Calendar', 'refreshScotWeekStrip')
    .addItem('⚙️ Setup SCOT Headers & Layout', 'setupScotHeaders')
    .addItem('⚡ Install Real-time OnEdit Trigger', 'installScotEditTrigger')
    .addToUi();
}
