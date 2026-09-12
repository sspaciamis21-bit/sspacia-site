/**
 * accountsFmsSync.ts — Helper to synchronize Live Invoices & Old Invoices Payment details
 * to Google Sheets 'Accounts' tab (FMS Engine)
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit#gid=270862341
 */

import prisma from '@/lib/prisma';
import { findOldInvoiceById } from '@/lib/old-invoices-db';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format timestamp in IST (e.g. "5 Sep 2026 10:00:00")
 */
export function formatIstTimestamp(date: Date = new Date()): string {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = istDate.getDate();
  const month = MONTH_NAMES_SHORT[istDate.getMonth()];
  const year = istDate.getFullYear();
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Compute the Planned Due Date timestamp string (e.g. "5 Sep 2026 10:00:00")
 * based on billing month (e.g. "September 2026") and client's due day
 */
export function computePlannedDueDate(billingMonth: string, dueDay: number = 5, dueDate?: Date | string | null): string {
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = MONTH_NAMES_SHORT[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year} 10:00:00`;
    }
  }

  // Parse billing month string like "September 2026" or "Sep 2026"
  const parts = String(billingMonth || '').trim().split(/\s+/);
  if (parts.length >= 2) {
    const mStr = parts[0].toLowerCase();
    const year = parts[1];
    const monthMap: Record<string, string> = {
      jan: 'Jan', january: 'Jan',
      feb: 'Feb', february: 'Feb',
      mar: 'Mar', march: 'Mar',
      apr: 'Apr', april: 'Apr',
      may: 'May',
      jun: 'Jun', june: 'Jun',
      jul: 'Jul', july: 'Jul',
      aug: 'Aug', august: 'Aug',
      sep: 'Sep', sept: 'Sep', september: 'Sep',
      oct: 'Oct', october: 'Oct',
      nov: 'Nov', november: 'Nov',
      dec: 'Dec', december: 'Dec',
    };
    const shortMonth = monthMap[mStr] || parts[0].slice(0, 3);
    const day = Math.max(1, Math.min(31, dueDay || 5));
    return `${day} ${shortMonth} ${year} 10:00:00`;
  }

  // Fallback to current month 5th
  const now = new Date();
  return `5 ${MONTH_NAMES_SHORT[now.getMonth()]} ${now.getFullYear()} 10:00:00`;
}

/**
 * Normalize billing month (e.g. "september 2026" -> "September 2026")
 */
export function normalizeMonthYear(billingMonth: string): string {
  const parts = String(billingMonth || '').trim().split(/\s+/);
  if (parts.length < 2) return billingMonth;
  const m = parts[0].toLowerCase();
  const year = parts[1];
  const map: Record<string, string> = {
    jan: 'January', january: 'January',
    feb: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December',
  };
  const standardMonth = map[m] || (parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase());
  return `${standardMonth} ${year}`;
}

/**
 * Helper to dispatch webhook payload
 */
async function postToSheet(payload: Record<string, any>) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[Accounts FMS Sync] Webhook returned status ${res.status}`);
      return { success: false, status: res.status };
    }
    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Accounts FMS Sync] Webhook dispatch notice:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Format invoice link into a clickable Google Sheets HYPERLINK formula with text "View"
 */
