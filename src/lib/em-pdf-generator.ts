/**
 * em-pdf-generator.ts — Executive Meeting (EM) / MIS Scorecard PDF Generator
 * Creates landscape A4 PDF reports matching the EXACT tabular layout of the MIS Summary Sheet.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FullEmScorecard, formatScorecardPct } from './em-scorecard-engine';

export async function generateEmScorecardPdf(scorecard: FullEmScorecard): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Landscape A4: 842 x 595 points
  const page = pdfDoc.addPage([842, 595]);

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const marginX = 24;
  let currentY = height - 24;

  // Colors
  const black = rgb(0.1, 0.1, 0.1);
  const headerBg = rgb(0.94, 0.94, 0.94);
  const white = rgb(1, 1, 1);
  const overallBg = rgb(0.98, 0.98, 0.98);
  const borderGray = rgb(0.65, 0.65, 0.65);
  const greenText = rgb(0.06, 0.5, 0.25);
  const redText = rgb(0.75, 0.15, 0.15);

  // Column Dimensions (Total printable width = 842 - 48 = 794 pt)
  const cols = [
    { name: 'Task/System', w: 154 },
    { name: 'KRA', w: 110 },
    { name: 'KPI', w: 85 },
    { name: 'Benchmark', w: 50 },
    { name: 'Last Week Actual %', w: 65 },
    { name: 'All Pending Work', w: 60 },
    { name: 'Pending Work Done this week', w: 75 },
    { name: 'Current Week Planned', w: 60 },
    { name: 'Current Week Actual', w: 55 },
    { name: 'Current Week Actual %', w: 50 },
    { name: 'Next Week Planned', w: 30 },
  ];

  const totalTableW = cols.reduce((sum, c) => sum + c.w, 0); // 794 pt

  // 1. Top Meta Row: Date & Period
  const topH = 16;
  page.drawText(`${scorecard.displayDateRange}  |  Centre: ${scorecard.centre}`, {
    x: marginX + 4,
    y: currentY - 12,
    size: 9,
    font: fontBold,
    color: black,
  });

  const rangeText = `${scorecard.startDate}   to   ${scorecard.endDate}`;
  const rangeW = fontRegular.widthOfTextAtSize(rangeText, 8.5);
  page.drawText(rangeText, {
    x: marginX + totalTableW - rangeW - 4,
    y: currentY - 12,
    size: 8.5,
    font: fontRegular,
    color: black,
  });

  currentY -= topH + 4;

  // 2. "Scores" banner above columns 7 to 10 (Current Week Planned -> Next Week Planned)
  const scoresStartX = marginX + cols.slice(0, 7).reduce((sum, c) => sum + c.w, 0);
  const scoresW = cols.slice(7).reduce((sum, c) => sum + c.w, 0);
  const scoresH = 14;

  page.drawRectangle({
    x: scoresStartX,
    y: currentY - scoresH,
    width: scoresW,
    height: scoresH,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  const scoresLabel = 'Scores';
  const slW = fontBold.widthOfTextAtSize(scoresLabel, 8);
  page.drawText(scoresLabel, {
    x: scoresStartX + (scoresW - slW) / 2,
    y: currentY - scoresH + 3.5,
    size: 8,
    font: fontBold,
    color: black,
  });

  currentY -= scoresH;

  // Helper to draw text with truncation
  function drawCellText(
    text: string,
    x: number,
    y: number,
    colW: number,
    rowH: number,
    isBold = false,
    color = black,
    alignCenter = false,
    alignRight = false,
    fontSize = 7
  ) {
    if (!text) return;
    const font = isBold ? fontBold : fontRegular;
    const maxW = colW - 6;

    let printText = text;
    if (font.widthOfTextAtSize(printText, fontSize) > maxW) {
      while (printText.length > 3 && font.widthOfTextAtSize(printText + '..', fontSize) > maxW) {
        printText = printText.substring(0, printText.length - 1);
      }
      printText += '..';
    }

    const tW = font.widthOfTextAtSize(printText, fontSize);
    let textX = x + 3;
    if (alignCenter) {
      textX = x + (colW - tW) / 2;
    } else if (alignRight) {
      textX = x + colW - tW - 4;
    }

    const textY = y + (rowH - fontSize) / 2;
    page.drawText(printText, {
      x: textX,
      y: textY,
      size: fontSize,
      font,
      color,
    });
  }

  // Draw a standard repeated header row
  function drawHeaderRow(y: number): number {
    const rowH = 16;
    let curX = marginX;

    cols.forEach((col) => {
      page.drawRectangle({
        x: curX,
        y: y - rowH,
        width: col.w,
        height: rowH,
        color: headerBg,
        borderColor: borderGray,
        borderWidth: 0.5,
      });

      drawCellText(col.name, curX, y - rowH, col.w, rowH, true, black, true, false, 6.8);
      curX += col.w;
    });

    return y - rowH;
  }

  // Helper for numbers
  const fmtNum = (val: any) => (val === '' || val === null || val === undefined ? '' : String(val));

  // 3. Draw each Task Block
  scorecard.blocks.forEach((block) => {
    const rowBg = white;
    const rowH = 16;
    const blockDataH = rowH * 2; // 32 pt for the 2 rows

    // Draw Block Header
    currentY = drawHeaderRow(currentY);

    // Row 1 & Row 2 Y coordinates
    const r1Y = currentY - rowH;
    const r2Y = currentY - rowH * 2;

    const r1 = block.rows[0];
    const r2 = block.rows[1];

    // Draw Column 1 (Task/System) spanning both rows
    page.drawRectangle({
      x: marginX,
      y: r2Y,
      width: cols[0].w,
      height: blockDataH,
      color: rowBg,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    drawCellText(block.taskTitle, marginX, r2Y, cols[0].w, blockDataH, true, black, false, false, 7.2);

    // Draw remaining columns for Row 1 (Work Done)
    let curX = marginX + cols[0].w;
    const r1Values = [
      { text: r1.kra, center: false, right: false },
      { text: r1.kpi, center: false, right: false },
      { text: r1.benchmark || '100%', center: true, right: false },
      { text: formatScorecardPct(r1.lastWeekActualPct), center: true, right: false },
      { text: fmtNum(r1.allPendingWork), center: true, right: false },
      { text: fmtNum(r1.pendingWorkDoneThisWeek), center: true, right: false },
      { text: fmtNum(r1.currentWeekPlanned), center: true, right: false },
      { text: fmtNum(r1.currentWeekActual), center: true, right: false },
      { text: formatScorecardPct(r1.currentWeekActualPct), center: false, right: true },
      { text: fmtNum(r1.nextWeekPlanned), center: true, right: false },
    ];

    r1Values.forEach((val, idx) => {
      const col = cols[idx + 1];
      page.drawRectangle({
        x: curX,
        y: r1Y,
        width: col.w,
        height: rowH,
        color: rowBg,
        borderColor: borderGray,
        borderWidth: 0.5,
      });

      let textColor = black;
      if (idx === 8 && val.text.endsWith('%')) {
        const num = parseFloat(val.text);
        if (!isNaN(num)) textColor = num < 0 ? redText : greenText;
      }

      drawCellText(val.text, curX, r1Y, col.w, rowH, false, textColor, val.center, val.right, 7);
      curX += col.w;
    });

    // Draw remaining columns for Row 2 (On Time)
    curX = marginX + cols[0].w;
    const r2Values = [
      { text: r2.kra, center: false, right: false },
      { text: r2.kpi, center: false, right: false },
      { text: r2.benchmark || '100%', center: true, right: false },
      { text: formatScorecardPct(r2.lastWeekActualPct), center: true, right: false },
      { text: fmtNum(r2.allPendingWork), center: true, right: false },
      { text: fmtNum(r2.pendingWorkDoneThisWeek), center: true, right: false },
      { text: fmtNum(r2.currentWeekPlanned), center: true, right: false },
      { text: fmtNum(r2.currentWeekActual), center: true, right: false },
      { text: formatScorecardPct(r2.currentWeekActualPct), center: false, right: true },
      { text: fmtNum(r2.nextWeekPlanned), center: true, right: false },
    ];

    r2Values.forEach((val, idx) => {
      const col = cols[idx + 1];
      page.drawRectangle({
        x: curX,
        y: r2Y,
        width: col.w,
        height: rowH,
        color: rowBg,
        borderColor: borderGray,
        borderWidth: 0.5,
      });

      let textColor = black;
      if (idx === 8 && val.text.endsWith('%')) {
        const num = parseFloat(val.text);
        if (!isNaN(num)) textColor = num < 0 ? redText : greenText;
      }

      drawCellText(val.text, curX, r2Y, col.w, rowH, false, textColor, val.center, val.right, 7);
      curX += col.w;
    });

    currentY = r2Y - 1; // tight spacing matching spreadsheet
  });

  // 4. Overall Score Block
  currentY = drawHeaderRow(currentY);

  const rowH = 16;
  const blockDataH = rowH * 2;
  const ov1Y = currentY - rowH;
  const ov2Y = currentY - rowH * 2;

  const ov1 = scorecard.overallScore.workDone;
  const ov2 = scorecard.overallScore.onTime;

  // Task/System spanning Overall Score
  page.drawRectangle({
    x: marginX,
    y: ov2Y,
    width: cols[0].w,
    height: blockDataH,
    color: overallBg,
    borderColor: borderGray,
    borderWidth: 0.5,
  });

  drawCellText('Overall Score', marginX, ov2Y, cols[0].w, blockDataH, true, black, false, false, 7.5);

  // Overall Row 1
  let curX = marginX + cols[0].w;
  const ov1Values = [
    { text: ov1.kra, center: false, right: false },
    { text: ov1.kpi, center: false, right: false },
    { text: ov1.benchmark || '100%', center: true, right: false },
    { text: formatScorecardPct(ov1.lastWeekActualPct), center: true, right: false },
    { text: fmtNum(ov1.allPendingWork), center: true, right: false },
    { text: fmtNum(ov1.pendingWorkDoneThisWeek), center: true, right: false },
    { text: fmtNum(ov1.currentWeekPlanned), center: true, right: false },
    { text: fmtNum(ov1.currentWeekActual), center: true, right: false },
    { text: formatScorecardPct(ov1.currentWeekActualPct), center: false, right: true },
    { text: '', center: true, right: false },
  ];

  ov1Values.forEach((val, idx) => {
    const col = cols[idx + 1];
    page.drawRectangle({
      x: curX,
      y: ov1Y,
      width: col.w,
      height: rowH,
      color: overallBg,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    let textColor = black;
    if (idx === 8 && val.text.endsWith('%')) {
      const num = parseFloat(val.text);
      if (!isNaN(num)) textColor = num < 0 ? redText : greenText;
    }

    drawCellText(val.text, curX, ov1Y, col.w, rowH, true, textColor, val.center, val.right, 7);
    curX += col.w;
  });

  // Overall Row 2
  curX = marginX + cols[0].w;
  const ov2Values = [
    { text: ov2.kra, center: false, right: false },
    { text: ov2.kpi, center: false, right: false },
    { text: ov2.benchmark || '100%', center: true, right: false },
    { text: formatScorecardPct(ov2.lastWeekActualPct), center: true, right: false },
    { text: fmtNum(ov2.allPendingWork), center: true, right: false },
    { text: fmtNum(ov2.pendingWorkDoneThisWeek), center: true, right: false },
    { text: fmtNum(ov2.currentWeekPlanned), center: true, right: false },
    { text: fmtNum(ov2.currentWeekActual), center: true, right: false },
    { text: formatScorecardPct(ov2.currentWeekActualPct), center: false, right: true },
    { text: '', center: true, right: false },
  ];

  ov2Values.forEach((val, idx) => {
    const col = cols[idx + 1];
    page.drawRectangle({
      x: curX,
      y: ov2Y,
      width: col.w,
      height: rowH,
      color: overallBg,
      borderColor: borderGray,
      borderWidth: 0.5,
    });

    let textColor = black;
    if (idx === 8 && val.text.endsWith('%')) {
      const num = parseFloat(val.text);
      if (!isNaN(num)) textColor = num < 0 ? redText : greenText;
    }

    drawCellText(val.text, curX, ov2Y, col.w, rowH, true, textColor, val.center, val.right, 7);
    curX += col.w;
  });

  currentY = ov2Y - 14;

  // 5. Centered Box: [ Mercado CM MIS Score ]
  const boxW = 180;
  const boxH = 20;
  const boxX = marginX + (totalTableW - boxW) / 2;

  page.drawRectangle({
    x: boxX,
    y: currentY - boxH,
    width: boxW,
    height: boxH,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  const boxTitle = `${scorecard.centre} CM MIS Score`;
  const btW = fontBold.widthOfTextAtSize(boxTitle, 8.5);
  page.drawText(boxTitle, {
    x: boxX + (boxW - btW) / 2,
    y: currentY - boxH + 6,
    size: 8.5,
    font: fontBold,
    color: black,
  });

  // Footer Note
  page.drawText(`SSPACIA Executive MIS System | Standard BMP MIS Format | Confidential`, {
    x: marginX,
    y: 14,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}
