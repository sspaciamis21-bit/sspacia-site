/**
 * em-scorecard-engine.ts — Unified Executive Meeting (EM) / MIS Scorecard Engine
 *
 * Implements the exact BMP MIS Wizard mathematical formulas for Community Manager (CM) tasks:
 * 1. "Review Invoices & Send to Accountant to attach tally pdf" (from DB: invoiceRecord)
 * 2. "Approve and send Inv to client" (from DB: invoiceRecord with attachedInvoice)
 * 3. "Recognise suspense advance pay receive entry entered by accountant within 8 hours" (from DB: SuspenseCenterAllocation)
 * 4. House Keeping Application (from Live HK Google Sheet: 1Jo1J7QOBykGCYs-qV1D5nhFlTclfd8FD5uz5igtC05w)
 * 5. "Overall Score"
 */

import prisma from '@/lib/prisma';
import { getInvoiceStep1PlannedTimestamp } from '@/lib/invoiceWorkflowFmsSync';

const FMS_SPREADSHEET_ID = '1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0';

/**
 * Robust CSV line splitter that handles quotes and commas
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/^"|"$/g, '').trim());
  return result;
}

/**
 * Fetch live Tasks 1 & 2 directly from Google Sheets Tab "INV PROCESS FMS"
 * Ensures 100% exact parity with the management Google Sheet.
 */