export function formatInvoiceHyperlink(rawUrl?: string | null): string {
  if (!rawUrl || !rawUrl.trim() || rawUrl === 'N/A' || rawUrl === '-') return '-';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('=HYPERLINK')) return trimmed;
  let fullUrl = trimmed;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://sspacia.com';
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    fullUrl = `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return `=HYPERLINK("${fullUrl}", "View")`;
}

/**
 * ── 1. LIVE INVOICE PLANNED (Triggered when CM Approves an Invoice) ──
 * Populates Columns A to G with Invoice Month, Company Name, Invoice Link ("View"), Planned timestamp, and Status: Pending
 */
export async function syncLiveInvoicePlanned(invoiceId: number) {
  try {
    const inv = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceId },
      include: {
        clientMaster: true,
        attachedInvoice: true,
      },
    });

    if (!inv) return;

    const companyName = String(inv.companyName || inv.clientMaster?.companyName || 'Valued Client').trim();
    const billingMonth = normalizeMonthYear(inv.billingMonth || 'Current Month');
    
    // Determine public invoice link and embed as clickable "View"
    const rawLink = inv.digitallySignedPdfUrl || inv.attachedInvoice?.fileUrl || '';
    const invoiceLink = formatInvoiceHyperlink(rawLink);

    const dueDay = Number(inv.paymentDueDay || inv.clientMaster?.paymentDueDay || 5);
    const planned = computePlannedDueDate(billingMonth, dueDay, inv.dueDate);

    const payload = {
      action: 'accounts_live_planned',
      sheetName: 'Accounts',
      invoiceMonth: billingMonth,
      companyName,
      invoiceLink,
      planned,
      status: 'Pending',
    };

    console.log(`[Accounts FMS Sync] 📤 Dispatching Live Invoice Planned for ${companyName} (${billingMonth})`);
    return await postToSheet(payload);
  } catch (err) {
    console.error('[Accounts FMS Sync] Error syncing live planned:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * ── 2. LIVE INVOICE ACTUAL (Triggered when Accountant saves payment details & balance becomes 0) ──
 * Updates Column E (Actual) with the payment timestamp and Column F (Status) to "Done"
 */
export async function syncLiveInvoiceActual(invoiceId: number, customActualDate?: Date | string) {
  try {
    const inv = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceId },
      include: {
        clientMaster: true,
      },
    });

    if (!inv) return;

    const companyName = String(inv.companyName || inv.clientMaster?.companyName || 'Valued Client').trim();
    const billingMonth = normalizeMonthYear(inv.billingMonth || 'Current Month');

    const totalAmt = Number(inv.totalAmount || inv.amount || 0);
    const recAmt = Number(inv.receiveAmount || 0);
    const balance = Math.max(0, totalAmt - recAmt);

    // Only mark Actual if balance is 0 or receive amount covers total or payReceiveDate is set
    const isCompleted = balance <= 0 || (recAmt >= totalAmt && totalAmt > 0) || inv.paymentStatus === 'RECEIVED';
    if (!isCompleted && !customActualDate) {
      console.log(`[Accounts FMS Sync] ℹ️ Invoice #${invoiceId} has remaining balance (₹${balance}). Not marking actual yet.`);
      return;
    }

    // Use current operational timestamp when accountant marks payment on SSPACIA
    const actualDateObj = customActualDate instanceof Date ? customActualDate : new Date();
    const actualTimestamp = formatIstTimestamp(actualDateObj);

    const payload = {
      action: 'accounts_live_actual',
      sheetName: 'Accounts',
      invoiceMonth: billingMonth,
      companyName,
      actual: actualTimestamp,
      status: 'Done',
    };

    console.log(`[Accounts FMS Sync] 📤 Dispatching Live Invoice Actual for ${companyName} (${billingMonth}) at ${actualTimestamp}`);
    return await postToSheet(payload);
  } catch (err) {
    console.error('[Accounts FMS Sync] Error syncing live actual:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * ── 3. OLD INVOICE ACTUAL (Triggered when Accountant updates payment details on an old invoice archive) ──
 * Updates Column M (Actual) and Column N (Status) to "Done"
 */
export async function syncOldInvoiceActual(oldInvoiceId: number, customActualDate?: Date | string) {
  try {
    const oldInv = await findOldInvoiceById(oldInvoiceId);
    if (!oldInv) return;

    const companyName = String(oldInv.companyName || '').trim();
    const month = String(oldInv.month || '').trim();

    const recAmount = Number(oldInv.receiveAmount || 0);
    const hasUtr = oldInv.utrNumber && String(oldInv.utrNumber).trim() !== '';
    const hasPaymentEntered = recAmount > 0 || hasUtr;

    if (!hasPaymentEntered && !customActualDate) {
      return;
    }

    // Use current operational timestamp when accountant enters payment on SSPACIA
    const actualDateObj = customActualDate instanceof Date ? customActualDate : new Date();
    const actualTimestamp = formatIstTimestamp(actualDateObj);

    const payload = {
      action: 'accounts_old_actual',
      sheetName: 'Accounts',
      invoiceMonth: month,
      companyName,
      actual: actualTimestamp,
      status: 'Done',
    };

    console.log(`[Accounts FMS Sync] 📤 Dispatching Old Invoice Actual for ${companyName} (${month}) at ${actualTimestamp}`);
    return await postToSheet(payload);
  } catch (err) {
    console.error('[Accounts FMS Sync] Error syncing old actual:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * ── 4. DAILY FMS PAYMENT CHECK ACTUAL (Triggered when Accountant confirms daily Yes/No before 10:30 AM) ──
 * Updates Column R (Actual) starting from row 6 (R6:R) with the exact operational timestamp
 * Keeping Planned (Q), Status (S), and TimeDelay (T) empty as requested.
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit#gid=270862341 (tab: 'Accounts')
 */
export async function syncAccountsDailyFmsActual(customDate?: Date | string) {
  try {
    const actualDateObj = customDate instanceof Date ? customDate : (customDate ? new Date(customDate) : new Date());
    const istDate = new Date(actualDateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const month = istDate.getMonth() + 1;
    const day = istDate.getDate();
    const year = istDate.getFullYear();
    const hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    // Format: M/D/YYYY HH:mm:ss (e.g. "9/11/2026 17:15:20" matching screenshot row 18)
    const actualTimestamp = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

    const payload = {
      action: 'accounts_daily_fms_check',
      sheetName: 'Accounts',
      actual: actualTimestamp,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };

    console.log(`[Accounts FMS Sync] 📤 Dispatching Daily FMS Actual for Column R: ${actualTimestamp}`);
    return await postToSheet(payload);
  } catch (err) {
    console.error('[Accounts FMS Sync] Error syncing daily fms actual:', err);
    return { success: false, error: String(err) };
  }
}

