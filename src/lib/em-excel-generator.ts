/**
 * em-excel-generator.ts — Generates real .xlsx files matching the exact MIS Summary Sheet Google Sheet layout
 */

import * as XLSX from 'xlsx';
import { FullEmScorecard, formatScorecardPct } from './em-scorecard-engine';

export function generateEmScorecardExcel(scorecard: FullEmScorecard): Buffer {
  const wb = XLSX.utils.book_new();

  const data: any[][] = [];
  const merges: XLSX.Range[] = [];

  // Row 1: Date & Time range
  data.push([
    scorecard.displayDateRange,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    scorecard.startDate,
    scorecard.endDate,
  ]);

  // Row 2: "Scores" merged over Cols H, I, J, K (indices 7, 8, 9, 10)
  data.push(['', '', '', '', '', '', '', 'Scores', '', '', '']);
  merges.push({ s: { r: 1, c: 7 }, e: { r: 1, c: 10 } });

  const headers = [
    'Task/System',
    'KRA',
    'KPI',
    'Benchmark',
    'Last Week Actual %',
    'All Pending Work',
    'Pending Work Done this week',
    'Current Week Planned',
    'Current Week Actual',
    'Current Week Actual %',
    'Next Week Planned',
  ];

  // Helper for numeric/percentage display
  const fmtNum = (val: any) => (val === '' || val === null || val === undefined ? '' : Number(val));

  // Draw each block with its repeated header (matching exact Google Sheet layout)
  scorecard.blocks.forEach((block) => {
    const headerRowIdx = data.length;
    data.push([...headers]);

    const r1 = block.rows[0];
    const r2 = block.rows[1];

    const dataRow1Idx = data.length;
    data.push([
      block.taskTitle,
      r1.kra,
      r1.kpi,
      r1.benchmark || '100%',
      formatScorecardPct(r1.lastWeekActualPct),
      fmtNum(r1.allPendingWork),
      fmtNum(r1.pendingWorkDoneThisWeek),
      fmtNum(r1.currentWeekPlanned),
      fmtNum(r1.currentWeekActual),
      formatScorecardPct(r1.currentWeekActualPct),
      r1.nextWeekPlanned || '',
    ]);

    data.push([
      '',
      r2.kra,
      r2.kpi,
      r2.benchmark || '100%',
      formatScorecardPct(r2.lastWeekActualPct),
      fmtNum(r2.allPendingWork),
      fmtNum(r2.pendingWorkDoneThisWeek),
      fmtNum(r2.currentWeekPlanned),
      fmtNum(r2.currentWeekActual),
      formatScorecardPct(r2.currentWeekActualPct),
      r2.nextWeekPlanned || '',
    ]);

    // Merge Task/System column across Row 1 and Row 2
    merges.push({ s: { r: dataRow1Idx, c: 0 }, e: { r: dataRow1Idx + 1, c: 0 } });
  });

  // Overall Score Block (with its header)
  data.push([...headers]);
  const ovRow1Idx = data.length;
  const ov1 = scorecard.overallScore.workDone;
  const ov2 = scorecard.overallScore.onTime;

  data.push([
    'Overall Score',
    ov1.kra,
    ov1.kpi,
    ov1.benchmark || '100%',
    formatScorecardPct(ov1.lastWeekActualPct),
    fmtNum(ov1.allPendingWork),
    fmtNum(ov1.pendingWorkDoneThisWeek),
    fmtNum(ov1.currentWeekPlanned),
    fmtNum(ov1.currentWeekActual),
    formatScorecardPct(ov1.currentWeekActualPct),
    '',
  ]);

  data.push([
    '',
    ov2.kra,
    ov2.kpi,
    ov2.benchmark || '100%',
    formatScorecardPct(ov2.lastWeekActualPct),
    fmtNum(ov2.allPendingWork),
    fmtNum(ov2.pendingWorkDoneThisWeek),
    fmtNum(ov2.currentWeekPlanned),
    fmtNum(ov2.currentWeekActual),
    formatScorecardPct(ov2.currentWeekActualPct),
    '',
  ]);

  merges.push({ s: { r: ovRow1Idx, c: 0 }, e: { r: ovRow1Idx + 1, c: 0 } });

  // Empty row
  data.push([]);

  // Bottom Box: [ {Centre} CM MIS Score ]
  const boxRowIdx = data.length;
  data.push(['', '', '', `${scorecard.centre} CM MIS Score`, '', '', '']);
  merges.push({ s: { r: boxRowIdx, c: 3 }, e: { r: boxRowIdx, c: 5 } });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;

  // Set column widths
  ws['!cols'] = [
    { wch: 32 }, // Task/System
    { wch: 28 }, // KRA
    { wch: 22 }, // KPI
    { wch: 12 }, // Benchmark
    { wch: 18 }, // Last Week Actual %
    { wch: 16 }, // All Pending Work
    { wch: 24 }, // Pending Work Done this week
    { wch: 20 }, // Current Week Planned
    { wch: 18 }, // Current Week Actual
    { wch: 20 }, // Current Week Actual %
    { wch: 16 }, // Next Week Planned
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'MIS Summary Sheet');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