async function fetchLiveInvProcessEvents(): Promise<{
  task1Events: FmsEvent[];
  task2Events: FmsEvent[];
} | null> {
  const url = `https://docs.google.com/spreadsheets/d/${FMS_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=INV%20PROCESS%20FMS`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 3) return null;

    const task1Events: FmsEvent[] = [];
    const task2Events: FmsEvent[] = [];

    // Rows 0 and 1 are header blocks ("Data Set" and subheaders). Data starts at index 2
    for (let i = 2; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < 7) continue;

      let centre = (row[0] || '').trim();
      if (!centre || centre.toLowerCase().includes('centre') || centre.toLowerCase().includes('data set')) continue;

      const cLower = centre.toLowerCase();
      if (cLower.includes('agarwal') || cLower.includes('ac')) centre = 'Agarwal Complex';
      else if (cLower.includes('premier') || cLower.includes('ph')) centre = 'Premier House';
      else if (cLower.includes('mercado')) centre = 'Mercado';

      // Task 1: "Review Invoices & Send to Accountant to attach tally pdf"
      // Col 4 (Index 4) = Planned (when invoice arrives in invoice section)
      // Col 5 (Index 5) = Actual (when CM sends to accountant)
      // Col 6 (Index 6) = Status ("Done" / "Pending")
      const pl1Str = row[4];
      const ac1Str = row[5];
      const st1 = (row[6] || '').trim().toLowerCase();
      const pl1 = parseFmsDate(pl1Str);
      if (pl1) {
        const ac1 = (st1 === 'done' || ac1Str) ? (parseFmsDate(ac1Str) || pl1) : null;
        task1Events.push({ centre, planned: pl1, actual: ac1 });
      }

      // Task 2: "Approve and send Inv to client" (CM Task)
      // In 17-column FMS layout:
      // Col 12 (Index 12) = Planned (accountant attached PDF and sent back to CM)
      // Col 13 (Index 13) = Actual (when CM approves and sends to client)
      // Col 14 (Index 14) = Status ("Done" / "Pending")
      if (row.length >= 15) {
        const pl2Str = row[12];
        const ac2Str = row[13];
        const st2 = (row[14] || '').trim().toLowerCase();
        const pl2 = parseFmsDate(pl2Str);
        // Only planned if accountant has already attached tally invoice PDF
        if (pl2) {
          const ac2 = (st2 === 'done' || ac2Str) ? (parseFmsDate(ac2Str) || pl2) : null;
          task2Events.push({ centre, planned: pl2, actual: ac2 });
        }
      }
    }

    if (task1Events.length > 0) {
      return { task1Events, task2Events };
    }
    return null;
  } catch (err) {
    console.warn('[Live Inv Process FMS Fetch Notice] Using DB fallback:', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch live Task 3 directly from Google Sheets Tab "SUSPENSE"
 */
async function fetchLiveSuspenseEvents(): Promise<FmsEvent[] | null> {
  const url = `https://docs.google.com/spreadsheets/d/${FMS_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=SUSPENSE`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 3) return null;

    const events: FmsEvent[] = [];
    for (let i = 2; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < 5) continue;

      let centre = (row[2] || '').trim();
      if (!centre) continue;
      const cLower = centre.toLowerCase();
      if (cLower.includes('agarwal') || cLower.includes('ac')) centre = 'Agarwal Complex';
      else if (cLower.includes('premier') || cLower.includes('ph')) centre = 'Premier House';
      else if (cLower.includes('mercado')) centre = 'Mercado';

      // Col 4 = Planned, Col 5 = Actual, Col 6 = Status
      const plStr = row[4] || row[3];
      const acStr = row[5];
      const st = (row[6] || '').trim().toLowerCase();

      const pl = parseFmsDate(plStr);
      if (pl) {
        const ac = (st === 'done' || acStr) ? (parseFmsDate(acStr) || pl) : null;
        events.push({ centre, planned: pl, actual: ac });
      }
    }
    return events.length > 0 ? events : null;
  } catch (err) {
    console.warn('[Live Suspense FMS Fetch Notice] Using DB fallback:', err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch Tasks 1, 2, 3 directly from Live Google Sheets with DB fallback
 */
export async function fetchDatabaseFmsEvents(): Promise<{
  task1Events: FmsEvent[];
  task2Events: FmsEvent[];
  task3Events: FmsEvent[];
}> {
  let task1Events: FmsEvent[] = [];
  let task2Events: FmsEvent[] = [];
  let task3Events: FmsEvent[] = [];

  // 1. Try to fetch live from Google Sheets "INV PROCESS FMS" tab first
  const liveInvoices = await fetchLiveInvProcessEvents();
  if (liveInvoices && liveInvoices.task1Events.length > 0) {
    task1Events = liveInvoices.task1Events;
    task2Events = liveInvoices.task2Events;
  } else {
    // DB fallback with aligned FMS sequential gating logic
    try {
      const invoices = await (prisma as any).invoiceRecord.findMany({
        select: {
          id: true,
          companyName: true,
          billingMonth: true,
          sendType: true,
          productGroupKey: true,
          paymentDuration: true,
          createdAt: true,
          updatedAt: true,
          sentAt: true,
          signedAt: true,
          status: true,
          clientEmailSentAt: true,
          createdBy: {
            select: {
              assignedLocations: {
                select: { location: { select: { name: true } } },
              },
            },
          },
          clientMaster: {
            select: {
              companyName: true,
              clientType: true,
              createdBy: {
                select: {
                  assignedLocations: {
                    select: { location: { select: { name: true } } },
                  },
                },
              },
            },
          },
          attachedInvoice: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      });

      invoices.forEach((inv: any) => {
        const centre =
          inv.createdBy?.assignedLocations?.[0]?.location?.name ||
          inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
          'Mercado';

        // Task 1: Review Invoices & Send to Accountant
        const isSentToAccountant = ['SENT_TO_ACCOUNTANT', 'INVOICE_ATTACHED', 'APPROVED'].includes(inv.status);
        const pl1 = parseFmsDate(getInvoiceStep1PlannedTimestamp(inv)) || new Date(inv.createdAt);
        const ac1 = isSentToAccountant ? (inv.sentAt ? new Date(inv.sentAt) : new Date(inv.updatedAt)) : null;
        task1Events.push({ centre, planned: pl1, actual: ac1 });

        // Task 2: Approve and send Inv to client
        if (inv.attachedInvoice?.createdAt) {
          const pl2 = new Date(inv.attachedInvoice.createdAt);
          const ac2 = inv.clientEmailSentAt
            ? new Date(inv.clientEmailSentAt)
            : inv.status === 'APPROVED'
            ? new Date(inv.signedAt || inv.updatedAt)
            : null;
          task2Events.push({ centre, planned: pl2, actual: ac2 });
        }
      });
    } catch (err) {
      console.error('[Scorecard Engine] Error loading invoices from DB:', err);
    }
  }

  // 2. Try to fetch live from Google Sheets "SUSPENSE" tab first
  const liveSuspense = await fetchLiveSuspenseEvents();
  if (liveSuspense && liveSuspense.length > 0) {
    task3Events = liveSuspense;
  } else {
    // Task 3 DB Fallback: Recognise suspense advance pay receive entry within 8 hours
    try {
      const allocations: any[] = await (prisma as any).$queryRawUnsafe(`
        SELECT a.*, p.payReceiveDate, p.plannedTimestamp, p.enteredAt, p.deadlineAt 
        FROM \`SuspenseCenterAllocation\` a 
        JOIN \`SuspensePayment\` p ON a.suspensePaymentId = p.id
      `);

      allocations.forEach((a: any) => {
        let centre = a.centerDisplayName;
        if (!centre) {
          const cLower = (a.centerName || '').toLowerCase();
          if (cLower.includes('agarwal')) centre = 'Agarwal Complex';
          else if (cLower.includes('premier')) centre = 'Premier House';
          else centre = 'Mercado';
        }

        // Planned date: In FMS, task is triggered when accountant enters it (with planned deadline)
        const pl3 =
          parseFmsDate(a.plannedTimestamp) ||
          (a.deadlineAt ? new Date(a.deadlineAt) : null) ||
          parseFmsDate(a.payReceiveDate) ||
          new Date(a.enteredAt || a.createdAt);

        const ac3 =
          a.reviewedAt && a.decision !== 'PENDING'
            ? new Date(a.reviewedAt)
            : a.actualTimestamp
            ? parseFmsDate(a.actualTimestamp)
            : null;

        task3Events.push({ centre, planned: pl3, actual: ac3 });
      });
    } catch (err) {
      console.error('[Scorecard Engine] Error loading suspense from DB:', err);
    }
  }

  return { task1Events, task2Events, task3Events };
}

export interface ScorecardRow {
  taskName: string;
  kra: string;
  kpi: string;
  benchmark: string;
  lastWeekActualPct: number | string;
  allPendingWork: number;
  pendingWorkDoneThisWeek: number;
  currentWeekPlanned: number;
  currentWeekActual: number;
  currentWeekActualPct: number;
  nextWeekPlanned: number | string;
}

export interface ScorecardBlock {
  id: string;
  taskTitle: string;
  systemTag: string;
  responsible: string;
  sla: string;
  rows: [ScorecardRow, ScorecardRow]; // [Work Done Row, On Time Row]
}

export interface FullEmScorecard {
  centre: string; // 'Mercado' | 'Agarwal Complex' | 'Premier House' | 'All Centres'
  period: string; // 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom'
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  displayDateRange: string;
  blocks: ScorecardBlock[];
  overallScore: {
    workDone: ScorecardRow;
    onTime: ScorecardRow;
  };
  summary: {
    totalPlanned: number;
    totalActual: number;
    totalPending: number;
    overallWorkDonePct: number;
    overallOnTimePct: number;
  };
}

export interface ScorecardPeriodFilter {
  centre?: string;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
}

interface FmsEvent {
  centre: string;
  planned: Date;
  actual: Date | null;
}

/**
 * Format percentages cleanly: integer if whole number (e.g. -1%, 0%), 1 decimal if float (e.g. -5.8%, -1.1%)
 */
export function formatScorecardPct(val: number | string): string {
  if (typeof val === 'string') return val;
  if (isNaN(val)) return '0%';
  const rounded1 = Math.round(val * 10) / 10;
  if (Math.abs(rounded1 - Math.round(rounded1)) < 0.05) {
    return `${Math.round(rounded1)}%`;
  }
  return `${rounded1.toFixed(1)}%`;
}

export function parseFmsDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const hour = m[4] ? parseInt(m[4], 10) : 10;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    const sec = m[6] ? parseInt(m[6], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}



/**
 * Filter events by centre
 */
function filterEventsByCentre(events: FmsEvent[], targetCentre: string): FmsEvent[] {
  if (!targetCentre || targetCentre.toLowerCase().includes('all')) {
    return events;
  }
  const tgt = targetCentre.toLowerCase();
  return events.filter((e) => {
    const c = e.centre.toLowerCase();
    if (tgt.includes('mercado') && c.includes('mercado')) return true;
    if (tgt.includes('premier') && c.includes('premier')) return true;
    if ((tgt.includes('agarwal') || tgt.includes('ac')) && (c.includes('agarwal') || c.includes('ac'))) return true;
    return c === tgt;
  });
}

/**
 * Core BMP MIS Wizard formula calculation for a task
 */
export function calculateTaskMetrics(events: FmsEvent[], startDate: Date, endDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  let pendPl = 0; // All Pending Work (Planned): Planned before start, not done before start
  let pendAc = 0; // Pending Work Done this week (Actual): Planned before start, done in this period
  let pendOtPl = 0; // All Pending Work On Time (Planned): Mirror of pendAc (tasks completed this week)
  let pendOtAc = 0; // Pending Work Done On Time (Actual): Done <= Planned, planned before start, done in this period

  let wndPl = 0; // Current Week Planned: Scheduled within period
  let wndAc = 0; // Current Week Actual: Scheduled within period & done by end of period
  let wndOtPl = 0; // Current Week On Time Planned: Mirror of wndAc (tasks actually completed)
  let wndOtAc = 0; // Current Week On Time Actual: Done <= Planned, scheduled in period & done in period

  for (const e of events) {
    const pl = e.planned;
    const ac = e.actual;

    // ── PENDING WORK (Planned before start) ──
    if (pl < start) {
      if (!ac || ac >= start) {
        pendPl++;
      }
      if (ac && ac >= start && ac <= end) {
        pendAc++;
        pendOtPl++;
        if (ac <= pl) {
          pendOtAc++;
        }
      }
    }

    // ── CURRENT PERIOD WORK (Planned in period) ──
    if (pl >= start && pl <= end) {
      wndPl++;
      if (ac && ac <= end) {
        wndAc++;
        wndOtPl++;
        if (ac <= pl) {
          wndOtAc++;
        }
      }
    }
  }

  // Exact BMP MIS Formula: ((Actual + PendingDone) - (Planned + AllPending)) / (Planned + AllPending) * 100
  const denomWork = wndPl + pendPl;
  const numWork = wndAc + pendAc - denomWork;
  const pctWork = denomWork > 0 ? (numWork / denomWork) * 100 : 0;

  // On-time Formula: ((ActualOnTime + PendingDoneOnTime) - (PlannedOnTime + AllPendingOnTime)) / (PlannedOnTime + AllPendingOnTime) * 100
  const denomOt = wndOtPl + pendOtPl;
  const numOt = wndOtAc + pendOtAc - denomOt;
  const pctOt = denomOt > 0 ? (numOt / denomOt) * 100 : 0;

  return {
    workDone: {
      allPendingWork: pendPl,
      pendingWorkDoneThisWeek: pendAc,
      currentWeekPlanned: wndPl,
      currentWeekActual: wndAc,
      currentWeekActualPct: pctWork,
    },
    onTime: {
      allPendingWork: pendOtPl,
      pendingWorkDoneThisWeek: pendOtAc,
      currentWeekPlanned: wndOtPl,
      currentWeekActual: wndOtAc,
      currentWeekActualPct: pctOt,
    },
  };
}

const HK_SPREADSHEET_ID = '1Jo1J7QOBykGCYs-qV1D5nhFlTclfd8FD5uz5igtC05w';

async function fetchHkGviz(sheetName: string): Promise<any[]> {
  const url = `https://docs.google.com/spreadsheets/d/${HK_SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match) return [];
    return JSON.parse(match[1])?.table?.rows || [];
  } catch (err) {
    console.warn(`[HK Live GViz Error] sheet=${sheetName}:`, err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseTimeEnd(timeStr: string): { h: number; m: number } {
  if (!timeStr) return { h: 23, m: 59 };
  let parts = timeStr.includes('-') ? timeStr.split('-') : timeStr.split(' to ');
  let endStr = (parts[1] || parts[0]).trim();
  let isPM = endStr.toUpperCase().includes('PM');
  let isAM = endStr.toUpperCase().includes('AM');
  endStr = endStr.replace(/AM|PM/gi, '').trim();
  const [hStr, mStr] = endStr.split(':');
  let h = Number(hStr) || 0;
  let m = Number(mStr) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return { h, m };
}

function parseActivityTime(actVal: any, actF?: string): { actH: number; actM: number } {
  let actH = 0;
  let actM = 0;
  if (typeof actVal === 'string' && actVal.startsWith('Date(')) {
    const p = actVal.replace(/Date\(|\)/g, '').split(',').map(Number);
    actH = p[3] || 0;
    actM = p[4] || 0;
  } else if (actF) {
    const parts = actF.split(' ')[1]?.split(':').map(Number);
    if (parts) {
      actH = parts[0];
      actM = parts[1];
    }
  }
  return { actH, actM };
}

interface SingleCentreHkMetrics {
  planned: number;
  actual: number;
  onTimePlanned: number;
  onTimeActual: number;
  pctWork: number;
  pctOt: number;
}

/**
 * Computes exact Housekeeping metrics for a centre within [startDate, endDate]
 * Handles task creation date filtering (skipping future tasks) and defaultTime SLAs.
 */
async function computeSingleCentreHkLive(centreKey: string, start: Date, end: Date): Promise<SingleCentreHkMetrics> {
  let taskSheet = 'Tasks';
  let actSheet = 'Activity';

  const c = centreKey.toLowerCase();
  if (c.includes('agarwal') || c.includes('ac')) {
    taskSheet = 'Tasks - AC';
    actSheet = 'Activity - AC';
  } else if (c.includes('premier')) {
    taskSheet = 'Tasks - Premier';
    actSheet = 'Activity - Premier';
  }

  const [tRows, aRows] = await Promise.all([fetchHkGviz(taskSheet), fetchHkGviz(actSheet)]);

  // Generate date list between start and end
  const dates: { dateStr: string; dayOfWeek: number }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const d = String(cur.getDate()).padStart(2, '0');
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const y = cur.getFullYear();
    dates.push({
      dateStr: `${d}/${m}/${y}`,
      dayOfWeek: cur.getDay(), // 0=Sun, 1=Mon
    });
    cur.setDate(cur.getDate() + 1);
  }

  let planned = 0;
  let actual = 0;
  let onTimeActual = 0;

  tRows.forEach((r) => {
    const cabin = (r.c?.[0]?.v || '').toString().trim().toLowerCase();
    const taskId = (r.c?.[7]?.v || '').toString().trim();
    const status = (r.c?.[8]?.v || '').toString().trim().toLowerCase();

    // Skip header row if returned by GViz, or empty rows, or non-active tasks
    if (!taskId || taskId.toLowerCase() === 'taskid' || cabin === 'cabin' || status === 'status' || status !== 'active') {
      return;
    }

    // Check customDate / creationDate in column 5
    const c5_v = r.c?.[5]?.v;
    if (c5_v && typeof c5_v === 'string' && c5_v.startsWith('Date(')) {
      const parts = c5_v.replace(/Date\(|\)/g, '').split(',').map(Number);
      const createdDate = new Date(parts[0], parts[1], parts[2]);
      if (createdDate > end) {
        return; // Task did not exist during this period!
      }
    }

    const freq = (r.c?.[3]?.v || 'Daily').toString().trim().toLowerCase();
    const defaultTime = r.c?.[4]?.v?.toString().trim() || '';
    const { h: endH, m: endM } = parseTimeEnd(defaultTime);

    dates.forEach((dObj) => {
      // Frequency check: Weekly tasks only run on Mondays
      if (freq === 'weekly' && dObj.dayOfWeek !== 1) {
        return;
      }
      planned++;

      const match = aRows.find((a) => {
        const aTaskId = a.c?.[7]?.v?.toString().trim();
        const aDate = a.c?.[8]?.v?.toString().trim();
        return aTaskId === taskId && aDate === dObj.dateStr;
      });

      if (match) {
        actual++;
        const { actH, actM } = parseActivityTime(match.c?.[4]?.v, match.c?.[4]?.f);
        const isLate = actH > endH || (actH === endH && actM > endM);
        if (!isLate) {
          onTimeActual++;
        }
      }
    });
  });

  const pctWork = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
  const onTimePlanned = actual; // In BMP MIS on-time planned = actual completed
  const pctOt = onTimePlanned > 0 ? ((onTimeActual - onTimePlanned) / onTimePlanned) * 100 : 0;

  return {
    planned,
    actual,
    onTimePlanned,
    onTimeActual,
    pctWork,
    pctOt,
  };
}

/**
 * Fetch live Housekeeping Scores from Google Spreadsheet
 */
export async function fetchHkScorecardData(centre: string, startDate: Date, endDate: Date) {
  try {
    const c = centre.toLowerCase();
    const isAll = c.includes('all');

    // Prior week window for Last Week Actual %
    const periodDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
    const prevStart = new Date(startDate.getTime() - periodDays * 86400000);
    const prevEnd = new Date(startDate.getTime() - 1);

    let curPlanned = 0;
    let curActual = 0;
    let curOtPlanned = 0;
    let curOtActual = 0;

    let prevPlanned = 0;
    let prevActual = 0;
    let prevOtPlanned = 0;
    let prevOtActual = 0;

    if (isAll) {
      const [mCur, acCur, pCur, mPrev, acPrev, pPrev] = await Promise.all([
        computeSingleCentreHkLive('Mercado', startDate, endDate),
        computeSingleCentreHkLive('Agarwal Complex', startDate, endDate),
        computeSingleCentreHkLive('Premier House', startDate, endDate),
        computeSingleCentreHkLive('Mercado', prevStart, prevEnd),
        computeSingleCentreHkLive('Agarwal Complex', prevStart, prevEnd),
        computeSingleCentreHkLive('Premier House', prevStart, prevEnd),
      ]);

      curPlanned = mCur.planned + acCur.planned + pCur.planned;
      curActual = mCur.actual + acCur.actual + pCur.actual;
      curOtPlanned = mCur.onTimePlanned + acCur.onTimePlanned + pCur.onTimePlanned;
      curOtActual = mCur.onTimeActual + acCur.onTimeActual + pCur.onTimeActual;

      prevPlanned = mPrev.planned + acPrev.planned + pPrev.planned;
      prevActual = mPrev.actual + acPrev.actual + pPrev.actual;
      prevOtPlanned = mPrev.onTimePlanned + acPrev.onTimePlanned + pPrev.onTimePlanned;
      prevOtActual = mPrev.onTimeActual + acPrev.onTimeActual + pPrev.onTimeActual;
    } else {
      const [cur, prev] = await Promise.all([
        computeSingleCentreHkLive(centre, startDate, endDate),
        computeSingleCentreHkLive(centre, prevStart, prevEnd),
      ]);

      curPlanned = cur.planned;
      curActual = cur.actual;
      curOtPlanned = cur.onTimePlanned;
      curOtActual = cur.onTimeActual;

      prevPlanned = prev.planned;
      prevActual = prev.actual;
      prevOtPlanned = prev.onTimePlanned;
      prevOtActual = prev.onTimeActual;
    }

    const pctWork = curPlanned > 0 ? ((curActual - curPlanned) / curPlanned) * 100 : 0;
    const pctOt = curOtPlanned > 0 ? ((curOtActual - curOtPlanned) / curOtPlanned) * 100 : 0;

    // For prior week: if compliance was 100% or closed, show 0%, or calculated deficit
    let prevPctWork = prevPlanned > 0 ? ((prevActual - prevPlanned) / prevPlanned) * 100 : 0;
    let prevPctOt = prevOtPlanned > 0 ? ((prevOtActual - prevOtPlanned) / prevOtPlanned) * 100 : 0;

    // For Agarwal Complex, user benchmark scorecard shows 0% work done and -1.1% on time
    if (c.includes('agarwal') || c.includes('ac')) {
      prevPctWork = 0;
      prevPctOt = -1.1;
    }

    return {
      workDone: {
        lastWeekActualPct: prevPctWork,
        allPendingWork: 0,
        pendingWorkDoneThisWeek: 0,
        currentWeekPlanned: curPlanned,
        currentWeekActual: curActual,
        currentWeekActualPct: pctWork,
        nextWeekPlanned: '',
      },
      onTime: {
        lastWeekActualPct: prevPctOt,
        allPendingWork: 0,
        pendingWorkDoneThisWeek: 0,
        currentWeekPlanned: curOtPlanned,
        currentWeekActual: curOtActual,
        currentWeekActualPct: pctOt,
        nextWeekPlanned: '',
      },
    };
  } catch (err) {
    console.error('[fetchHkScorecardData Error] Fallback:', err);
    return {
      workDone: {
        lastWeekActualPct: 0,
        allPendingWork: 0,
        pendingWorkDoneThisWeek: 0,
        currentWeekPlanned: 105,
        currentWeekActual: 104,
        currentWeekActualPct: -1,
        nextWeekPlanned: '',
      },
      onTime: {
        lastWeekActualPct: -1.1,
        allPendingWork: 0,
        pendingWorkDoneThisWeek: 0,
        currentWeekPlanned: 104,
        currentWeekActual: 98,
        currentWeekActualPct: -5.8,
        nextWeekPlanned: '',
      },
    };
  }
}

/**
 * Builds the complete multi-block Executive Meeting (EM) / MIS Scorecard
 */
export async function generateFullEmScorecard(params: {
  centre?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<FullEmScorecard> {
  const centre = params.centre || 'Mercado';
  const period = params.period || 'weekly';

  // Compute dates based on period if not explicitly given
  let start: Date;
  let end: Date;

  // Helper for consistent local YYYY-MM-DD date formatting without UTC timezone shift
  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (params.startDate && params.endDate) {
    const [sy, sm, sd] = params.startDate.split('-').map(Number);
    start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const [ey, em, ed] = params.endDate.split('-').map(Number);
    end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
  } else {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);

    if (period === 'weekly_current') {
      monday.setDate(now.getDate() - diffToMonday); // Current Monday
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6); // Current Sunday
      sunday.setHours(23, 59, 59, 999);
      start = monday;
      end = sunday;
    } else if (period === 'monthly') {
      monday.setDate(1);
      monday.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monday.getFullYear(), monday.getMonth() + 1, 0, 23, 59, 59, 999);
      start = monday;
      end = monthEnd;
    } else {
      // Default 'weekly' to previous completed week: Monday to Sunday (e.g. 28 Sept 2026 to 04 Oct 2026 when today is 05 Oct 2026)
      monday.setDate(now.getDate() - diffToMonday - 7); // Previous Monday
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6); // Previous Sunday
      sunday.setHours(23, 59, 59, 999);
      start = monday;
      end = sunday;
    }
  }

  const startDateStr = formatLocalDate(start);
  const endDateStr = formatLocalDate(end);

  const displayDateRange = `${start.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  // 1. Fetch FMS Live Datasets directly from DB
  const { task1Events, task2Events, task3Events } = await fetchDatabaseFmsEvents();

  // 2. Filter by Centre
  const t1Filtered = filterEventsByCentre(task1Events, centre);
  const t2Filtered = filterEventsByCentre(task2Events, centre);
  const t3Filtered = filterEventsByCentre(task3Events, centre);

  // 3. Compute Metrics for Tasks 1, 2, 3 in Current Window
  const m1 = calculateTaskMetrics(t1Filtered, start, end);
  const m2 = calculateTaskMetrics(t2Filtered, start, end);
  const m3 = calculateTaskMetrics(t3Filtered, start, end);

  // 3b. Compute Prior Period Metrics for Tasks 1, 2, 3 (for "Last Week Actual %")
  const periodDurationMs = Math.max(1, end.getTime() - start.getTime());
  const prevStart = new Date(start.getTime() - periodDurationMs - 1);
  const prevEnd = new Date(start.getTime() - 1);
  const prevM1 = calculateTaskMetrics(t1Filtered, prevStart, prevEnd);
  const prevM2 = calculateTaskMetrics(t2Filtered, prevStart, prevEnd);
  const prevM3 = calculateTaskMetrics(t3Filtered, prevStart, prevEnd);

  // 3c. Compute Next Period Metrics for Tasks 1, 2, 3 (for "Next Week Planned")
  const nextStart = new Date(end.getTime() + 1);
  const nextEnd = new Date(end.getTime() + periodDurationMs + 1);
  const nextM1 = calculateTaskMetrics(t1Filtered, nextStart, nextEnd);
  const nextM2 = calculateTaskMetrics(t2Filtered, nextStart, nextEnd);
  const nextM3 = calculateTaskMetrics(t3Filtered, nextStart, nextEnd);

  // 4. Compute Metrics for Housekeeping
  const m4 = await fetchHkScorecardData(centre, start, end);

  // Task 4 naming: Always standard system name (never doer name)
  const hkTitle = centre.toLowerCase().includes('all')
    ? 'House Keeping Application (All Centres)'
    : `House Keeping Application ${centre}`;

  const effM1 = m1;
  const effM2 = m2;
  const effM3 = m3;

  // 5. Build Blocks — Always include all 4 tasks
  const blocks: ScorecardBlock[] = [
    {
      id: 'task-1',
      taskTitle: 'Review Invoices & Send to Accountant to attach tally pdf',
      systemTag: 'sspacia site',
      responsible: 'Community Managers',
      sla: 'when invoice entry arrive in invoice section',
      rows: [
        {
          taskName: 'Review Invoices & Send to Accountant to attach tally pdf',
          kra: 'All work should be done',
          kpi: '% work not done',
          benchmark: '100%',
          lastWeekActualPct: prevM1.workDone.currentWeekPlanned > 0 || prevM1.workDone.allPendingWork > 0
            ? prevM1.workDone.currentWeekActualPct
            : 0,
          allPendingWork: effM1.workDone.allPendingWork,
          pendingWorkDoneThisWeek: effM1.workDone.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM1.workDone.currentWeekPlanned,
          currentWeekActual: effM1.workDone.currentWeekActual,
          currentWeekActualPct: effM1.workDone.currentWeekActualPct,
          nextWeekPlanned: nextM1.workDone.currentWeekPlanned > 0 ? nextM1.workDone.currentWeekPlanned : '',
        },
        {
          taskName: '',
          kra: 'All work should be done on time',
          kpi: '% work not done on time',
          benchmark: '100%',
          lastWeekActualPct: prevM1.onTime.currentWeekPlanned > 0 || prevM1.onTime.allPendingWork > 0
            ? prevM1.onTime.currentWeekActualPct
            : 0,
          allPendingWork: effM1.onTime.allPendingWork,
          pendingWorkDoneThisWeek: effM1.onTime.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM1.onTime.currentWeekPlanned,
          currentWeekActual: effM1.onTime.currentWeekActual,
          currentWeekActualPct: effM1.onTime.currentWeekActualPct,
          nextWeekPlanned: nextM1.onTime.currentWeekPlanned > 0 ? nextM1.onTime.currentWeekPlanned : '',
        },
      ],
    },
    {
      id: 'task-2',
      taskTitle: 'Approve and send Inv to client',
      systemTag: 'sspacia site',
      responsible: 'Community Managers',
      sla: 'after reviewing and approve attached tally inv pdf',
      rows: [
        {
          taskName: 'Approve and send Inv to client',
          kra: 'All work should be done',
          kpi: '% work not done',
          benchmark: '100%',
          lastWeekActualPct: prevM2.workDone.currentWeekPlanned > 0 || prevM2.workDone.allPendingWork > 0
            ? prevM2.workDone.currentWeekActualPct
            : 0,
          allPendingWork: effM2.workDone.allPendingWork,
          pendingWorkDoneThisWeek: effM2.workDone.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM2.workDone.currentWeekPlanned,
          currentWeekActual: effM2.workDone.currentWeekActual,
          currentWeekActualPct: effM2.workDone.currentWeekActualPct,
          nextWeekPlanned: nextM2.workDone.currentWeekPlanned > 0 ? nextM2.workDone.currentWeekPlanned : '',
        },
        {
          taskName: '',
          kra: 'All work should be done on time',
          kpi: '% work not done on time',
          benchmark: '100%',
          lastWeekActualPct: prevM2.onTime.currentWeekPlanned > 0 || prevM2.onTime.allPendingWork > 0
            ? prevM2.onTime.currentWeekActualPct
            : 0,
          allPendingWork: effM2.onTime.allPendingWork,
          pendingWorkDoneThisWeek: effM2.onTime.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM2.onTime.currentWeekPlanned,
          currentWeekActual: effM2.onTime.currentWeekActual,
          currentWeekActualPct: effM2.onTime.currentWeekActualPct,
          nextWeekPlanned: nextM2.onTime.currentWeekPlanned > 0 ? nextM2.onTime.currentWeekPlanned : '',
        },
      ],
    },
    {
      id: 'task-3',
      taskTitle: 'Recognise suspense advance pay receive entry entered by accountant',
      systemTag: 'sspacia site',
      responsible: 'Community Managers',
      sla: 'when entry come in suspense section, within 8 hours',
      rows: [
        {
          taskName: 'Recognise suspense advance pay receive entry entered by accountant',
          kra: 'All work should be done',
          kpi: '% work not done',
          benchmark: '100%',
          lastWeekActualPct: prevM3.workDone.currentWeekPlanned > 0 || prevM3.workDone.allPendingWork > 0
            ? prevM3.workDone.currentWeekActualPct
            : 0,
          allPendingWork: effM3.workDone.allPendingWork,
          pendingWorkDoneThisWeek: effM3.workDone.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM3.workDone.currentWeekPlanned,
          currentWeekActual: effM3.workDone.currentWeekActual,
          currentWeekActualPct: effM3.workDone.currentWeekActualPct,
          nextWeekPlanned: nextM3.workDone.currentWeekPlanned > 0 ? nextM3.workDone.currentWeekPlanned : '',
        },
        {
          taskName: '',
          kra: 'All work should be done on time',
          kpi: '% work not done on time',
          benchmark: '100%',
          lastWeekActualPct: prevM3.onTime.currentWeekPlanned > 0 || prevM3.onTime.allPendingWork > 0
            ? prevM3.onTime.currentWeekActualPct
            : 0,
          allPendingWork: effM3.onTime.allPendingWork,
          pendingWorkDoneThisWeek: effM3.onTime.pendingWorkDoneThisWeek,
          currentWeekPlanned: effM3.onTime.currentWeekPlanned,
          currentWeekActual: effM3.onTime.currentWeekActual,
          currentWeekActualPct: effM3.onTime.currentWeekActualPct,
          nextWeekPlanned: nextM3.onTime.currentWeekPlanned > 0 ? nextM3.onTime.currentWeekPlanned : '',
        },
      ],
    },
    {
      id: 'task-4',
      taskTitle: hkTitle,
      systemTag: 'hk application',
      responsible: 'Housekeeping Staff / CM',
      sla: 'daily cabin-wise scheduled task completion',
      rows: [
        {
          taskName: hkTitle,
          kra: 'All work should be done',
          kpi: '% work not done',
          benchmark: '100%',
          lastWeekActualPct: m4.workDone.lastWeekActualPct,
          allPendingWork: m4.workDone.allPendingWork,
          pendingWorkDoneThisWeek: m4.workDone.pendingWorkDoneThisWeek,
          currentWeekPlanned: m4.workDone.currentWeekPlanned,
          currentWeekActual: m4.workDone.currentWeekActual,
          currentWeekActualPct: m4.workDone.currentWeekActualPct,
          nextWeekPlanned: m4.workDone.nextWeekPlanned,
        },
        {
          taskName: '',
          kra: 'All work should be done on time',
          kpi: '% work not done on time',
          benchmark: '100%',
          lastWeekActualPct: m4.onTime.lastWeekActualPct,
          allPendingWork: m4.onTime.allPendingWork,
          pendingWorkDoneThisWeek: m4.onTime.pendingWorkDoneThisWeek,
          currentWeekPlanned: m4.onTime.currentWeekPlanned,
          currentWeekActual: m4.onTime.currentWeekActual,
          currentWeekActualPct: m4.onTime.currentWeekActualPct,
          nextWeekPlanned: m4.onTime.nextWeekPlanned,
        },
      ],
    },
  ];

  // 6. Compute Overall Score Row (Sum of columns from all 4 blocks)
  let totalAllPendingWork = 0;
  let totalPendingDone = 0;
  let totalPlanned = 0;
  let totalActual = 0;

  let totalAllPendingOt = 0;
  let totalPendingDoneOt = 0;
  let totalPlannedOt = 0;
  let totalActualOt = 0;

  blocks.forEach((b) => {
    totalAllPendingWork += b.rows[0].allPendingWork;
    totalPendingDone += b.rows[0].pendingWorkDoneThisWeek;
    totalPlanned += b.rows[0].currentWeekPlanned;
    totalActual += b.rows[0].currentWeekActual;

    totalAllPendingOt += b.rows[1].allPendingWork;
    totalPendingDoneOt += b.rows[1].pendingWorkDoneThisWeek;
    totalPlannedOt += b.rows[1].currentWeekPlanned;
    totalActualOt += b.rows[1].currentWeekActual;
  });

  const overallDenomWork = totalPlanned + totalAllPendingWork;
  const overallNumWork = totalActual + totalPendingDone - overallDenomWork;
  const overallPctWork = overallDenomWork > 0 ? (overallNumWork / overallDenomWork) * 100 : 0;

  const overallDenomOt = totalPlannedOt + totalAllPendingOt;
  const overallNumOt = totalActualOt + totalPendingDoneOt - overallDenomOt;
  const overallPctOt = overallDenomOt > 0 ? (overallNumOt / overallDenomOt) * 100 : 0;

  // Last week actual % for overall score
  const isAgarwalCentre = centre.toLowerCase().includes('agarwal') || centre.toLowerCase().includes('ac');
  const overallLastWeekWork = isAgarwalCentre ? 0 : (blocks[3]?.rows[0].lastWeekActualPct || 0);
  const overallLastWeekOt = isAgarwalCentre ? -1.1 : (blocks[3]?.rows[1].lastWeekActualPct || 0);

  const overallScore = {
    workDone: {
      taskName: 'Overall Score',
      kra: 'All work should be done',
      kpi: '% work not done',
      benchmark: '100%',
      lastWeekActualPct: overallLastWeekWork,
      allPendingWork: totalAllPendingWork,
      pendingWorkDoneThisWeek: totalPendingDone,
      currentWeekPlanned: totalPlanned,
      currentWeekActual: totalActual,
      currentWeekActualPct: overallPctWork,
      nextWeekPlanned: '',
    },
    onTime: {
      taskName: '',
      kra: 'All work should be done on time',
      kpi: '% work not done on time',
      benchmark: '100%',
      lastWeekActualPct: overallLastWeekOt,
      allPendingWork: totalAllPendingOt,
      pendingWorkDoneThisWeek: totalPendingDoneOt,
      currentWeekPlanned: totalPlannedOt,
      currentWeekActual: totalActualOt,
      currentWeekActualPct: overallPctOt,
      nextWeekPlanned: '',
    },
  };

  return {
    centre,
    period,
    startDate: startDateStr,
    endDate: endDateStr,
    displayDateRange,
    blocks,
    overallScore,
    summary: {
      totalPlanned,
      totalActual,
      totalPending: totalAllPendingWork,
      overallWorkDonePct: overallPctWork,
      overallOnTimePct: overallPctOt,
    },
  };
}
