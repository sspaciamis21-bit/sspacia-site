/**
 * =============================================================================
 * SSPACIA MASTER GOOGLE APPS SCRIPT ENGINE (100% LIVE EVENT-DRIVEN)
 * =============================================================================
 * 1. EXPENSE FMS (Tab: "EXPENSE FMS" - Cols A to S: Data Set + 4 Approval Steps)
 * 2. SUSPENSE ADVANCE PAYMENT FMS (Tab: "SUSPENSE" - Cols V to AB)
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
// 🌟 MODULE 1: EXPENSE FMS (Tab: "EXPENSE FMS" - Cols A to S)
// ═════════════════════════════════════════════════════════════════════════════
// LAYOUT (matches existing sheet):
//   Row 1: Part of DATA SET merge (A1:C5)
//   Row 2: Step headers (D2:G2, H2:K2, L2:O2, P2:S2) + DATA SET text
//   Row 3: Doer (Dipendra)
//   Row 4: Tool (sspacia site)
//   Row 5: Hours/Reference
//   Row 6: Subheaders (Center | Expense Date | header - item desc | Planned | Actual | Status | TimeDelay × 4)
//   Row 7+: DATA ROWS
//
// Cols A to C: DATA SET
// Cols D to G: Step 1: Approve or reject with remarks Expense Entered by CM's
// Cols H to K: Step 2: Get Approval From Super Admin For The Same
// Cols L to O: Step 3: Take Approval before entering UTR Details
// Cols P to S: Step 4: Enter UTR Details
// ═════════════════════════════════════════════════════════════════════════════

function setupExpenseFmsHeaders() {
  var sheet = getExpenseFmsSheet();

  // Safely break apart entire header area to avoid merge conflicts
  try { sheet.getRange("A1:S6").breakApart(); } catch (e) {}

  // ── 1. DATA SET (Cols A to C, Rows 1-5) ──────────────────────────────────
  sheet.getRange("A1:C5").merge()
       .setValue("DATA SET")
       .setFontFamily("Roboto")
       .setFontSize(14)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  // ── 2. Step 1: Approve or reject with remarks Expense Entered by CM's (Cols D to G) ──
  sheet.getRange("D2:G2").merge().setValue("Approve or reject with remarks Expense Entered by CM's").setFontWeight("bold");
  sheet.getRange("D3:G3").merge().setValue("Dipendra");
  sheet.getRange("D4:G4").merge().setValue("sspacia site");
  sheet.getRange("D5:G5").merge().setValue("8");

  // ── 3. Step 2: Get Approval From Super Admin For The Same (Cols H to K) ──
  sheet.getRange("H2:K2").merge().setValue("Get Approval From Super Admin For The Same").setFontWeight("bold");
  sheet.getRange("H3:K3").merge().setValue("Dipendra");
  sheet.getRange("H4:K4").merge().setValue("sspacia site");
  sheet.getRange("H5:K5").merge().setValue("2");

  // ── 4. Step 3: Take Approval before entering UTR Details (Cols L to O) ──
  sheet.getRange("L2:O2").merge().setValue("Take Approval before entering UTR Details").setFontWeight("bold");
  sheet.getRange("L3:O3").merge().setValue("Dipendra");
  sheet.getRange("L4:O4").merge().setValue("sspacia site");
  sheet.getRange("L5:O5").merge().setValue("2");

  // ── 5. Step 4: Enter UTR Details (Cols P to S) ──
  sheet.getRange("P2:S2").merge().setValue("Enter UTR Details").setFontWeight("bold");
  sheet.getRange("P3:S3").merge().setValue("Dipendra");
  sheet.getRange("P4:S4").merge().setValue("sspacia site");
  sheet.getRange("P5:S5").merge().setValue("2");

  // ── Subheaders (Row 6) ──────────────────────────────────────────────────
  sheet.getRange(6, 1).setValue("Center");
  sheet.getRange(6, 2).setValue("Expense Date");
  sheet.getRange(6, 3).setValue("header - item desc");

  var subHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
  for (var s = 0; s < 4; s++) {
    var startCol = 4 + s * 4; // Col 4 (D), Col 8 (H), Col 12 (L), Col 16 (P)
    for (var h = 0; h < 4; h++) {
      sheet.getRange(6, startCol + h).setValue(subHeaders[h]);
    }
  }

  // Format Header Block (A1:S6)
  sheet.getRange("A1:S6")
       .setFontFamily("Roboto")
       .setFontSize(10)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle")
       .setBackground(null)
       .setFontColor(null);
  sheet.getRange("A1:C5").setFontSize(14);
  sheet.getRange("A6:S6").setFontWeight("bold");
  sheet.getRange("A1:S6").setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Column Widths
  sheet.setColumnWidth(1, 130); // Center
  sheet.setColumnWidth(2, 110); // Expense Date
  sheet.setColumnWidth(3, 260); // header - item desc
  for (var c = 4; c <= 19; c++) {
    var mod = (c - 4) % 4;
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

  return { status: "success", message: "EXPENSE FMS headers successfully configured on tab 'EXPENSE FMS' (Cols A:S, Subheaders Row 6, Data Row 7+)" };
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
function getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc) {
  var targetRow = findExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
  if (targetRow !== -1) {
    if (!sheet.getRange(targetRow, 1).getValue() && centerName) sheet.getRange(targetRow, 1).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
    if (!sheet.getRange(targetRow, 2).getValue() && expenseDate) setDateOnlyValue(sheet.getRange(targetRow, 2), expenseDate);
    if (!sheet.getRange(targetRow, 3).getValue() && headerItemDesc) {
      var dCell = sheet.getRange(targetRow, 3).setValue(headerItemDesc).setFontWeight("bold");
      if (recordId) dCell.setNote("id:" + recordId);
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
  sheet.getRange(targetRow, 1, 1, 19).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

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

  if (action === "expense_fms_setup_headers") {
    var res = setupExpenseFmsHeaders();
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 1. EXPENSE CREATED: CM enters expense record ─────────────────────────
  else if (action === "expense_fms_create") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Expense record created in EXPENSE FMS row " + row,
      row: row
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. STEP 1: Accountant Approval / Rejection ───────────────────────────
  else if (action === "expense_fms_step1_accountant") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col E (Col 5): Step 1 Actual (Status Col F & TimeDelay Col G left for user formula)
    setDateValue(sheet.getRange(row, 5), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 1 Accountant approval logged in EXPENSE FMS row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 3. STEP 2: Super Admin Approval / Rejection ──────────────────────────
  else if (action === "expense_fms_step2_super_admin") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col I (Col 9): Step 2 Actual (Status Col J & TimeDelay Col K left for user formula)
    setDateValue(sheet.getRange(row, 9), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 2 Super Admin approval logged in EXPENSE FMS row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 4. STEP 3: Payment Approval ("Take Approval before entering UTR") ─────
  else if (action === "expense_fms_step3_payment_approval") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col M (Col 13): Step 3 Actual (Status Col N & TimeDelay Col O left for user formula)
    setDateValue(sheet.getRange(row, 13), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 3 Payment Approval logged in EXPENSE FMS row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 5. STEP 4: Accountant Enters & Saves UTR Details ─────────────────────
  else if (action === "expense_fms_step4_utr") {
    var row = getOrCreateExpenseRowInFms(sheet, recordId, centerName, expenseDate, headerItemDesc);
    var actualTime = payload.actual || timestamp;

    // Col Q (Col 17): Step 4 Actual (Status Col R & TimeDelay Col S left for user formula)
    setDateValue(sheet.getRange(row, 17), actualTime);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 4 UTR Details logged in EXPENSE FMS row " + row,
      row: row,
      actual: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 6. BOOTSTRAP FAST BATCH SYNC ─────────────────────────────────────────
  else if (action === "expense_fms_bootstrap_sync") {
    setupExpenseFmsHeaders();
    var items = payload.items || [];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No expense items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    // ✅ CRITICAL FIX: Clear ALL old data rows (Row 7+) before writing fresh data.
    // This removes ghost entries (like deleted "GENERAL EXPENSES") that persisted from old syncs.
    var lastExistingRow = sheet.getLastRow();
    if (lastExistingRow >= 7) {
      var clearRows = lastExistingRow - 6;
      sheet.getRange(7, 1, clearRows, 19).clearContent();
      sheet.getRange(7, 3, clearRows, 1).clearNote();
      // Also clear formatting artifacts from old data
      sheet.getRange(7, 1, clearRows, 19)
           .setBackground(null)
           .setFontColor(null);
    }

    var rows = [];
    var notesColC = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];

      // Parse Expense Date to a real Date object
      var expDateObj = parseDateOnly(it.expenseDate);

      // Step 2: Super Admin Actual
      var s2Actual = it.step2Actual ? parseTimestampToDate(it.step2Actual) : "";

      // Step 1: Accountant Check Actual
      // If Step 1 actual exists (accountant approved/rejected), use it.
      // If missing but Step 2 actual exists (bulk upload / historical), fallback to Step 2 actual!
      var s1Actual = it.step1Actual ? parseTimestampToDate(it.step1Actual) : (s2Actual ? s2Actual : "");

      // Step 3: Payment Approval Actual
      var s3Actual = it.step3Actual ? parseTimestampToDate(it.step3Actual) : "";

      // Step 4: UTR Details Actual
      var s4Actual = it.step4Actual ? parseTimestampToDate(it.step4Actual) : "";

      rows.push([
        it.centerName || "Mercado",  // Col A (1): Center
        expDateObj,                  // Col B (2): Expense Date (real Date object)
        it.headerItemDesc || "",     // Col C (3): header - item desc
        "",                          // Col D (4): Step 1 Planned (ALWAYS BLANK in EXPENSE FMS)
        s1Actual,                    // Col E (5): Step 1 Actual
        "",                          // Col F (6): Step 1 Status (LEFT BLANK for user formula)
        "",                          // Col G (7): Step 1 TimeDelay (LEFT BLANK for user formula)
        "",                          // Col H (8): Step 2 Planned (ALWAYS BLANK in EXPENSE FMS)
        s2Actual,                    // Col I (9): Step 2 Actual
        "",                          // Col J (10): Step 2 Status (LEFT BLANK for user formula)
        "",                          // Col K (11): Step 2 TimeDelay (LEFT BLANK for user formula)
        "",                          // Col L (12): Step 3 Planned (ALWAYS BLANK in EXPENSE FMS)
        s3Actual,                    // Col M (13): Step 3 Actual
        "",                          // Col N (14): Step 3 Status (LEFT BLANK for user formula)
        "",                          // Col O (15): Step 3 TimeDelay (LEFT BLANK for user formula)
        "",                          // Col P (16): Step 4 Planned (ALWAYS BLANK in EXPENSE FMS)
        s4Actual,                    // Col Q (17): Step 4 Actual
        "",                          // Col R (18): Step 4 Status (LEFT BLANK for user formula)
        ""                           // Col S (19): Step 4 TimeDelay (LEFT BLANK for user formula)
      ]);

      notesColC.push(["id:" + (it.id || "")]);
    }

    // Write all 19 columns to "EXPENSE FMS" Tab starting at ROW 7
    sheet.getRange(7, 1, rows.length, 19).setValues(rows);
    sheet.getRange(7, 1, rows.length, 19)
         .setFontFamily("Roboto")
         .setFontSize(10)
         .setVerticalAlignment("middle")
         .setBackground(null)
         .setFontColor(null);

    // Col A (Center): Bold, Centered
    sheet.getRange(7, 1, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    
    // Col B (Expense Date): dd/MM/yyyy format
    sheet.getRange(7, 2, rows.length, 1)
         .setNumberFormat("dd/MM/yyyy")
         .setHorizontalAlignment("center");

    // Col C (Description): Bold, with ID notes
    sheet.getRange(7, 3, rows.length, 1).setFontWeight("bold").setNotes(notesColC);

    // Format Actual columns (Cols E, I, M, Q) as dd/MM/yyyy HH:mm:ss
    var actualCols = [5, 9, 13, 17];
    for (var ac = 0; ac < actualCols.length; ac++) {
      sheet.getRange(7, actualCols[ac], rows.length, 1)
           .setNumberFormat("dd/MM/yyyy HH:mm:ss")
           .setHorizontalAlignment("center");
    }

    // Format Status and TimeDelay columns as centered bold text for user formulas
    var formulaCols = [6, 7, 10, 11, 14, 15, 18, 19];
    for (var fc = 0; fc < formulaCols.length; fc++) {
      sheet.getRange(7, formulaCols[fc], rows.length, 1)
           .setHorizontalAlignment("center")
           .setFontWeight("bold");
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Populated " + items.length + " expense records in tab 'EXPENSE FMS' (Row 7+) successfully with blank Planned/Status/TimeDelay!",
      count: items.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown expense FMS action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 🚀 MASTER RUNNER: Populate All Database Expenses into "EXPENSE FMS" Tab
 */
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

  // ── 1. Data Set (Cols A to C) ──────────────────────────────────────────
  try { sheet.getRange("A1:C4").breakApart(); } catch (e) {}
  sheet.getRange("A1:C4").merge()
       .setValue("Data Set")
       .setFontFamily("Roboto")
       .setFontSize(14)
       .setFontWeight("bold")
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");

  sheet.getRange(5, 1).setValue("Doer Centre");
  sheet.getRange(5, 2).setValue("Invoice Month");
  sheet.getRange(5, 3).setValue("Company Name");

  // ── 2. Step 1: Review Invoices & Send to Accountant (Cols D to G) ────────
  try { sheet.getRange("D1:G1").breakApart(); } catch (e) {}
  try { sheet.getRange("D2:G2").breakApart(); } catch (e) {}
  try { sheet.getRange("D3:G3").breakApart(); } catch (e) {}
  try { sheet.getRange("D4:G4").breakApart(); } catch (e) {}

  sheet.getRange("D1:G1").merge().setValue("Review Invoices & Send to Accountant to attach tally pdf").setFontWeight("bold");
  sheet.getRange("D2:G2").merge().setValue("Community Managers");
  sheet.getRange("D3:G3").merge().setValue("sspacia site");
  sheet.getRange("D4:G4").merge().setValue("when invoice entry arrive in invoice section");

  // ── 3. Step 2: Attach Tally Invoice PDF and send back to CM (Cols H to K) ─
  try { sheet.getRange("H1:K1").breakApart(); } catch (e) {}
  try { sheet.getRange("H2:K2").breakApart(); } catch (e) {}
  try { sheet.getRange("H3:K3").breakApart(); } catch (e) {}
  try { sheet.getRange("H4:K4").breakApart(); } catch (e) {}

  sheet.getRange("H1:K1").merge().setValue("Attach Tally Invoice PDF and send back to CM").setFontWeight("bold");
  sheet.getRange("H2:K2").merge().setValue("from sspacia site");
  sheet.getRange("H3:K3").merge().setValue("dipendra");
  sheet.getRange("H4:K4").merge().setValue("when CM sent to accountant");

  // ── 4. Step 3: Approve and send Inv to client (Cols L to O) ──────────────
  try { sheet.getRange("L1:O1").breakApart(); } catch (e) {}
  try { sheet.getRange("L2:O2").breakApart(); } catch (e) {}
  try { sheet.getRange("L3:O3").breakApart(); } catch (e) {}
  try { sheet.getRange("L4:O4").breakApart(); } catch (e) {}

  sheet.getRange("L1:O1").merge().setValue("Approve and send Inv to client").setFontWeight("bold");
  sheet.getRange("L2:O2").merge().setValue("Community Managers");
  sheet.getRange("L3:O3").merge().setValue("sspacia site");
  sheet.getRange("L4:O4").merge().setValue("after reviewing and approve attached tally inv pdf");

  // ── Subheaders (Row 5) ────────────────────────────────────────────────────
  var subHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
  for (var s = 0; s < 3; s++) {
    var startCol = 4 + s * 4; // Col 4 (D), Col 8 (H), Col 12 (L)
    for (var h = 0; h < 4; h++) {
      sheet.getRange(5, startCol + h).setValue(subHeaders[h]);
    }
  }

  // Format Header Block (A1:O5)
  sheet.getRange("A1:O5")
       .setFontFamily("Roboto")
       .setFontSize(10)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle")
       .setBackground(null)
       .setFontColor(null);
  sheet.getRange("A1:C4").setFontSize(14);
  sheet.getRange("A5:O5").setFontWeight("bold");
  sheet.getRange("A1:O5").setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Column Widths
  sheet.setColumnWidth(1, 140); // Doer Centre
  sheet.setColumnWidth(2, 130); // Invoice Month
  sheet.setColumnWidth(3, 240); // Company Name
  for (var c = 4; c <= 15; c++) {
    var mod = (c - 4) % 4;
    if (mod === 0 || mod === 1) sheet.setColumnWidth(c, 160); // Planned, Actual
    else sheet.setColumnWidth(c, 90);                         // Status, TimeDelay
  }

  sheet.setRowHeight(1, 24);
  sheet.setRowHeight(2, 22);
  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 24);
  sheet.setRowHeight(5, 28);
  sheet.setFrozenRows(5);

  return { status: "success", message: "INV PROCESS FMS headers successfully configured on tab 'INV PROCESS FMS' (Cols A:O)" };
}

function findInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) return -1;
  var normCenter = normFmsText(centerName);
  var normMonth = normFmsText(invoiceMonth);
  var normCompany = normFmsText(companyName);

  var values = sheet.getRange(6, 1, lastRow - 5, 3).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    var rCenter = normFmsText(values[i][0]);
    var rMonth = normFmsText(values[i][1]);
    var rCompany = normFmsText(values[i][2]);

    var monthMatch = (!normMonth || rMonth === normMonth || rMonth.indexOf(normMonth) !== -1 || normMonth.indexOf(rMonth) !== -1);
    var compMatch = (rCompany === normCompany || rCompany.indexOf(normCompany) !== -1 || normCompany.indexOf(rCompany) !== -1);

    if (compMatch && monthMatch) {
      return 6 + i;
    }
  }
  return -1;
}

function getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName) {
  var targetRow = findInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
  if (targetRow !== -1) return targetRow;

  var lastRow = Math.max(sheet.getLastRow(), 5);
  for (var r = 6; r <= lastRow + 1; r++) {
    var aVal = String(sheet.getRange(r, 1).getValue() || "").trim();
    if (!aVal) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) targetRow = lastRow + 1;

  sheet.getRange(targetRow, 1).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(targetRow, 2).setValue(invoiceMonth).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 3).setValue(companyName).setFontWeight("bold");
  sheet.getRange(targetRow, 1, 1, 15).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

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

  if (action === "invoice_fms_arrival") {
    var plannedTimestamp = payload.planned || timestamp;
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    setDateValue(sheet.getRange(row, 4), plannedTimestamp);
    setPlainStatus(sheet.getRange(row, 6), "Pending");
    sheet.getRange(row, 5).clearContent();
    sheet.getRange(row, 8).clearContent();
    sheet.getRange(row, 9).clearContent();
    sheet.getRange(row, 10).clearContent();
    sheet.getRange(row, 12).clearContent();
    sheet.getRange(row, 13).clearContent();
    sheet.getRange(row, 14).clearContent();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 1 Planned logged for " + companyName + " in row " + row, row: row,
      planned: getNowTimestampString(parseTimestampToDate(plannedTimestamp))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_sent_accountant") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    setDateValue(sheet.getRange(row, 5), actualTime);
    setPlainStatus(sheet.getRange(row, 6), "Done");
    setDateValue(sheet.getRange(row, 8), actualTime);
    setPlainStatus(sheet.getRange(row, 10), "Pending");
    sheet.getRange(row, 12).clearContent();
    sheet.getRange(row, 13).clearContent();
    sheet.getRange(row, 14).clearContent();
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 1 Sent to Accountant logged & Step 2 Planned set in row " + row, row: row,
      sentAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_pdf_attached") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    setDateValue(sheet.getRange(row, 9), actualTime);
    setPlainStatus(sheet.getRange(row, 10), "Done");
    setDateValue(sheet.getRange(row, 12), actualTime);
    setPlainStatus(sheet.getRange(row, 14), "Pending");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 2 Tally PDF Attached logged & Step 3 Planned set in row " + row, row: row,
      attachedAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_approved_client") {
    var row = getOrCreateInvoiceRowInInvProcess(sheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    setDateValue(sheet.getRange(row, 13), actualTime);
    setPlainStatus(sheet.getRange(row, 14), "Done");
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Step 3 Approved and Sent to Client logged in row " + row, row: row,
      approvedAt: getNowTimestampString(parseTimestampToDate(actualTime))
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_sort_sheet") {
    var sortRes = sortExistingInvProcessSheet();
    return ContentService.createTextOutput(JSON.stringify(sortRes)).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "invoice_fms_bootstrap_sync") {
    setupInvoiceWorkflowHeaders();
    var items = payload.items || [];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    // Chronologically sort items by invoiceMonth (e.g. August 2026 -> September 2026 -> October 2026)
    items.sort(function(a, b) {
      var keyA = parseInvoiceMonthSortKey(a.invoiceMonth || "");
      var keyB = parseInvoiceMonthSortKey(b.invoiceMonth || "");
      if (keyA !== keyB) return keyA - keyB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    var lastExistingRow = sheet.getLastRow();
    if (lastExistingRow >= 6) {
      sheet.getRange(6, 1, lastExistingRow - 5, 15).clearContent();
    }

    var rows = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var isOld4Step = Boolean(it.step4Planned || it.step4Actual);
      var s1Planned = it.step1Planned ? parseTimestampToDate(it.step1Planned) : "";
      var s1Actual = "";
      if (isOld4Step) {
        s1Actual = it.step2Actual ? parseTimestampToDate(it.step2Actual) : (it.step1Actual ? parseTimestampToDate(it.step1Actual) : "");
      } else {
        s1Actual = it.step1Actual ? parseTimestampToDate(it.step1Actual) : "";
      }
      var s1Status = s1Actual ? "Done" : (s1Planned ? "Pending" : "");
      var s2Planned = s1Actual ? s1Actual : "";
      var s2Actual = "";
      if (s1Actual) {
        if (isOld4Step) { s2Actual = it.step3Actual ? parseTimestampToDate(it.step3Actual) : ""; }
        else { s2Actual = it.step2Actual ? parseTimestampToDate(it.step2Actual) : ""; }
      }
      var s2Status = s2Actual ? "Done" : (s2Planned ? "Pending" : "");
      var s3Planned = s2Actual ? s2Actual : "";
      var s3Actual = "";
      if (s2Actual) {
        if (isOld4Step) { s3Actual = it.step4Actual ? parseTimestampToDate(it.step4Actual) : ""; }
        else { s3Actual = it.step3Actual ? parseTimestampToDate(it.step3Actual) : ""; }
      }
      var s3Status = s3Actual ? "Done" : (s3Planned ? "Pending" : "");

      rows.push([
        it.centerName || "Mercado", it.invoiceMonth || "", it.companyName || "",
        s1Planned, s1Actual, s1Status, "",
        s2Planned, s2Actual, s2Status, "",
        s3Planned, s3Actual, s3Status, ""
      ]);
    }

    sheet.getRange(6, 1, rows.length, 15).setValues(rows);
    sheet.getRange(6, 1, rows.length, 15)
         .setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle")
         .setBackground(null).setFontColor(null);
    sheet.getRange(6, 1, rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange(6, 2, rows.length, 1).setHorizontalAlignment("center");
    sheet.getRange(6, 3, rows.length, 1).setFontWeight("bold");
    var dateCols = [4, 5, 8, 9, 12, 13];
    for (var dc = 0; dc < dateCols.length; dc++) {
      sheet.getRange(6, dateCols[dc], rows.length, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
    }
    var statusCols = [6, 10, 14];
    for (var sc = 0; sc < statusCols.length; sc++) {
      sheet.getRange(6, statusCols[sc], rows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Populated " + items.length + " invoice workflow records successfully!", count: items.length
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
 * 🔄 Sort Existing INV PROCESS FMS Tab Chronologically by Month (Cols A:O)
 * Sorts all rows from Row 6 downwards by Invoice Month (Col B) in chronological order:
 * August 2026 -> September 2026 -> October 2026 ...
 */
function sortExistingInvProcessSheet() {
  var sheet = getInvProcessSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) {
    Logger.log("No data rows to sort in INV PROCESS FMS.");
    return { status: "notice", message: "No data rows to sort" };
  }

  var numRows = lastRow - 5;
  var range = sheet.getRange(6, 1, numRows, 15);
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

  var dateCols = [4, 5, 8, 9, 12, 13];
  for (var dc = 0; dc < dateCols.length; dc++) {
    sheet.getRange(6, dateCols[dc], numRows, 1).setNumberFormat("dd/MM/yyyy HH:mm:ss").setHorizontalAlignment("center");
  }
  var statusCols = [6, 10, 14];
  for (var sc = 0; sc < statusCols.length; sc++) {
    sheet.getRange(6, statusCols[sc], numRows, 1).setHorizontalAlignment("center").setFontWeight("bold");
  }
  sheet.getRange(6, 1, numRows, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(6, 2, numRows, 1).setHorizontalAlignment("center");
  sheet.getRange(6, 3, numRows, 1).setFontWeight("bold");

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
// 🌟 MODULE 3: SUSPENSE ADVANCE PAYMENT FMS (Tab: "SUSPENSE" - Cols V to AB)
// ═════════════════════════════════════════════════════════════════════════════

function handleSuspenseFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getSuspenseSheet();
  var centersList = ["mercado", "premier house", "agarwal complex"];

  if (action === "suspense_planned") {
    var payReceiveDate = String(payload.payReceiveDate || getTodayDateString()).trim();
    var suspensePaymentType = String(payload.suspensePaymentType || "Advance Suspense Payment").trim();
    var planned = payload.planned ? parseTimestampToDate(payload.planned) : new Date();

    var lastRow = Math.max(sheet.getLastRow(), 5);
    var targetStartRow = 6;
    var foundEmptySlot = false;
    for (var r = 6; r <= lastRow + 3; r += 3) {
      var val1 = sheet.getRange(r, 22).getValue();
      var val2 = sheet.getRange(r, 24).getValue();
      if ((!val1 || String(val1).trim() === "") && (!val2 || String(val2).trim() === "")) {
        targetStartRow = r; foundEmptySlot = true; break;
      }
    }
    if (!foundEmptySlot) {
      targetStartRow = Math.max(lastRow + 1, 6);
      var offset = (targetStartRow - 6) % 3;
      if (offset !== 0) targetStartRow += (3 - offset);
    }
    try { sheet.getRange(targetStartRow, 22, 3, 1).breakApart(); } catch (e) {}
    try { sheet.getRange(targetStartRow, 23, 3, 1).breakApart(); } catch (e) {}
    try { sheet.getRange(targetStartRow, 25, 3, 1).breakApart(); } catch (e) {}
    for (var c = 0; c < 3; c++) {
      var cRow = targetStartRow + c;
      sheet.getRange(cRow, 24).setValue(centersList[c]).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
      setDateValue(sheet.getRange(cRow, 25), planned);
      sheet.getRange(cRow, 26).clearContent();
      setPlainStatus(sheet.getRange(cRow, 27), "Pending");
    }
    sheet.getRange(targetStartRow, 22, 3, 1).merge().setValue(payReceiveDate).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
    sheet.getRange(targetStartRow, 23, 3, 1).merge().setValue(suspensePaymentType).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success", message: "Suspense Planned logged across rows " + targetStartRow + " to " + (targetStartRow + 2),
      rowStart: targetStartRow, payReceiveDate: payReceiveDate, suspensePaymentType: suspensePaymentType, planned: getNowTimestampString(planned)
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "suspense_bootstrap_sync") {
    var items = payload.items || [];
    if (!items || items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No suspense items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    var lastExistingRow = sheet.getLastRow();
    if (lastExistingRow >= 6) {
      for (var r = 6; r <= lastExistingRow; r += 3) {
        try { sheet.getRange(r, 22, 3, 1).breakApart(); } catch (e) {}
        try { sheet.getRange(r, 23, 3, 1).breakApart(); } catch (e) {}
        try { sheet.getRange(r, 25, 3, 1).breakApart(); } catch (e) {}
      }
      var clearCount = lastExistingRow - 5;
      sheet.getRange(6, 22, clearCount, 7).clearContent().clearFormat().clearNote();
    }

    var startRow = 6;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var rStart = startRow + i * 3;
      var pDate = String(item.payReceiveDate || "").trim();
      var pType = String(item.suspensePaymentType || "x payment received").trim();
      var planDeadline = item.planned ? parseTimestampToDate(item.planned) : (item.plannedTimestamp ? parseTimestampToDate(item.plannedTimestamp) : new Date());

      try { sheet.getRange(rStart, 22, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(rStart, 23, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(rStart, 25, 3, 1).breakApart(); } catch (e) {}

      for (var c = 0; c < 3; c++) {
        var rowNum = rStart + c;
        var center = centersList[c];
        sheet.getRange(rowNum, 24).setValue(center).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
        setDateValue(sheet.getRange(rowNum, 25), planDeadline);

        var alloc = item.allocations ? item.allocations.find(function(a) { return String(a.centerName).toLowerCase().trim() === center; }) : null;
        var actualVal = alloc && alloc.actualTimestamp ? parseTimestampToDate(alloc.actualTimestamp) : "";
        var statusVal = alloc && alloc.fmsStatus ? alloc.fmsStatus : (actualVal ? "Done" : "Pending");

        if (actualVal) {
          setDateValue(sheet.getRange(rowNum, 26), actualVal);
        } else {
          sheet.getRange(rowNum, 26).clearContent();
        }
        setPlainStatus(sheet.getRange(rowNum, 27), statusVal);
      }

      sheet.getRange(rStart, 22, 3, 1).merge().setValue(pDate).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
      sheet.getRange(rStart, 23, 3, 1).merge().setValue(pType).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontFamily("Roboto").setFontSize(10);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Populated " + items.length + " suspense records across rows 6 to " + (startRow + items.length * 3 - 1),
      count: items.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  else if (action === "suspense_actual") {
    var centerName = String(payload.centerName || "").toLowerCase().trim();
    var statusVal = String(payload.status || "Done").trim();
    var rowStart = payload.rowStart ? Number(payload.rowStart) : -1;
    var targetDate = String(payload.payReceiveDate || "").trim();
    var targetType = String(payload.suspensePaymentType || "").toLowerCase().trim();
    var actualDate = new Date();
    if (payload.actual || payload.actualTimestamp) actualDate = parseTimestampToDate(payload.actual || payload.actualTimestamp);
    var targetRow = -1;

    // 1. If rowStart is known, check within that 3-row block
    if (rowStart >= 6) {
      for (var k = 0; k < 3; k++) {
        var checkR = rowStart + k;
        var cVal = String(sheet.getRange(checkR, 24).getValue() || "").toLowerCase().trim();
        if (cVal === centerName || centerName.indexOf(cVal) !== -1 || cVal.indexOf(centerName) !== -1) {
          targetRow = checkR;
          break;
        }
      }
    }

    // 2. Otherwise scan all 3-row blocks from bottom to top
    if (targetRow === -1) {
      var lastRow = sheet.getLastRow();
      for (var r = lastRow; r >= 6; r -= 3) {
        var blockStart = 6 + Math.floor((r - 6) / 3) * 3;
        var bDate = String(sheet.getRange(blockStart, 22).getDisplayValue() || "").trim();
        var bType = String(sheet.getRange(blockStart, 23).getDisplayValue() || "").toLowerCase().trim();

        var dateMatch = (!targetDate || bDate === targetDate || bDate.indexOf(targetDate) !== -1);
        var typeMatch = (!targetType || bType.indexOf(targetType) !== -1 || targetType.indexOf(bType) !== -1);

        if (dateMatch && typeMatch) {
          for (var c = 0; c < 3; c++) {
            var checkR = blockStart + c;
            var cVal = String(sheet.getRange(checkR, 24).getValue() || "").toLowerCase().trim();
            if (cVal === centerName || centerName.indexOf(cVal) !== -1 || cVal.indexOf(centerName) !== -1) {
              targetRow = checkR;
              break;
            }
          }
          if (targetRow !== -1) break;
        }
      }
    }

    // 3. Fallback: match by center name alone if still not found
    if (targetRow === -1) {
      var lastRow = sheet.getLastRow();
      for (var r = lastRow; r >= 6; r--) {
        var cVal = String(sheet.getRange(r, 24).getValue() || "").toLowerCase().trim();
        if (cVal === centerName || centerName.indexOf(cVal) !== -1 || cVal.indexOf(centerName) !== -1) {
          targetRow = r;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      setDateValue(sheet.getRange(targetRow, 26), actualDate);
      setPlainStatus(sheet.getRange(targetRow, 27), statusVal);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Suspense Actual logged for " + centerName + " in row " + targetRow,
        row: targetRow,
        center: centerName,
        actual: getNowTimestampString(actualDate),
        statusValue: statusVal
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "notice",
        message: "Could not find matching row for center: " + centerName
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  else if (action === "suspense_update" || action === "suspense_edit") {
    var updateRowStart = payload.rowStart ? Number(payload.rowStart) : -1;
    var updatedDate = payload.payReceiveDate ? String(payload.payReceiveDate).trim() : null;
    var updatedType = payload.suspensePaymentType ? String(payload.suspensePaymentType).trim() : null;
    if (updateRowStart >= 6) {
      if (updatedDate) sheet.getRange(updateRowStart, 22, 3, 1).setValue(updatedDate);
      if (updatedType) sheet.getRange(updateRowStart, 23, 3, 1).setValue(updatedType);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", message: "Suspense Entry updated in rows " + updateRowStart + " to " + (updateRowStart + 2), rowStart: updateRowStart
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return handleSuspenseFms({ action: "suspense_planned", payReceiveDate: updatedDate, suspensePaymentType: updatedType, planned: payload.planned });
    }
  }

  else if (action === "suspense_delete") {
    var targetRow = -1;
    if (payload.rowStart && Number(payload.rowStart) >= 6) {
      targetRow = Number(payload.rowStart);
    } else {
      var searchDate = payload.payReceiveDate ? String(payload.payReceiveDate).trim() : "";
      var searchType = payload.suspensePaymentType ? String(payload.suspensePaymentType).trim().toLowerCase() : "";
      var lastRow = sheet.getLastRow();
      for (var r = 6; r <= lastRow; r += 3) {
        var cellDate = String(sheet.getRange(r, 22).getDisplayValue() || "").trim();
        var cellType = String(sheet.getRange(r, 23).getDisplayValue() || "").trim().toLowerCase();
        if (cellDate === searchDate && (searchType === "" || cellType === searchType)) { targetRow = r; break; }
      }
    }
    if (targetRow >= 6) {
      try { sheet.getRange(targetRow, 22, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(targetRow, 23, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(targetRow, 25, 3, 1).breakApart(); } catch (e) {}
      var rangeToClear = sheet.getRange(targetRow, 22, 3, 7);
      rangeToClear.clearContent(); rangeToClear.clearFormat(); rangeToClear.clearNote();
      rangeToClear.setBackground(null); rangeToClear.setFontColor(null);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", action: "suspense_delete", message: "Suspense entry cleared from rows " + targetRow + "-" + (targetRow + 2), rowStart: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "suspense_delete", message: "Entry not found or already removed", rowStart: null })).setMimeType(ContentService.MimeType.JSON);
    }
  }

}

function populateSuspenseFms() {
  var url = "https://sspacia.com/api/admin/suspense";
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var json = JSON.parse(res.getContentText());
      if (json && json.data && json.data.length > 0) {
        var result = handleSuspenseFms({ action: "suspense_bootstrap_sync", items: json.data });
        Logger.log("✅ SUSPENSE FMS Population Complete: " + result.getContent());
        return;
      }
    }
    Logger.log("Notice: API returned HTTP " + res.getResponseCode());
  } catch (e) {
    Logger.log("Notice fetching suspense from API: " + e.toString());
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
    .addToUi();
  ui.createMenu('SSPACIA SCOT')
    .addItem('🚀 Sync Clients from SSPACIA Portal', 'syncScotClients')
    .addItem('🔄 Roll / Refresh 3-Week Calendar', 'refreshScotWeekStrip')
    .addItem('⚙️ Setup SCOT Headers & Layout', 'setupScotHeaders')
    .addItem('⚡ Install Real-time OnEdit Trigger', 'installScotEditTrigger')
    .addToUi();
}
