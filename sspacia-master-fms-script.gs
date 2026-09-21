/**
 * =============================================================================
 * SSPACIA MASTER GOOGLE APPS SCRIPT ENGINE (100% LIVE EVENT-DRIVEN)
 * 1. EXPENSE FMS (Tab: "expense fms" - Cols A to D for daily expense actuals)
 * 2. SUSPENSE ADVANCE PAYMENT FMS (Tab: "expense fms" - Cols V to AA)
 * 3. BOOK A WORKSPACE TOUR (Tab: "book a tour" + Automatic Sales Email)
 * 4. PURCHASE FMS (Tab: "sspacia-purchase" - Dedicated Isolated Module)
 * 5. HR CAREER APPLICATIONS + RESUME CV LINK (Tab: "HR" - Dedicated Isolated Module)
 * 6. ACCOUNTS FMS (Tab: "Accounts" - Live, Old Invoices & Daily Payment Check Cols Q:T)
 * 7. INVOICE WORKFLOW FMS (Tab: "expense fms" Cols F:T & Tab: "Accounts" Cols U:X)
 * =============================================================================
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit
 */

const CONFIG = {
  SPREADSHEET_ID: "1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0",
  SHEET_NAME: "expense fms",
  TOUR_SHEET_NAME: "book a tour",
  PURCHASE_SHEET_NAME: "sspacia-purchase",
  HR_SHEET_NAME: "HR",
  ACCOUNTS_SHEET_NAME: "Accounts",
  
  // Destination email where tour booking alerts will be sent
  SALES_EMAIL: "sales@sspacia.com",
  
  HEADER_ROW: 5,
  DATA_START_ROW: 6,
  ACTIVE_CENTERS: [
    "Agarwal Complex",
    "Mercado",
    "Premier House"
  ],
  TIMEZONE: "Asia/Kolkata",
  DATE_FORMAT: "dd/MM/yyyy",
  TIMESTAMP_FORMAT: "dd/MM/yyyy, hh:mm:ss a"
};

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getFmsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheetByName("Expense FMS") || ss.getActiveSheet();
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

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 DEDICATED MODULE: INVOICE WORKFLOW FMS
// Tab 1: "expense fms"
//   Cols F to H: Data Set (Doer Centre, Invoice Month, Company Name)
//   Cols I to L: Review Invoices (CMs | sspacia site | when invoice entry arrive)
//   Cols M to P: Send to Accountant to attach tally pdf (CMs | sspacia site | after review)
//   Cols Q to T: Approve and send Inv to client (CMs | sspacia site | after review & approve tally pdf)
// Tab 2: "Accounts"
//   Cols U to X: Attach Tally Invoice PDF (dipendra | from sspacia site | when CM sent to accountant)
// ═════════════════════════════════════════════════════════════════════════════

function setupInvoiceWorkflowHeaders() {
  var expSheet = getFmsSheet();
  var accSheet = getAccountsSheet();

  // ── 1. "expense fms" Tab Headers (Cols F to T) ───────────────────────────
  try { expSheet.getRange("F1:H4").breakApart(); } catch (e) {}
  expSheet.getRange("F1:H4").merge()
          .setValue("Data Set")
          .setFontFamily("Roboto")
          .setFontSize(15)
          .setFontWeight("bold")
          .setHorizontalAlignment("center")
          .setVerticalAlignment("middle");

  expSheet.getRange(5, 6).setValue("Doer Centre").setFontWeight("bold").setHorizontalAlignment("center");
  expSheet.getRange(5, 7).setValue("Invoice Month").setFontWeight("bold").setHorizontalAlignment("center");
  expSheet.getRange(5, 8).setValue("Company Name").setFontWeight("bold").setHorizontalAlignment("center");

  // Step 1: Review Invoices (Cols I:L)
  try { expSheet.getRange("I1:L1").breakApart(); } catch (e) {}
  try { expSheet.getRange("I2:L2").breakApart(); } catch (e) {}
  try { expSheet.getRange("I3:L3").breakApart(); } catch (e) {}
  try { expSheet.getRange("I4:L4").breakApart(); } catch (e) {}

  expSheet.getRange("I1:L1").merge().setValue("Review Invoices").setFontWeight("bold").setHorizontalAlignment("center");
  expSheet.getRange("I2:L2").merge().setValue("Community Managers").setHorizontalAlignment("center");
  expSheet.getRange("I3:L3").merge().setValue("sspacia site").setHorizontalAlignment("center");
  expSheet.getRange("I4:L4").merge().setValue("when invoice entry arrive in invoice section").setHorizontalAlignment("center");

  var subHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
  for (var h1 = 0; h1 < 4; h1++) {
    expSheet.getRange(5, 9 + h1).setValue(subHeaders[h1]).setFontWeight("bold").setHorizontalAlignment("center");
  }

  // Step 2: Send to Accountant to attach tally pdf (Cols M:P)
  try { expSheet.getRange("M1:P1").breakApart(); } catch (e) {}
  try { expSheet.getRange("M2:P2").breakApart(); } catch (e) {}
  try { expSheet.getRange("M3:P3").breakApart(); } catch (e) {}
  try { expSheet.getRange("M4:P4").breakApart(); } catch (e) {}

  expSheet.getRange("M1:P1").merge().setValue("Send to Accountant to attach tally pdf").setFontWeight("bold").setHorizontalAlignment("center");
  expSheet.getRange("M2:P2").merge().setValue("Community Managers").setHorizontalAlignment("center");
  expSheet.getRange("M3:P3").merge().setValue("sspacia site").setHorizontalAlignment("center");
  expSheet.getRange("M4:P4").merge().setValue("after reviewing invocices entry").setHorizontalAlignment("center");

  for (var h2 = 0; h2 < 4; h2++) {
    expSheet.getRange(5, 13 + h2).setValue(subHeaders[h2]).setFontWeight("bold").setHorizontalAlignment("center");
  }

  // Step 4: Approve and send Inv to client (Cols Q:T)
  try { expSheet.getRange("Q1:T1").breakApart(); } catch (e) {}
  try { expSheet.getRange("Q2:T2").breakApart(); } catch (e) {}
  try { expSheet.getRange("Q3:T3").breakApart(); } catch (e) {}
  try { expSheet.getRange("Q4:T4").breakApart(); } catch (e) {}

  expSheet.getRange("Q1:T1").merge().setValue("Approve and send Inv to client").setFontWeight("bold").setHorizontalAlignment("center");
  expSheet.getRange("Q2:T2").merge().setValue("Community Managers").setHorizontalAlignment("center");
  expSheet.getRange("Q3:T3").merge().setValue("sspacia site").setHorizontalAlignment("center");
  expSheet.getRange("Q4:T4").merge().setValue("after reviewing and approve attached tally inv pdf").setHorizontalAlignment("center");

  for (var h4 = 0; h4 < 4; h4++) {
    expSheet.getRange(5, 17 + h4).setValue(subHeaders[h4]).setFontWeight("bold").setHorizontalAlignment("center");
  }

  expSheet.getRange("F1:T5").setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

  // ── 2. "Accounts" Tab Headers (Cols U to X) ──────────────────────────────
  try { accSheet.getRange("U1:X1").breakApart(); } catch (e) {}
  try { accSheet.getRange("U2:X2").breakApart(); } catch (e) {}
  try { accSheet.getRange("U3:X3").breakApart(); } catch (e) {}
  try { accSheet.getRange("U4:X4").breakApart(); } catch (e) {}

  accSheet.getRange("U1:X1").merge().setValue("Attach Tally Invoice PDF").setFontWeight("bold").setHorizontalAlignment("center");
  accSheet.getRange("U2:X2").merge().setValue("from sspacia site").setHorizontalAlignment("center");
  accSheet.getRange("U3:X3").merge().setValue("dipendra").setHorizontalAlignment("center");
  accSheet.getRange("U4:X4").merge().setValue("when CM sent to accountant").setHorizontalAlignment("center");

  for (var h3 = 0; h3 < 4; h3++) {
    accSheet.getRange(5, 21 + h3).setValue(subHeaders[h3]).setFontWeight("bold").setHorizontalAlignment("center");
  }

  accSheet.getRange("U1:X5").setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

  return { status: "success", message: "Invoice Workflow FMS headers successfully configured on expense fms (F:T) and Accounts (U:X)" };
}

