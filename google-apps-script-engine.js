/**
 * =============================================================================
 * SSPACIA MASTER GOOGLE APPS SCRIPT ENGINE
 * 1. EXPENSE FMS (Tab: "expense fms")
 * 2. BOOK A WORKSPACE TOUR (Tab: "book a tour" + Automatic Sales Email)
 * 3. PURCHASE FMS (Tab: "sspacia-purchase" - Dedicated Isolated Module)
 * 4. HR CAREER APPLICATIONS + RESUME CV LINK (Tab: "HR" - Dedicated Isolated Module)
 * 5. ACCOUNTS FMS (Tab: "Accounts" - Live, Old Invoices & Daily Payment Check Col R)
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
    throw new Error("Sheet tab '" + CONFIG.SHEET_NAME + "' not found in spreadsheet.");
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

// ═════════════════════════════════════════════════════════════════════════════
// 🌟 DEDICATED MODULE: ACCOUNTS FMS (Tab: "Accounts")
// Columns A to G: Live Invoices (Planned & Actual)
// Column H: Spacer
// Columns I to O: Old Invoices Archive (Planned & Actual)
// Column P: Spacer
// Column Q: Planned Date (e.g. 11/18/2026 10:30:00)
// Column R: Daily Check Actual Timestamp (M/d/yyyy HH:mm:ss)
// Column S: Status (Empty)
// Column T: TimeDelay (Empty)
// ═════════════════════════════════════════════════════════════════════════════

function getAccountsSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.ACCOUNTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ACCOUNTS_SHEET_NAME);
  }
  return sheet;
}

function handleAccountsFms(payload) {
  payload = payload || {};
  var action = payload.action;
  var sheet = getAccountsSheet();

  // ── 1. ACTION: accounts_daily_fms_check / accounts_daily_check ────────────
  // (When Accountant clicks Manage Payment and marks YES / NO before 10:30 AM)
  // Matches the Planned Date in Column Q (Column 17) and stores the Actual Timestamp
  // in Column R (Column 18) of the EXACT corresponding row.
  // If a day was skipped, that row's Column R remains EMPTY.
  if (action === "accounts_daily_fms_check" || action === "accounts_daily_check") {
    var actualTimestamp = payload.actual || payload.actualTimestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "M/d/yyyy HH:mm:ss");

    // Determine target check date (default to today in IST)
    var checkDate = new Date();
    if (payload.date) {
      // payload.date format: "YYYY-MM-DD"
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

    // Search Column Q (Column 17) for the row matching target check date
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
          // Parse formats like "11/18/2026 10:30:00", "11/18/2026", "2026-11-18", etc.
          var match = dispVal.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
          if (match) {
            var p1 = parseInt(match[1], 10);
            var p2 = parseInt(match[2], 10);
            var p3 = parseInt(match[3], 10);

            if (p1 > 1000) {
              // YYYY-MM-DD
              qYear = p1; qMonth = p2; qDay = p3;
            } else if (p3 > 1000) {
              qYear = p3;
              if (p1 > 12) {
                // D/M/YYYY
                qDay = p1; qMonth = p2;
              } else if (p2 > 12) {
                // M/D/YYYY
                qMonth = p1; qDay = p2;
              } else {
                // Column Q uses M/D/YYYY as shown in spreadsheet
                qMonth = p1; qDay = p2;
              }
            }
          }
        }

        // Compare target date with Planned Date in Column Q
        if (qDay === targetDay && qMonth === targetMonth && qYear === targetYear) {
          targetRow = 6 + i;
          break;
        }
      }
    }

    // Fallback: If matching planned row not found in Column Q, find first empty row in Col Q
    if (targetRow === -1) {
      for (var r = 6; r <= lastRow + 1; r++) {
        var qValCheck = sheet.getRange(r, 17).getValue();
        if (!qValCheck || String(qValCheck).trim() === "") {
          targetRow = r;
          break;
        }
      }
      if (targetRow === -1) targetRow = lastRow + 1;

      // Create the Planned Date entry in Column Q
      sheet.getRange(targetRow, 17)
           .setValue(targetMonth + "/" + targetDay + "/" + targetYear + " 10:30:00")
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);
    }

    // Write actual timestamp to Column R ONLY in the exact corresponding row!
    var cell = sheet.getRange(targetRow, 18);
    cell.setValue(actualTimestamp)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle")
        .setFontFamily("Roboto")
        .setFontSize(10);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Daily FMS check logged to Column R in matching row " + targetRow,
      row: targetRow,
      col: 18,
      matchedDate: targetMonth + "/" + targetDay + "/" + targetYear,
      actual: actualTimestamp
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ── 2. ACTION: accounts_live_planned (When CM approves live invoice) ──────
  if (action === "accounts_live_planned") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var invoiceLink = String(payload.invoiceLink || "").trim();
    var planned = String(payload.planned || "").trim();

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    // Search Columns A & B for existing entry
    if (lastRow >= 6) {
      var vals = sheet.getRange(6, 1, lastRow - 5, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        var rMonth = String(vals[i][0] || "").trim().toLowerCase();
        var rComp = String(vals[i][1] || "").trim().toLowerCase();
        if (rMonth === invoiceMonth.toLowerCase() && rComp === companyName.toLowerCase()) {
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

  // ── 3. ACTION: accounts_live_actual (When Accountant marks payment details & balance = 0) ──
  if (action === "accounts_live_actual") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var actualTimestamp = payload.actual || getNowTimestampString();

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 6) {
      var vals = sheet.getRange(6, 1, lastRow - 5, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        var rMonth = String(vals[i][0] || "").trim().toLowerCase();
        var rComp = String(vals[i][1] || "").trim().toLowerCase();
        if (rMonth === invoiceMonth.toLowerCase() && rComp === companyName.toLowerCase()) {
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

  // ── 4. ACTION: accounts_old_actual (When payment details updated on old invoice) ──
  if (action === "accounts_old_actual") {
    var invoiceMonth = String(payload.invoiceMonth || "").trim();
    var companyName = String(payload.companyName || "").trim();
    var actualTimestamp = payload.actual || getNowTimestampString();

    var lastRow = sheet.getLastRow();
    var targetRow = -1;

    if (lastRow >= 6) {
      var vals = sheet.getRange(6, 9, lastRow - 5, 2).getValues();
      for (var i = 0; i < vals.length; i++) {
        var rMonth = String(vals[i][0] || "").trim().toLowerCase();
        var rComp = String(vals[i][1] || "").trim().toLowerCase();
        if (rMonth === invoiceMonth.toLowerCase() && rComp === companyName.toLowerCase()) {
          targetRow = 6 + i;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 13).setValue(actualTimestamp).setHorizontalAlignment("center"); // Col M
      sheet.getRange(targetRow, 14).setValue("Done") // Col N
           .setHorizontalAlignment("center")
           .setFontWeight("bold")
           .setBackground("#dcfce7")
           .setFontColor("#166534");

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Old Invoice Actual logged",
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

  // ── 5. ACTION: accounts_bootstrap_sync (One-time batch population for Live & Old Invoices) ──
  if (action === "accounts_bootstrap_sync") {
    var liveItems = payload.liveItems || [];
    var oldItems = payload.oldItems || [];

    // Populate Live Invoices in Columns A to G
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
          "" // TimeDelay
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

    // Populate Old Invoices in Columns I to O
    if (oldItems.length > 0) {
      var oldRows = [];
      for (var b = 0; b < oldItems.length; b++) {
        var oItem = oldItems[b];
        oldRows.push([
          oItem.invoiceMonth || "",
          oItem.companyName || "",
          oItem.invoiceLink || "",
          oItem.planned || "",
          oItem.actual || "",
          oItem.status || "Pending",
          "" // TimeDelay
        ]);
      }
      sheet.getRange(6, 9, oldRows.length, 7).setValues(oldRows);
      sheet.getRange(6, 9, oldRows.length, 7).setFontFamily("Roboto").setFontSize(10).setVerticalAlignment("middle");
      sheet.getRange(6, 9, oldRows.length, 1).setHorizontalAlignment("center");
      sheet.getRange(6, 10, oldRows.length, 1).setFontWeight("bold");
      sheet.getRange(6, 12, oldRows.length, 2).setHorizontalAlignment("center");

      for (var n = 0; n < oldRows.length; n++) {
        var isOldDone = oldRows[n][5] === "Done";
        sheet.getRange(6 + n, 14)
             .setHorizontalAlignment("center")
             .setFontWeight("bold")
             .setBackground(isOldDone ? "#dcfce7" : "#fef3c7")
             .setFontColor(isOldDone ? "#166534" : "#92400e");
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
// 1. BOOK A WORKSPACE TOUR (EXISTING)
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
// 🌟 DEDICATED MODULE: SUSPENSE ADVANCE PAYMENT FMS (Tab: "expense fms")
// Columns V to AA:
// Col V (Col 22): pay receive date (merged 3 rows across mercado, premier house, agarwal complex)
// Col W (Col 23): suspense payment type (merged 3 rows)
// Col X (Col 24): center (Row 1: mercado, Row 2: premier house, Row 3: agarwal complex)
// Col Y (Col 25): planned (merged 3 rows: e.g. "14/09/2026 10:45:34 - 14/09/2026 14:45:34")
// Col Z (Col 26): actual (exact timestamp when CM accepts or rejects for that center)
// Col AA (Col 27): status (Pending -> Done / Overdue)
// Col AB (Col 28): delay (user reserved)
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
      var val1 = sheet.getRange(r, 24).getValue();
      var val2 = sheet.getRange(r + 1, 24).getValue();
      var val3 = sheet.getRange(r + 2, 24).getValue();

      if ((!val1 || String(val1).trim() === "") &&
          (!val2 || String(val2).trim() === "") &&
          (!val3 || String(val3).trim() === "")) {
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

    // Set Center names in Col X (Col 24)
    for (var c = 0; c < 3; c++) {
      var cRow = targetStartRow + c;
      var cCell = sheet.getRange(cRow, 24);
      cCell.setValue(centersList[c])
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      // Col Z (Actual): Empty
      sheet.getRange(cRow, 26).clearContent();

      // Col AA (Status): "Pending"
      var statCell = sheet.getRange(cRow, 27);
      statCell.setValue("Pending")
              .setHorizontalAlignment("center")
              .setVerticalAlignment("middle")
              .setFontFamily("Roboto")
              .setFontSize(10);
    }

    // Merge Col V (Col 22) across 3 rows for Pay Receive Date
    var vRange = sheet.getRange(targetStartRow, 22, 3, 1);
    vRange.merge();
    vRange.setValue(payReceiveDate)
          .setHorizontalAlignment("center")
          .setVerticalAlignment("middle")
          .setFontFamily("Roboto")
          .setFontSize(10);

    // Merge Col W (Col 23) across 3 rows for Suspense Payment Type
    var wRange = sheet.getRange(targetStartRow, 23, 3, 1);
    wRange.merge();
    wRange.setValue(suspensePaymentType)
          .setHorizontalAlignment("center")
          .setVerticalAlignment("middle")
          .setFontFamily("Roboto")
          .setFontSize(10);

    // Merge Col Y (Col 25) across 3 rows for Planned Timestamp Range
    var yRange = sheet.getRange(targetStartRow, 25, 3, 1);
    yRange.merge();
    yRange.setValue(planned)
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
  if (action === "suspense_actual") {
    var centerName = String(payload.centerName || "").toLowerCase().trim();
    var actualTimestamp = String(payload.actual || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss")).trim();
    var statusVal = String(payload.status || "Done").trim();
    var rowStart = payload.rowStart ? Number(payload.rowStart) : -1;

    var targetRow = -1;

    // Direct row lookup if rowStart was passed
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

    // Fallback: search backwards from lastRow
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
      // Set Col Z (Actual)
      sheet.getRange(targetRow, 26)
           .setValue(actualTimestamp)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

      // Set Col AA (Status)
      sheet.getRange(targetRow, 27)
           .setValue(statusVal)
           .setHorizontalAlignment("center")
           .setVerticalAlignment("middle")
           .setFontFamily("Roboto")
           .setFontSize(10);

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

  return ContentService.createTextOutput(JSON.stringify({
    status: "error",
    message: "Unknown suspense action: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. MAIN WEBHOOK POST ROUTER
// ═════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : "{}";
    var payload = JSON.parse(contents);
    var action = payload.action || "mark_actual";

    // 🌟 ISOLATED SUSPENSE FMS HANDLER (Tab: "expense fms", Columns V to AA)
    if (action === "suspense_planned" || action === "suspense_actual") {
      return handleSuspenseFms(payload);
    }

    // 🌟 ISOLATED ACCOUNTS FMS HANDLER (Live, Old Invoices & Daily Check)
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
    
    // ── EXPENSE FMS ROUTE ──
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
    var normCenter = centerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (lastRow >= CONFIG.DATA_START_ROW) {
      var dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, 4);
      var values = dataRange.getValues();
      
      for (var i = 0; i < values.length; i++) {
        var rowCenterNorm = String(values[i][0] || "").toLowerCase().replace(/[^a-z0-9]/g, '');
        var rowDateVal = values[i][1];
        var rowDateStr = (rowDateVal instanceof Date) ? getTodayDateString(rowDateVal) : String(rowDateVal || "").trim();
        
        if ((rowCenterNorm === normCenter || rowCenterNorm.indexOf(normCenter) !== -1 || normCenter.indexOf(rowCenterNorm) !== -1) && (rowDateStr === targetDate)) {
          targetRowIndex = CONFIG.DATA_START_ROW + i;
          break;
        }
      }
      
      if (targetRowIndex === -1) {
        for (var j = values.length - 1; j >= 0; j--) {
          var rCenterNorm = String(values[j][0] || "").toLowerCase().replace(/[^a-z0-9]/g, '');
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

// ═════════════════════════════════════════════════════════════════════════════
// 5. HELPER TEST FUNCTIONS (Run directly from Apps Script Toolbar)
// ═════════════════════════════════════════════════════════════════════════════

function testAccountsDailyFmsCheck() {
  var testPayload = {
    action: "accounts_daily_fms_check",
    actual: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "M/d/yyyy HH:mm:ss"),
    targetDay: 19,
    targetMonth: 11,
    targetYear: 2026,
    date: "2026-11-19"
  };
  var result = handleAccountsFms(testPayload);
  Logger.log(JSON.stringify(result));
}

function testBookATour() {
  var testPayload = {
    username: "Rahul Sharma (Test)",
    mobileNo: "+91 76003 93779",
    email: "sales@sspacia.com",
    locationName: "Premier House - SG Highway, Bodakdev",
    preferredDate: "20/08/2026",
    timestamp: getNowTimestampString()
  };
  var result = handleBookATour(testPayload);
  Logger.log(JSON.stringify(result));
}

function testAccountsLivePlanned() {
  var testPayload = {
    action: "accounts_live_planned",
    invoiceMonth: "September 2026",
    companyName: "SSPACIA Test Client Pvt Ltd",
    invoiceLink: "https://sspacia.in/invoices/test.pdf",
    planned: "5 Sep 2026 10:00:00"
  };
  var result = handleAccountsFms(testPayload);
  Logger.log(JSON.stringify(result));
}

function testAccountsLiveActual() {
  var testPayload = {
    action: "accounts_live_actual",
    invoiceMonth: "September 2026",
    companyName: "SSPACIA Test Client Pvt Ltd",
    actual: getNowTimestampString()
  };
  var result = handleAccountsFms(testPayload);
  Logger.log(JSON.stringify(result));
}