function findInvoiceRowInExpenseFms(sheet, centerName, invoiceMonth, companyName) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 6) return -1;
  var normCenter = normFmsText(centerName);
  var normMonth = normFmsText(invoiceMonth);
  var normCompany = normFmsText(companyName);

  var values = sheet.getRange(6, 6, lastRow - 5, 3).getDisplayValues(); // Cols F, G, H
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

function getOrCreateInvoiceRowInExpenseFms(sheet, centerName, invoiceMonth, companyName) {
  var targetRow = findInvoiceRowInExpenseFms(sheet, centerName, invoiceMonth, companyName);
  if (targetRow !== -1) return targetRow;

  var lastRow = Math.max(sheet.getLastRow(), 5);
  for (var r = 6; r <= lastRow + 1; r++) {
    var fVal = String(sheet.getRange(r, 6).getValue() || "").trim();
    if (!fVal) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) targetRow = lastRow + 1;

  sheet.getRange(targetRow, 6).setValue(centerName).setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange(targetRow, 7).setValue(invoiceMonth).setHorizontalAlignment("center");
  sheet.getRange(targetRow, 8).setValue(companyName).setFontWeight("bold");
  sheet.getRange(targetRow, 6, 1, 15).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");

  return targetRow;
}

function findInvoiceRowInAccounts(accountsSheet, invoiceMonth, companyName) {
  var lastRow = accountsSheet.getLastRow();
  if (lastRow < 6) return -1;
  var normMonth = normFmsText(invoiceMonth);
  var normCompany = normFmsText(companyName);

  // 1. Check Live Invoices (Cols A & B)
  var liveVals = accountsSheet.getRange(6, 1, lastRow - 5, 2).getDisplayValues();
  for (var i = 0; i < liveVals.length; i++) {
    var rMonth = normFmsText(liveVals[i][0]);
    var rCompany = normFmsText(liveVals[i][1]);
    if (rCompany === normCompany && (rMonth === normMonth || !normMonth)) {
      return 6 + i;
    }
  }

  // 2. Check Old Invoices (Cols I & J)
  var oldVals = accountsSheet.getRange(6, 9, lastRow - 5, 2).getDisplayValues();
  for (var j = 0; j < oldVals.length; j++) {
    var rMonth2 = normFmsText(oldVals[j][0]);
    var rCompany2 = normFmsText(oldVals[j][1]);
    if (rCompany2 === normCompany && (rMonth2 === normMonth || !normMonth2)) {
      return 6 + j;
    }
  }

  return -1;
}

function getOrCreateInvoiceRowInAccounts(accountsSheet, expRow, invoiceMonth, companyName) {
  var accRow = findInvoiceRowInAccounts(accountsSheet, invoiceMonth, companyName);
  if (accRow !== -1) return accRow;

  // If not found in Col A/B or I/J, use row matching expense fms or next available row
  if (expRow >= 6) {
    return expRow;
  }

  var lastRow = Math.max(accountsSheet.getLastRow(), 5);
  for (var r = 6; r <= lastRow + 1; r++) {
    var uVal = String(accountsSheet.getRange(r, 21).getValue() || "").trim();
    if (!uVal) return r;
  }
  return lastRow + 1;
}

/**
 * Set status without any background formatting or font colors (as strictly requested)
 */
function setPlainStatus(cell, statusVal) {
  cell.setValue(statusVal)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Roboto")
      .setFontSize(10)
      .setFontWeight("normal")
      .setBackground(null)
      .setFontColor(null);
}

function handleInvoiceWorkflowFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var expSheet = getFmsSheet();
  var accSheet = getAccountsSheet();

  var centerName = String(payload.centerName || "Mercado").trim();
  var invoiceMonth = String(payload.invoiceMonth || "").trim();
  var companyName = String(payload.companyName || "").trim();
  var timestamp = payload.timestamp || payload.actual || getNowTimestampString();

  if (action === "invoice_fms_setup_headers") {
    var res = setupInvoiceWorkflowHeaders();
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 1. STEP 1: Invoice Arrival in Invoice Section (Planned) ────────────────
  if (action === "invoice_fms_arrival") {
    var plannedTimestamp = payload.planned || timestamp;
    var row = getOrCreateInvoiceRowInExpenseFms(expSheet, centerName, invoiceMonth, companyName);

    // Col I (Col 9): Step 1 Planned
    expSheet.getRange(row, 9).setValue(plannedTimestamp).setHorizontalAlignment("center");

    // Col K (Col 11): Step 1 Status (Pending, no formatting)
    setPlainStatus(expSheet.getRange(row, 11), "Pending");

    // Col L (Col 12): Step 1 TimeDelay Formula
    expSheet.getRange(row, 12).setFormula('=IF(OR(ISBLANK(J' + row + '), ISBLANK(I' + row + ')), "", IF(J' + row + '>I' + row + ', TEXT(J' + row + '-I' + row + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 1 Planned logged for " + companyName + " in row " + row,
      row: row,
      planned: plannedTimestamp
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. STEP 1 ACTUAL & STEP 2 PLANNED: CM Reviews Invoices Entry ───────────
  else if (action === "invoice_fms_reviewed") {
    var row = getOrCreateInvoiceRowInExpenseFms(expSheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;
    var nextPlannedTime = payload.nextPlanned || actualTime;

    // Col J (Col 10): Step 1 Actual
    expSheet.getRange(row, 10).setValue(actualTime).setHorizontalAlignment("center");

    // Col K (Col 11): Step 1 Status (Done, no formatting)
    setPlainStatus(expSheet.getRange(row, 11), "Done");

    // Col M (Col 13): Step 2 Planned (Send to Accountant)
    expSheet.getRange(row, 13).setValue(nextPlannedTime).setHorizontalAlignment("center");

    // Col O (Col 15): Step 2 Status (Pending, no formatting)
    setPlainStatus(expSheet.getRange(row, 15), "Pending");

    // Col P (Col 16): Step 2 TimeDelay Formula
    expSheet.getRange(row, 16).setFormula('=IF(OR(ISBLANK(N' + row + '), ISBLANK(M' + row + ')), "", IF(N' + row + '>M' + row + ', TEXT(N' + row + '-M' + row + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 1 Reviewed logged for " + companyName + " in row " + row,
      row: row,
      actual: actualTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 3. STEP 2 ACTUAL & STEP 3 PLANNED: CM Sends to Accountant ──────────────
  else if (action === "invoice_fms_sent_accountant") {
    var expRow = getOrCreateInvoiceRowInExpenseFms(expSheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;

    // Ensure Step 1 is completed
    var s1Actual = expSheet.getRange(expRow, 10).getValue();
    if (!s1Actual) {
      expSheet.getRange(expRow, 10).setValue(actualTime).setHorizontalAlignment("center");
      setPlainStatus(expSheet.getRange(expRow, 11), "Done");
    }

    // Ensure Step 2 Planned is present
    var s2Plan = expSheet.getRange(expRow, 13).getValue();
    if (!s2Plan) {
      expSheet.getRange(expRow, 13).setValue(actualTime).setHorizontalAlignment("center");
    }

    // Col N (Col 14): Step 2 Actual (when CM sent to accountant)
    expSheet.getRange(expRow, 14).setValue(actualTime).setHorizontalAlignment("center");

    // Col O (Col 15): Step 2 Status (Done, no formatting)
    setPlainStatus(expSheet.getRange(expRow, 15), "Done");

    // Step 2 TimeDelay Formula
    expSheet.getRange(expRow, 16).setFormula('=IF(OR(ISBLANK(N' + expRow + '), ISBLANK(M' + expRow + ')), "", IF(N' + expRow + '>M' + expRow + ', TEXT(N' + expRow + '-M' + expRow + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    // 🌟 IN "ACCOUNTS" TAB (Step 3: Attach Tally Invoice PDF, Cols U:X)
    var accRow = getOrCreateInvoiceRowInAccounts(accSheet, expRow, invoiceMonth, companyName);

    // Col U (Col 21): Step 3 Planned (When CM sent to accountant)
    accSheet.getRange(accRow, 21).setValue(actualTime).setHorizontalAlignment("center");

    // Col W (Col 23): Step 3 Status (Pending, no formatting)
    setPlainStatus(accSheet.getRange(accRow, 23), "Pending");

    // Col X (Col 24): Step 3 TimeDelay Formula
    accSheet.getRange(accRow, 24).setFormula('=IF(OR(ISBLANK(V' + accRow + '), ISBLANK(U' + accRow + ')), "", IF(V' + accRow + '>U' + accRow + ', TEXT(V' + accRow + '-U' + accRow + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 2 Sent to Accountant logged in expense fms row " + expRow + " and Accounts row " + accRow,
      expRow: expRow,
      accRow: accRow,
      sentAt: actualTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 4. STEP 3 ACTUAL & STEP 4 PLANNED: Accountant Attaches Tally PDF ───────
  else if (action === "invoice_fms_pdf_attached") {
    var expRow = getOrCreateInvoiceRowInExpenseFms(expSheet, centerName, invoiceMonth, companyName);
    var accRow = getOrCreateInvoiceRowInAccounts(accSheet, expRow, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;

    // In "Accounts" Tab (Cols U:X):
    // Col V (Col 22): Step 3 Actual (when accountant attached tally pdf)
    accSheet.getRange(accRow, 22).setValue(actualTime).setHorizontalAlignment("center");

    // Col W (Col 23): Step 3 Status (Done, no formatting)
    setPlainStatus(accSheet.getRange(accRow, 23), "Done");

    // In "expense fms" Tab (Cols Q:T):
    // Col Q (Col 17): Step 4 Planned (Approve and send Inv to client)
    expSheet.getRange(expRow, 17).setValue(actualTime).setHorizontalAlignment("center");

    // Col S (Col 19): Step 4 Status (Pending, no formatting)
    setPlainStatus(expSheet.getRange(expRow, 19), "Pending");

    // Col T (Col 20): Step 4 TimeDelay Formula
    expSheet.getRange(expRow, 20).setFormula('=IF(OR(ISBLANK(R' + expRow + '), ISBLANK(Q' + expRow + ')), "", IF(R' + expRow + '>Q' + expRow + ', TEXT(R' + expRow + '-Q' + expRow + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 3 Tally PDF Attached logged in Accounts row " + accRow + " and Step 4 Planned in expense fms row " + expRow,
      expRow: expRow,
      accRow: accRow,
      attachedAt: actualTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 5. STEP 4 ACTUAL: CM Approves and Sends Inv to Client ─────────────────
  else if (action === "invoice_fms_approved_client") {
    var expRow = getOrCreateInvoiceRowInExpenseFms(expSheet, centerName, invoiceMonth, companyName);
    var actualTime = payload.actual || timestamp;

    // Col R (Col 18): Step 4 Actual
    expSheet.getRange(expRow, 18).setValue(actualTime).setHorizontalAlignment("center");

    // Col S (Col 19): Step 4 Status (Done, no formatting)
    setPlainStatus(expSheet.getRange(expRow, 19), "Done");

    // Ensure TimeDelay formula is set
    expSheet.getRange(expRow, 20).setFormula('=IF(OR(ISBLANK(R' + expRow + '), ISBLANK(Q' + expRow + ')), "", IF(R' + expRow + '>Q' + expRow + ', TEXT(R' + expRow + '-Q' + expRow + ', "[h]:mm:ss"), "On Time"))').setHorizontalAlignment("center");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Step 4 Approved and Sent to Client logged in expense fms row " + expRow,
      expRow: expRow,
      approvedAt: actualTime
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 6. ACTION: invoice_fms_bootstrap_sync (Bulk Fast Batch Population) ───
  else if (action === "invoice_fms_bootstrap_sync") {
    setupInvoiceWorkflowHeaders();
    var items = payload.items || [];
    if (items.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "No items to sync" })).setMimeType(ContentService.MimeType.JSON);
    }

    var expRows = [];
    var accRows = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var expRowIdx = 6 + i;

      // Expense FMS row: Cols F to T (15 columns)
      var s1DelayFormula = '=IF(OR(ISBLANK(J' + expRowIdx + '), ISBLANK(I' + expRowIdx + ')), "", IF(J' + expRowIdx + '>I' + expRowIdx + ', TEXT(J' + expRowIdx + '-I' + expRowIdx + ', "[h]:mm:ss"), "On Time"))';
      var s2DelayFormula = '=IF(OR(ISBLANK(N' + expRowIdx + '), ISBLANK(M' + expRowIdx + ')), "", IF(N' + expRowIdx + '>M' + expRowIdx + ', TEXT(N' + expRowIdx + '-M' + expRowIdx + ', "[h]:mm:ss"), "On Time"))';
      var s4DelayFormula = '=IF(OR(ISBLANK(R' + expRowIdx + '), ISBLANK(Q' + expRowIdx + ')), "", IF(R' + expRowIdx + '>Q' + expRowIdx + ', TEXT(R' + expRowIdx + '-Q' + expRowIdx + ', "[h]:mm:ss"), "On Time"))';

      expRows.push([
        it.centerName || "Mercado",
        it.invoiceMonth || "",
        it.companyName || "",
        it.step1Planned || "",
        it.step1Actual || "",
        it.step1Status || "Pending",
        s1DelayFormula,
        it.step2Planned || "",
        it.step2Actual || "",
        it.step2Status || "",
        s2DelayFormula,
        it.step4Planned || "",
        it.step4Actual || "",
        it.step4Status || "",
        s4DelayFormula
      ]);

      // Accounts FMS row: Cols U to X (4 columns)
      var s3DelayFormula = '=IF(OR(ISBLANK(V' + expRowIdx + '), ISBLANK(U' + expRowIdx + ')), "", IF(V' + expRowIdx + '>U' + expRowIdx + ', TEXT(V' + expRowIdx + '-U' + expRowIdx + ', "[h]:mm:ss"), "On Time"))';

      accRows.push([
        it.step3Planned || "",
        it.step3Actual || "",
        it.step3Status || "",
        s3DelayFormula
      ]);
    }

    // Write to "expense fms" Tab (Cols F to T)
    expSheet.getRange(6, 6, expRows.length, 15).setValues(expRows);
    expSheet.getRange(6, 6, expRows.length, 15)
            .setFontFamily("Roboto")
            .setFontSize(10)
            .setVerticalAlignment("middle")
            .setBackground(null)
            .setFontColor(null);
    expSheet.getRange(6, 6, expRows.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    expSheet.getRange(6, 7, expRows.length, 1).setHorizontalAlignment("center");
    expSheet.getRange(6, 8, expRows.length, 1).setFontWeight("bold");

    // Write to "Accounts" Tab (Cols U to X)
    accSheet.getRange(6, 21, accRows.length, 4).setValues(accRows);
    accSheet.getRange(6, 21, accRows.length, 4)
            .setFontFamily("Roboto")
            .setFontSize(10)
            .setVerticalAlignment("middle")
            .setHorizontalAlignment("center")
            .setBackground(null)
            .setFontColor(null);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Populated " + items.length + " invoice workflow records successfully!",
      count: items.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown invoice FMS action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 🚀 MASTER RUNNER: Populate August & September Invoice FMS
 * Select this function in the Apps Script function dropdown and click "Run"!
 */
function populateAugSepInvoiceWorkflowFms() {
  setupInvoiceWorkflowHeaders();
  
  var apiUrl = "https://sspacia.com/api/admin/invoices/fms-sync";
  try {
    var res = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());
    if (json && json.items && json.items.length > 0) {
      var result = handleInvoiceWorkflowFms({
        action: "invoice_fms_bootstrap_sync",
        items: json.items
      });
      Logger.log("✅ FMS Population Complete: " + result.getContent());
    } else {
      Logger.log("⚠️ No items returned from: " + apiUrl);
    }
  } catch (e) {
    Logger.log("❌ Error fetching from sspacia API: " + e.toString());
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 DEDICATED MODULE: SUSPENSE ADVANCE PAYMENT FMS (Tab: "expense fms")
// Columns V to AA:
// Col V (Col 22): pay receive date (merged 3 rows across mercado, premier house, agarwal complex)
// Col W (Col 23): suspense payment type (merged 3 rows)
// Col X (Col 24): center (Row 1: mercado, Row 2: premier house, Row 3: agarwal complex)
// Col Y (Col 25): planned (merged 3 rows: e.g. "19/09/2026 10:45:34 - 19/09/2026 14:45:34")
// Col Z (Col 26): actual (exact timestamp when CM accepts or rejects for that center)
// Col AA (Col 27): status (Pending -> Done / Overdue / Rejected)
// Col AB (Col 28): delay formula
// ═════════════════════════════════════════════════════════════════════════════

function handleSuspenseFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getFmsSheet();

  var centersList = ["mercado", "premier house", "agarwal complex"];

  // ── 1. ACTION: suspense_planned (Accountant enters Suspense payment) ──────
  if (action === "suspense_planned") {
    var payReceiveDate = String(payload.payReceiveDate || getTodayDateString()).trim();
    var suspensePaymentType = String(payload.suspensePaymentType || "Advance Suspense Payment").trim();
    var planned = String(payload.planned || "").trim();

    if (!planned) {
      var now = new Date();
      var plus4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      var startStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
      var endStr = Utilities.formatDate(plus4h, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
      planned = startStr + " - " + endStr;
    }

    // Find next available 3-row block starting from Row 6
    var lastRow = Math.max(sheet.getLastRow(), 5);
    var targetStartRow = 6;

    var foundEmptySlot = false;
    for (var r = 6; r <= lastRow + 3; r += 3) {
      var val1 = sheet.getRange(r, 22).getValue();
      var val2 = sheet.getRange(r, 24).getValue();

      if ((!val1 || String(val1).trim() === "") && (!val2 || String(val2).trim() === "")) {
        targetStartRow = r;
        foundEmptySlot = true;
        break;
      }
    }

    if (!foundEmptySlot) {
      targetStartRow = Math.max(lastRow + 1, 6);
      var offset = (targetStartRow - 6) % 3;
      if (offset !== 0) {
        targetStartRow += (3 - offset);
      }
    }

    // Unmerge in case previously merged
    try { sheet.getRange(targetStartRow, 22, 3, 1).breakApart(); } catch (e) {}
    try { sheet.getRange(targetStartRow, 23, 3, 1).breakApart(); } catch (e) {}
    try { sheet.getRange(targetStartRow, 25, 3, 1).breakApart(); } catch (e) {}

    // Set Center names in Col X (Col 24)
    for (var c = 0; c < 3; c++) {
      var cRow = targetStartRow + c;
      sheet.getRange(cRow, 24)
           .setValue(centersList[c])
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      // Col Z (Actual): Empty initially
      sheet.getRange(cRow, 26).clearContent();

      // Col AA (Status): "Pending"
      sheet.getRange(cRow, 27)
           .setValue("Pending")
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10)
           .setBackground("#fef3c7")
           .setFontColor("#92400e")
           .setFontWeight("bold");

      // Col AB (Delay Formula)
      sheet.getRange(cRow, 28)
           .setFormula('=IF(OR(ISBLANK(Z' + cRow + '), ISBLANK(Y' + targetStartRow + ')), "", IF(Z' + cRow + '>Y' + targetStartRow + ', TEXT(Z' + cRow + '-Y' + targetStartRow + ', "[h]:mm:ss"), "On Time"))')
           .setHorizontalAlignment("center");
    }

    // Merge Col V (Col 22) across 3 rows for Pay Receive Date
    sheet.getRange(targetStartRow, 22, 3, 1).merge()
         .setValue(payReceiveDate)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    // Merge Col W (Col 23) across 3 rows for Suspense Payment Type
    sheet.getRange(targetStartRow, 23, 3, 1).merge()
         .setValue(suspensePaymentType)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    // Merge Col Y (Col 25) across 3 rows for Planned Timestamp Range
    sheet.getRange(targetStartRow, 25, 3, 1).merge()
         .setValue(planned)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Suspense Planned logged successfully across rows " + targetStartRow + " to " + (targetStartRow + 2),
      rowStart: targetStartRow,
      payReceiveDate: payReceiveDate,
      suspensePaymentType: suspensePaymentType,
      planned: planned
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. ACTION: suspense_actual (CM Accepts or Rejects for their Center) ──
  else if (action === "suspense_actual") {
    var centerName = String(payload.centerName || "").toLowerCase().trim();
    var actualTimestamp = String(payload.actual || payload.actualTimestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss")).trim();
    var statusVal = String(payload.status || "Done").trim();
    var rowStart = payload.rowStart ? Number(payload.rowStart) : -1;

    var targetRow = -1;

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

    if (targetRow === -1) {
      var lastRow = sheet.getLastRow();
      if (lastRow >= 6) {
        var numRows = lastRow - 5;
        var xVals = sheet.getRange(6, 24, numRows, 1).getValues();
        var wVals = sheet.getRange(6, 23, numRows, 1).getValues();
        var targetType = String(payload.suspensePaymentType || "").toLowerCase().trim();

        for (var i = xVals.length - 1; i >= 0; i--) {
          var rowCenter = String(xVals[i][0] || "").toLowerCase().trim();
          var rowType = String(wVals[i][0] || "").toLowerCase().trim();

          var centerMatch = (rowCenter === centerName || centerName.indexOf(rowCenter) !== -1 || rowCenter.indexOf(centerName) !== -1);
          var typeMatch = (!targetType || rowType.indexOf(targetType) !== -1 || targetType.indexOf(rowType) !== -1);

          if (centerMatch && typeMatch) {
            targetRow = 6 + i;
            break;
          }
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 26)
           .setValue(actualTimestamp)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      var isDone = (statusVal === "Done" || statusVal === "ACCEPTED");
      var isRejected = (statusVal === "Rejected" || statusVal === "REJECTED");
      var statusBg = isDone ? "#dcfce7" : (isRejected ? "#fee2e2" : "#fef3c7");
      var statusColor = isDone ? "#166534" : (isRejected ? "#991b1b" : "#92400e");

      sheet.getRange(targetRow, 27)
           .setValue(statusVal)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10)
           .setBackground(statusBg)
           .setFontColor(statusColor)
           .setFontWeight("bold");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Suspense Actual logged for " + centerName + " in row " + targetRow,
        row: targetRow,
        center: centerName,
        actual: actualTimestamp,
        statusValue: statusVal
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "notice",
        message: "Could not find matching row for center: " + centerName
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── 3. ACTION: suspense_update (Accountant edits Suspense Payment Details) ─
  else if (action === "suspense_update" || action === "suspense_edit") {
    var updateRowStart = payload.rowStart ? Number(payload.rowStart) : -1;
    var updatedDate = payload.payReceiveDate ? String(payload.payReceiveDate).trim() : null;
    var updatedType = payload.suspensePaymentType ? String(payload.suspensePaymentType).trim() : null;

    if (updateRowStart >= 6) {
      if (updatedDate) {
        sheet.getRange(updateRowStart, 22, 3, 1).setValue(updatedDate);
      }
      if (updatedType) {
        sheet.getRange(updateRowStart, 23, 3, 1).setValue(updatedType);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Suspense Entry updated in Google Sheets rows " + updateRowStart + " to " + (updateRowStart + 2),
        rowStart: updateRowStart
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return handleSuspenseFms({
        action: "suspense_planned",
        payReceiveDate: updatedDate,
        suspensePaymentType: updatedType,
        planned: payload.planned
      });
    }
  }

  // ── 4. ACTION: suspense_delete (Completely remove from sheet without breaking other cols) ──
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
        if (cellDate === searchDate && (searchType === "" || cellType === searchType)) {
          targetRow = r;
          break;
        }
      }
    }

    if (targetRow >= 6) {
      try { sheet.getRange(targetRow, 22, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(targetRow, 23, 3, 1).breakApart(); } catch (e) {}
      try { sheet.getRange(targetRow, 25, 3, 1).breakApart(); } catch (e) {}

      var rangeToClear = sheet.getRange(targetRow, 22, 3, 7);
      rangeToClear.clearContent();
      rangeToClear.clearFormat();
      rangeToClear.clearNote();
      rangeToClear.setBackground(null);
      rangeToClear.setFontColor(null);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "suspense_delete",
        message: "Suspense entry cleared from rows " + targetRow + "-" + (targetRow + 2) + " in tab expense fms",
        rowStart: targetRow
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        action: "suspense_delete",
        message: "Entry not found in sheet or already removed",
        rowStart: null
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown suspense action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 DEDICATED MODULE: ACCOUNTS FMS (Tab: "Accounts")
// Columns A to G: Live Invoices (Planned & Actual)
// Column H: Spacer
// Columns I to O: Old Invoices Archive (Planned & Actual)
// Column P: Spacer
// Column Q: Planned Date (DD/MM/YYYY 10:30:00)
// Column R: Daily Check Actual Timestamp (M/D/YYYY HH:mm:ss)
// Column S: Status (Done / Pending)
// Column T: TimeDelay (Formula)
// ═════════════════════════════════════════════════════════════════════════════

function handleAccountsFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getAccountsSheet();

  // ── 1. ACTION: accounts_daily_fms_check / accounts_daily_check (Columns Q, R, S, T) ──────────
  if (action === "accounts_daily_fms_check" || action === "accounts_daily_check") {
    var actualTimestamp = payload.actual || payload.actualTimestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "M/d/yyyy HH:mm:ss");

    var checkDate = new Date();
    if (payload.date) {
      var dateParts = String(payload.date).split("-");
      if (dateParts.length === 3) {
        checkDate = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
      }
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
        var rawVal = qValues[i][0];
        var dispVal = String(qDisplayVals[i][0] || "").trim();

        var qDay = null;
        var qMonth = null;
        var qYear = null;

        if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
          qDay = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "d"));
          qMonth = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "M"));
          qYear = Number(Utilities.formatDate(rawVal, CONFIG.TIMEZONE, "yyyy"));
        } else if (dispVal) {
          var match = dispVal.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
          if (match) {
            var p1 = parseInt(match[1], 10);
            var p2 = parseInt(match[2], 10);
            var p3 = parseInt(match[3], 10);

            if (p1 > 1000) {
              qYear = p1; qMonth = p2; qDay = p3;
            } else if (p3 > 1000) {
              qYear = p3;
              if (p1 > 12) {
                qDay = p1; qMonth = p2;
              } else if (p2 > 12) {
                qMonth = p1; qDay = p2;
              } else {
                qDay = p1; qMonth = p2;
              }
            }
          }
        }

        if (qDay === targetDay && qMonth === targetMonth && qYear === targetYear) {
          targetRow = 6 + i;
          break;
        }
      }
    }

    if (targetRow === -1) {
      for (var r = 6; r <= lastRow + 1; r++) {
        var qValCheck = sheet.getRange(r, 17).getValue();
        if (!qValCheck || String(qValCheck).trim() === "") {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) targetRow = lastRow + 1;

      var padD = targetDay < 10 ? "0" + targetDay : targetDay;
      var padM = targetMonth < 10 ? "0" + targetMonth : targetMonth;
      sheet.getRange(targetRow, 17)
           .setValue(padD + "/" + padM + "/" + targetYear + " 10:30:00")
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);
    }

    // 1. Column R: Actual Timestamp
    sheet.getRange(targetRow, 18)
         .setValue(actualTimestamp)
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    // 2. Column S: Status ("Done" with green background)
    sheet.getRange(targetRow, 19)
         .setValue("Done")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10)
         .setFontWeight("bold")
         .setBackground("#dcfce7")
         .setFontColor("#166534");

    // 3. Column T: TimeDelay Formula
    sheet.getRange(targetRow, 20)
         .setFormula('=IF(OR(ISBLANK(R' + targetRow + '), ISBLANK(Q' + targetRow + ')), "", IF(R' + targetRow + '>Q' + targetRow + ', TEXT(R' + targetRow + '-Q' + targetRow + ', "[h]:mm:ss"), "On Time"))')
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setFontFamily("Roboto")
         .setFontSize(10);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Daily FMS check logged to Col R, S, T in row " + targetRow,
      row: targetRow,
      col: 18,
      matchedDate: targetDay + "/" + targetMonth + "/" + targetYear,
      actual: actualTimestamp,
      statusValue: "Done"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. ACTION: accounts_repopulate_daily (Repopulate Headers & Business Days Q:T) ──
  else if (action === "accounts_repopulate_daily") {
    sheet.getRange("Q1:T1").merge()
         .setValue("daily select atleast yes or no before 10:30 AM")
         .setFontWeight("bold")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setBackground("#1565C0")
         .setFontColor("#ffffff")
         .setFontSize(10);

    sheet.getRange("Q2:T2").merge()
         .setValue("from sspacia site - Invoice Payment Receive Management")
         .setFontWeight("bold")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setBackground("#BBDEFB")
         .setFontColor("#0D47A1")
         .setFontSize(10);

    sheet.getRange("Q3:T3").merge()
         .setValue("dipendra")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setBackground("#f8fafc")
         .setFontSize(10);

    sheet.getRange("Q4:T4").merge()
         .setValue("daily")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle")
         .setBackground("#f8fafc")
         .setFontSize(10);

    var colHeaders = ["Planned", "Actual", "Status", "TimeDelay"];
    for (var h = 0; h < 4; h++) {
      sheet.getRange(5, 17 + h)
           .setValue(colHeaders[h])
           .setFontWeight("bold")
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setBackground("#E0E0E0")
           .setFontColor("#212121")
           .setFontSize(10);
    }

    var dailyChecks = payload.dailyChecks || [];
    var checksMap = {};
    for (var i = 0; i < dailyChecks.length; i++) {
      if (dailyChecks[i].date && dailyChecks[i].timestamp) {
        checksMap[dailyChecks[i].date] = dailyChecks[i].timestamp;
      }
    }

    var plannedDates = payload.plannedDates || [];
    var now = new Date();
    var lastRow = Math.max(sheet.getLastRow(), 25);
    var count = Math.max(plannedDates.length, lastRow - 5);

    for (var idx = 0; idx < count; idx++) {
      var r = 6 + idx;
      var planStr = "";
      var dateKey = "";

      if (idx < plannedDates.length) {
        planStr = plannedDates[idx].planned;
        dateKey = plannedDates[idx].date;
        sheet.getRange(r, 17).setValue(planStr);
      } else {
        planStr = String(sheet.getRange(r, 17).getDisplayValue() || "").trim();
        var match = planStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) {
          var d = Number(match[1]);
          var m = Number(match[2]);
          var y = Number(match[3]);
          dateKey = y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
        }
      }

      if (!planStr) continue;

      sheet.getRange(r, 17)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      var actualVal = checksMap[dateKey] || "";
      if (!actualVal && idx < plannedDates.length && plannedDates[idx].actual) {
        actualVal = plannedDates[idx].actual;
      }
      if (!actualVal) {
        actualVal = String(sheet.getRange(r, 18).getDisplayValue() || "").trim();
      }

      var rCell = sheet.getRange(r, 18);
      if (actualVal) {
        rCell.setValue(actualVal);
      } else {
        rCell.clearContent();
      }
      rCell.setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      var sCell = sheet.getRange(r, 19);
      if (actualVal) {
        sCell.setValue("Done")
             .setBackground("#dcfce7")
             .setFontColor("#166534")
             .setFontWeight("bold");
      } else {
        var isPast = false;
        var pMatch = planStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
        if (pMatch) {
          var pDateObj = new Date(Number(pMatch[3]), Number(pMatch[2]) - 1, Number(pMatch[1]), Number(pMatch[4]), Number(pMatch[5]), Number(pMatch[6]));
          if (pDateObj < now) isPast = true;
        }
        if (isPast) {
          sCell.setValue("Pending")
               .setBackground("#fef3c7")
               .setFontColor("#92400e")
               .setFontWeight("bold");
        } else {
          sCell.setValue("")
               .setBackground(null)
               .setFontColor(null);
        }
      }
      sCell.setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      sheet.getRange(r, 20)
           .setFormula('=IF(OR(ISBLANK(R' + r + '), ISBLANK(Q' + r + ')), "", IF(R' + r + '>Q' + r + ', TEXT(R' + r + '-Q' + r + ', "[h]:mm:ss"), "On Time"))')
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: "accounts_repopulate_daily",
      message: "Daily FMS checks repopulated successfully for rows 6 to " + (5 + count)
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 3. ACTION: accounts_live_planned ─────────────────────────────────────
  else if (action === "accounts_live_planned") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var invoiceLink = String(payload.invoiceLink || "").trim();
    var planned = String(payload.planned || "").trim();

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 6) {
      var vals = sheet.getRange(6, 1, lastRow - 5, 2).getDisplayValues();
      for (var i = 0; i < vals.length; i++) {
        var rMonth = normFmsText(vals[i][0]);
        var rComp = normFmsText(vals[i][1]);
        if (rMonth === normFmsText(invoiceMonth) && rComp === normFmsText(companyName)) {
          targetRow = 6 + i;
          break;
        }
      }
    }

    if (targetRow === -1) {
      targetRow = 6;
      if (lastRow >= 6) {
        var colA = sheet.getRange(6, 1, lastRow - 5, 1).getValues();
        for (var k = 0; k < colA.length; k++) {
          if (!colA[k][0]) {
            targetRow = 6 + k;
            break;
          }
          targetRow = 6 + k + 1;
        }
      }
    }

    sheet.getRange(targetRow, 1, 1, 6).setValues([[
      invoiceMonth,
      companyName,
      invoiceLink,
      planned,
      "",
      "Pending"
    ]]);

    sheet.getRange(targetRow, 1, 1, 7).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(targetRow, 1).setHorizontalAlignment("center");
    sheet.getRange(targetRow, 2).setFontWeight("bold");
    sheet.getRange(targetRow, 4).setHorizontalAlignment("center");
    sheet.getRange(targetRow, 5).setHorizontalAlignment("center");

    var statusCell = sheet.getRange(targetRow, 6);
    statusCell.setHorizontalAlignment("center")
              .setFontWeight("bold")
              .setBackground("#fef3c7")
              .setFontColor("#92400e");

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Live Invoice Planned logged",
      row: targetRow,
      companyName: companyName,
      invoiceMonth: invoiceMonth
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 4. ACTION: accounts_live_actual ──────────────────────────────────────
  else if (action === "accounts_live_actual") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var actualTimestamp = payload.actual || getNowTimestampString();

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 6) {
      var vals = sheet.getRange(6, 1, lastRow - 5, 2).getDisplayValues();
      for (var i = 0; i < vals.length; i++) {
        var rMonth = normFmsText(vals[i][0]);
        var rComp = normFmsText(vals[i][1]);
        if (rMonth === normFmsText(invoiceMonth) && rComp === normFmsText(companyName)) {
          targetRow = 6 + i;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 5).setValue(actualTimestamp).setHorizontalAlignment("center");
      sheet.getRange(targetRow, 6).setValue("Done")
           .setHorizontalAlignment("center")
           .setFontWeight("bold")
           .setBackground("#dcfce7")
           .setFontColor("#166534");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Live Invoice Actual logged",
        row: targetRow,
        actual: actualTimestamp
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "notice",
        message: "Live invoice entry not found in Column A & B for " + companyName + " (" + invoiceMonth + ")"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── 5. ACTION: accounts_old_actual ───────────────────────────────────────
  else if (action === "accounts_old_actual") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var actualTimestamp = payload.actual || getNowTimestampString();

    var targetNormMonth = normFmsText(invoiceMonth);
    var targetNormComp = normFmsText(companyName);

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 6) {
      var dispVals = sheet.getRange(6, 9, lastRow - 5, 6).getDisplayValues();
      
      for (var i = 0; i < dispVals.length; i++) {
        var rMonthDisp = normFmsText(dispVals[i][0]); // Col I
        var rCompDisp = normFmsText(dispVals[i][1]);  // Col J
        var rStatusDisp = String(dispVals[i][5] || "").trim().toLowerCase(); // Col N

        var monthMatch = (rMonthDisp === targetNormMonth || rMonthDisp.indexOf(targetNormMonth) !== -1 || targetNormMonth.indexOf(rMonthDisp) !== -1);
        var compMatch = (rCompDisp === targetNormComp || rCompDisp.indexOf(targetNormComp) !== -1 || targetNormComp.indexOf(rCompDisp) !== -1);

        if (monthMatch && compMatch) {
          if (rStatusDisp !== "done") {
            targetRow = 6 + i;
            break;
          } else if (targetRow === -1) {
            targetRow = 6 + i;
          }
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 13).setValue(actualTimestamp).setHorizontalAlignment("center");
      sheet.getRange(targetRow, 14).setValue("Done")
           .setHorizontalAlignment("center")
           .setFontWeight("bold")
           .setBackground("#dcfce7")
           .setFontColor("#166534");

      sheet.getRange(targetRow, 15)
           .setFormula('=IF(OR(ISBLANK(M' + targetRow + '), ISBLANK(L' + targetRow + ')), "", IF(M' + targetRow + '>L' + targetRow + ', TEXT(M' + targetRow + '-L' + targetRow + ', "[h]:mm:ss"), "On Time"))')
           .setHorizontalAlignment("center");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Old Invoice Actual logged in row " + targetRow,
        row: targetRow,
        actual: actualTimestamp
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "notice",
        message: "Old invoice entry not found in Column I & J for " + companyName + " (" + invoiceMonth + ")"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ── 6. ACTION: accounts_bootstrap_sync ───────────────────────────────────
  else if (action === "accounts_bootstrap_sync") {
    var liveItems = payload.liveItems || [];
    var oldItems = payload.oldItems || [];

    if (liveItems.length > 0) {
      var liveRows = [];
      for (var a = 0; a < liveItems.length; a++) {
        var item = liveItems[a];
        liveRows.push([
          item.invoiceMonth || "",
          item.companyName || "",
          item.invoiceLink || "",
          item.planned || "",
          item.actual || "",
          item.status || "Pending",
          ""
        ]);
      }
      sheet.getRange(6, 1, liveRows.length, 7).setValues(liveRows);
      sheet.getRange(6, 1, liveRows.length, 7).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
      sheet.getRange(6, 1, liveRows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(6, 2, liveRows.length, 1).setFontWeight("bold");
      sheet.getRange(6, 4, liveRows.length, 2).setHorizontalAlignment("center");

      for (var f = 0; f < liveRows.length; f++) {
        var isDone = liveRows[f][5] === "Done";
        sheet.getRange(6 + f, 6)
             .setHorizontalAlignment("center")
             .setFontWeight("bold")
             .setBackground(isDone ? "#dcfce7" : "#fef3c7")
             .setFontColor(isDone ? "#166534" : "#92400e");
      }
    }

    if (oldItems.length > 0) {
      var oldRows = [];
      for (var b = 0; b < oldItems.length; b++) {
        var oItem = oldItems[b];
        var rowIdx = 6 + b;
        var isOldDone = oItem.status === "Done" || Boolean(oItem.actual);
        oldRows.push([
          oItem.invoiceMonth || "",
          oItem.companyName || "",
          oItem.invoiceLink || "",
          oItem.planned || "",
          oItem.actual || "",
          isOldDone ? "Done" : "Pending",
          '=IF(OR(ISBLANK(M' + rowIdx + '), ISBLANK(L' + rowIdx + ')), "", IF(M' + rowIdx + '>L' + rowIdx + ', TEXT(M' + rowIdx + '-L' + rowIdx + ', "[h]:mm:ss"), "On Time"))'
        ]);
      }
      sheet.getRange(6, 9, oldRows.length, 7).setValues(oldRows);
      sheet.getRange(6, 9, oldRows.length, 7).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
      sheet.getRange(6, 9, oldRows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(6, 10, oldRows.length, 1).setFontWeight("bold");
      sheet.getRange(6, 12, oldRows.length, 2).setHorizontalAlignment("center");

      for (var n = 0; n < oldRows.length; n++) {
        var isDoneFinal = oldRows[n][5] === "Done";
        sheet.getRange(6 + n, 14)
             .setHorizontalAlignment("center")
             .setFontWeight("bold")
             .setBackground(isDoneFinal ? "#dcfce7" : "#fef3c7")
             .setFontColor(isDoneFinal ? "#166534" : "#92400e");
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Accounts tab bootstrapped successfully",
      liveCount: liveItems.length,
      oldCount: oldItems.length
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown accounts action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 DEDICATED MODULE: HR CAREER APPLICATIONS + RESUME CV LINK (Tab: "HR")
// ═════════════════════════════════════════════════════════════════════════════

function getHrSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.HR_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HR_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() < 12) {
    var headers = [
      "Date & Time (IST)",
      "Candidate Name",
      "Email Address",
      "Mobile Number",
      "Age",
      "Gender",
      "Educational Qualification",
      "Experience",
      "Applied Position",
      "Address / Location",
      "Resume / CV Link",
      "Status"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight("bold")
         .setBackground("#006064")
         .setFontColor("#ffffff")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleHrApplication(payload) {
  payload = payload || {};
  var sheet = getHrSheet();

  var timestamp = payload.timestamp || getNowTimestampString();
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
  sheet.getRange(nextRow, 1, 1, 12).setValues([[
    timestamp,
    fullName,
    email,
    mobileNo,
    age,
    gender,
    qualification,
    experience,
    appliedPosition,
    address,
    cvUrl,
    status
  ]]);

  sheet.getRange(nextRow, 1, 1, 12).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(nextRow, 1).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 2).setFontWeight("bold");
  sheet.getRange(nextRow, 4).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 5).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 6).setHorizontalAlignment("center");
  
  var statusCell = sheet.getRange(nextRow, 12);
  statusCell.setHorizontalAlignment("center")
            .setFontWeight("bold")
            .setBackground("#E0F2F1")
            .setFontColor("#004D40");

  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Candidate application added to HR tab successfully",
    row: nextRow,
    candidateName: fullName,
    position: appliedPosition,
    cvSaved: cvUrl !== "N/A"
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 SEPARATE DEDICATED MODULE: PURCHASE FMS (Tab: "sspacia-purchase")
// ═════════════════════════════════════════════════════════════════════════════

function getPurchaseSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.PURCHASE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PURCHASE_SHEET_NAME);
  }
  
  if (sheet.getLastRow() < 5) {
    var headers = [
      "Item Description",
      "Planned",
      "Actual",
      "Status",
      "Delay"
    ];
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(5, 1, 1, headers.length)
         .setFontWeight("bold")
         .setBackground("#006064")
         .setFontColor("#ffffff")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle");
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
    var plannedTimestamp = payload.plannedTimestamp || payload.timestamp || getNowTimestampString();
    
    var nextRow = Math.max(sheet.getLastRow() + 1, 6);
    sheet.getRange(nextRow, 1, 1, 4).setValues([[
      itemDesc,
      plannedTimestamp,
      "",
      "Pending"
    ]]);
    
    sheet.getRange(nextRow, 1, 1, 4).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(nextRow, 1).setFontWeight("bold");
    sheet.getRange(nextRow, 2).setHorizontalAlignment("center");
    sheet.getRange(nextRow, 3).setHorizontalAlignment("center");
    
    var statusCell = sheet.getRange(nextRow, 4);
    statusCell.setHorizontalAlignment("center")
              .setFontWeight("bold")
              .setBackground("#fef3c7")
              .setFontColor("#92400e");
              
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Purchase Planned logged successfully",
      row: nextRow,
      itemDescription: itemDesc,
      planned: plannedTimestamp
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === "purchase_actual") {
    var itemName = String(payload.itemName || "").trim().toLowerCase();
    var centerName = String(payload.centerName || "").trim().toLowerCase();
    var actualTimestamp = payload.actualTimestamp || payload.timestamp || getNowTimestampString();
    
    var lastRow = sheet.getLastRow();
    var targetRow = -1;
    
    if (lastRow >= 6) {
      var range = sheet.getRange(6, 1, lastRow - 5, 4);
      var values = range.getValues();
      
      for (var i = values.length - 1; i >= 0; i--) {
        var rowDesc = String(values[i][0] || "").toLowerCase();
        var rowStatus = String(values[i][3] || "").trim().toLowerCase();
        
        if (rowStatus === "pending") {
          if (!itemName || rowDesc.indexOf(itemName) !== -1) {
            targetRow = 6 + i;
            break;
          }
        }
      }
    }
    
    if (targetRow === -1) {
      targetRow = Math.max(sheet.getLastRow() + 1, 6);
      sheet.getRange(targetRow, 1).setValue((payload.itemName || "Consumable Item") + " (" + (payload.centerName || "Centre") + ")").setFontWeight("bold");
      sheet.getRange(targetRow, 2).setValue(actualTimestamp).setHorizontalAlignment("center");
    }
    
    sheet.getRange(targetRow, 3).setValue(actualTimestamp).setHorizontalAlignment("center");
    sheet.getRange(targetRow, 4).setValue("Done")
         .setHorizontalAlignment("center")
         .setFontWeight("bold")
         .setBackground("#dcfce7")
         .setFontColor("#166534");
         
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Purchase Actual recorded successfully",
      row: targetRow,
      actual: actualTimestamp,
      statusValue: "Done"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown purchase action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. BOOK A WORKSPACE TOUR
// ═════════════════════════════════════════════════════════════════════════════
function handleBookATour(payload) {
  payload = payload || {};
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.TOUR_SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.TOUR_SHEET_NAME);
  }
  
  if (sheet.getLastRow() === 0) {
    var headers = [
      "Full Name",
      "Mobile Number (+91)",
      "Email Address",
      "Preferred Office Location",
      "Preferred Visit Date",
      "Submitted At"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
         .setFontWeight("bold")
         .setBackground("#1ab0bc")
         .setFontColor("#ffffff")
         .setHorizontalAlignment("center")
         .setVerticalAlignment("middle");
    sheet.setRowHeight(1, 32);
    sheet.setFrozenRows(1);
  }
  
  var name = String(payload.username || payload.name || "Test Visitor").trim();
  var mobileNo = String(payload.mobileNo || payload.phone || "+91 76003 93779").trim();
  var email = String(payload.email || "sales@sspacia.com").trim();
  var locationName = String(payload.locationName || payload.location || "Premier House (SG Highway)").trim();
  var preferredDate = String(payload.preferredDate || payload.date || "Not Specified").trim();
  var submittedAt = payload.timestamp || getNowTimestampString();
  
  var nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1, 1, 6).setValues([[
    name,
    mobileNo,
    email,
    locationName,
    preferredDate,
    submittedAt
  ]]);
  
  sheet.getRange(nextRow, 1, 1, 6).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(nextRow, 1).setFontWeight("bold");
  sheet.getRange(nextRow, 2).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 5).setHorizontalAlignment("center");
  sheet.getRange(nextRow, 6).setHorizontalAlignment("center");
  
  try {
    var emailSubject = "🚀 New Workspace Tour Booking: " + name + " (" + locationName + ")";
    var emailHtml = 
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">' +
        '<div style="background-color: #1ab0bc; padding: 20px; text-align: center; color: #ffffff;">' +
          '<h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">SSPACIA COWORKING</h2>' +
          '<p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">New Workspace Tour Request Received</p>' +
        '</div>' +
        '<div style="padding: 24px; color: #1e293b; line-height: 1.6;">' +
          '<p style="font-size: 15px; margin-top: 0;">Hello Sales Team,</p>' +
          '<p style="font-size: 14px;">A new visitor has just requested a coworking space tour on the SSPACIA website:</p>' +
          '<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">' +
            '<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; width: 40%; color: #475569;">👤 Full Name:</td><td style="padding: 12px; font-weight: bold; color: #0f172a;">' + name + '</td></tr>' +
            '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">📱 Mobile Number:</td><td style="padding: 12px;"><a href="tel:' + mobileNo + '" style="color: #1ab0bc; text-decoration: none; font-weight: bold;">' + mobileNo + '</a></td></tr>' +
            '<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">✉️ Email Address:</td><td style="padding: 12px;"><a href="mailto:' + email + '" style="color: #1ab0bc; text-decoration: none;">' + email + '</a></td></tr>' +
            '<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #475569;">🏢 Preferred Center:</td><td style="padding: 12px; font-weight: bold; color: #0f172a;">' + locationName + '</td></tr>' +
            '<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px; font-weight: bold; color: #166534; background-color: #dcfce7;">' + preferredDate + '</td></tr>' +
            '<tr><td style="padding: 12px; font-weight: bold; color: #475569;">⏰ Requested At:</td><td style="padding: 12px; color: #64748b;">' + submittedAt + '</td></tr>' +
          '</table>' +
          '<div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; font-size: 13px; color: #166534; margin-top: 20px;">' +
            '⚡ Please call the customer at <strong>' + mobileNo + '</strong> to confirm the tour timing.' +
          '</div>' +
        '</div>' +
        '<div style="background-color: #f8fafc; padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">' +
          'SSPACIA Coworking Solutions Ltd. • Ahmedabad' +
        '</div>' +
      '</div>';
    
    GmailApp.sendEmail(CONFIG.SALES_EMAIL, emailSubject, "New Workspace Tour Booking for " + name, {
      htmlBody: emailHtml,
      replyTo: email || undefined,
      name: "SSPACIA Website"
    });
  } catch (mailErr) {
    Logger.log("❌ Email error: " + mailErr.toString());
  }
  
  return { status: "success", message: "Tour lead saved and email dispatched", row: nextRow };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. DAILY PLANNED CRON (Runs at 1:00 AM every night for "expense fms")
// ═════════════════════════════════════════════════════════════════════════════
function dailyPlanned1AM() {
  var sheet = getFmsSheet();
  var todayStr = getTodayDateString();
  var lastRow = sheet.getLastRow();
  
  var existingKeys = {};
  if (lastRow >= CONFIG.DATA_START_ROW) {
    var range = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, 4);
    var values = range.getValues();
    for (var i = 0; i < values.length; i++) {
      var cName = String(values[i][0] || "").trim().toLowerCase();
      var pDate = values[i][1];
      var pDateStr = "";
      if (pDate instanceof Date) {
        pDateStr = getTodayDateString(pDate);
      } else {
        pDateStr = String(pDate || "").trim();
      }
      if (cName && pDateStr) {
        existingKeys[cName + "_" + pDateStr] = true;
      }
    }
  }

  var addedCount = 0;
  for (var k = 0; k < CONFIG.ACTIVE_CENTERS.length; k++) {
    var center = CONFIG.ACTIVE_CENTERS[k];
    var key = center.trim().toLowerCase() + "_" + todayStr;
    
    if (!existingKeys[key]) {
      var nextRow = Math.max(sheet.getLastRow() + 1, CONFIG.DATA_START_ROW);
      sheet.getRange(nextRow, 1, 1, 4).setValues([[
        center,
        todayStr,
        "",
        "Pending"
      ]]);
      
      var rowRange = sheet.getRange(nextRow, 1, 1, 4);
      rowRange.setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
      sheet.getRange(nextRow, 1).setFontWeight("bold");
      sheet.getRange(nextRow, 2).setHorizontalAlignment("center");
      sheet.getRange(nextRow, 3).setHorizontalAlignment("center");
      
      var statusCell = sheet.getRange(nextRow, 4);
      statusCell.setHorizontalAlignment("center")
                .setFontWeight("bold")
                .setBackground("#fef3c7")
                .setFontColor("#92400e");
      
      addedCount++;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. CRON TRIGGER HELPER FOR EXPENSE FMS
// ═════════════════════════════════════════════════════════════════════════════
function setupDaily1AMTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "dailyPlanned1AM") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("dailyPlanned1AM")
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. HTTP GET HANDLER
// ═════════════════════════════════════════════════════════════════════════════
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "SSPACIA MASTER Webhook Engine is online."
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. MAIN WEBHOOK POST ROUTER (100% Live Operations)
// ═════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(contents);
    var action = payload.action || "mark_actual";

    // 🌟 ISOLATED INVOICE WORKFLOW FMS (Tab: "expense fms" Cols F:T & Tab: "Accounts" Cols U:X)
    if (action.indexOf("invoice_fms_") === 0) {
      return handleInvoiceWorkflowFms(payload);
    }

    // 🌟 ISOLATED SUSPENSE ADVANCE PAYMENT FMS (Tab: "expense fms", Cols V to AA)
    if (action.indexOf("suspense") === 0 || (payload.sheetName === "expense fms" && (action === "suspense_planned" || action === "suspense_actual" || action === "suspense_update" || action === "suspense_delete"))) {
      return handleSuspenseFms(payload);
    }

    // 🌟 ISOLATED ACCOUNTS FMS HANDLER (Live, Old Invoices & Daily Check Cols Q:T)
    if (action.indexOf("accounts_") === 0 || payload.sheetName === "Accounts") {
      return handleAccountsFms(payload);
    }

    // 🌟 ISOLATED HR CAREER APPLICATION HANDLER (Now with Resume / CV Link)
    if (action === "hr_application" || payload.sheetName === "HR" || payload.tabName === "HR") {
      return handleHrApplication(payload);
    }

    // 🌟 ISOLATED PURCHASE FMS HANDLER
    if (action === "purchase_planned" || action === "purchase_actual") {
      return handlePurchaseFms(payload);
    }

    // 🌟 BOOK A TOUR HANDLER
    if (action === "book_a_tour") {
      var tourResult = handleBookATour(payload);
      return ContentService.createTextOutput(JSON.stringify(tourResult))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 🌟 DAILY PLANNED CRON
    if (action === "daily_planned") {
      dailyPlanned1AM();
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Daily planned executed" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ── EXPENSE FMS ROUTE (Cols A to D for daily centre expenses) ──
    var centerName = (payload.centerName || "").trim();
    var timestamp = payload.timestamp || getNowTimestampString();
    var targetDate = payload.date || getTodayDateString();
    
    if (!centerName) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "centerName is required" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = getFmsSheet();
    var lastRow = sheet.getLastRow();
    var targetRowIndex = -1;
    var normCenter = normFmsText(centerName);
    
    if (lastRow >= CONFIG.DATA_START_ROW) {
      var dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, 4);
      var values = dataRange.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var rowCenterNorm = normFmsText(values[i][0]);
        var rowDateVal = values[i][1];
        var rowDateStr = (rowDateVal instanceof Date) ? getTodayDateString(rowDateVal) : String(rowDateVal || "").trim();
        
        if ((rowCenterNorm === normCenter || rowCenterNorm.indexOf(normCenter) !== -1 || normCenter.indexOf(rowCenterNorm) !== -1) && (rowDateStr === targetDate)) {
          targetRowIndex = CONFIG.DATA_START_ROW + i;
          break;
        }
      }
      
      if (targetRowIndex === -1) {
        for (var j = values.length - 1; j >= 0; j--) {
          var rCenterNorm = normFmsText(values[j][0]);
          var rStatus = String(values[j][3] || "").trim().toLowerCase();
          if ((rCenterNorm === normCenter || rCenterNorm.indexOf(normCenter) !== -1) && rStatus === "pending") {
            targetRowIndex = CONFIG.DATA_START_ROW + j;
            break;
          }
        }
      }
    }
    
    if (targetRowIndex === -1) {
      targetRowIndex = Math.max(sheet.getLastRow() + 1, CONFIG.DATA_START_ROW);
      sheet.getRange(targetRowIndex, 1).setValue(centerName).setFontWeight("bold");
      sheet.getRange(targetRowIndex, 2).setValue(targetDate).setHorizontalAlignment("center");
    }
    
    var actualCell = sheet.getRange(targetRowIndex, 3);
    var statusCell = sheet.getRange(targetRowIndex, 4);
    
    actualCell.setValue(timestamp).setHorizontalAlignment("center");
    statusCell.setValue("Done")
              .setHorizontalAlignment("center")
              .setFontWeight("bold")
              .setBackground("#dcfce7")
              .setFontColor("#166534");
              
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "FMS Actual recorded successfully for " + centerName,
      row: targetRowIndex,
      actual: timestamp,
      statusValue: "Done"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
