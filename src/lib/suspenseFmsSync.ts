/**
 * suspenseFmsSync.ts — Synchronizes Suspense advance payments with Google Sheets 'expense fms' tab
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit
 */

import {
  getSuspensePaymentById,
  updateSuspenseFmsRow,
  SuspensePaymentRecord,
} from './suspense-db';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

/**
 * Dispatch webhook payload with timeout and robust error inspection
 */
async function postToFms(payload: Record<string, any>) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      // If response is HTML (such as Google Apps Script error page)
      if (rawText.includes('Script function not found')) {
        const match = rawText.match(/Script function not found: [^<]+/);
        const errDesc = match ? match[0] : 'Script function not found in Google Apps Script';
        console.warn(`[Suspense FMS Sync] Apps Script error: ${errDesc}`);
        return {
          success: false,
          error: `${errDesc}. Ensure doPost(e) is deployed in Google Apps Script as a New Version.`,
        };
      }
      data = { rawText };
    }

    if (!res.ok) {
      console.warn(`[Suspense FMS Sync] Webhook returned status ${res.status}`);
      return { success: false, status: res.status, error: data?.message || `HTTP ${res.status}` };
    }

    if (data && data.status === 'error') {
      return { success: false, error: data.message || 'Google Apps Script error' };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Suspense FMS Sync] Webhook dispatch notice:', msg);
    return { success: false, error: msg };
  }
}

/**
 * ── 1. SUSPENSE PLANNED (Triggered when Accountant submits a new Suspense Entry) ──
 * Populates 3 rows in tab 'expense fms':
 * - Row 1: mercado
 * - Row 2: premier house
 * - Row 3: agarwal complex
 * - Merges Col V (Pay Receive Date), Col W (Suspense Payment Type), Col Y (Planned Timestamp Range)
 * - Sets Col Z (Actual) to empty, Col AA (Status) to "Pending"
 */
export async function syncSuspensePlanned(suspenseId: number) {
  try {
    const payment = await getSuspensePaymentById(suspenseId);
    if (!payment) {
      console.warn(`[Suspense FMS Sync] Payment ID ${suspenseId} not found`);
      return { success: false, error: 'Payment not found' };
    }

    const payload = {
      action: 'suspense_planned',
      sheetName: 'expense fms',
      suspenseId: payment.id,
      payReceiveDate: payment.payReceiveDate,
      suspensePaymentType: payment.suspensePaymentType,
      planned: payment.plannedTimestamp,
      amount: payment.amount,
      payerName: payment.payerName || '',
      paymentMode: payment.paymentMode || '',
      utrNumber: payment.utrNumber || '',
      centers: ['mercado', 'premier house', 'agarwal complex'],
    };

    console.log(`[Suspense FMS Sync] 📤 Dispatching Suspense Planned:`, payload);
    const result = await postToFms(payload);

    if (result.success && result.data && result.data.rowStart) {
      const rowStart = Number(result.data.rowStart);
      await updateSuspenseFmsRow(suspenseId, rowStart);
      console.log(`[Suspense FMS Sync] ✅ Synced to expense fms at row ${rowStart}`);
    }

    return result;
  } catch (err: any) {
    console.error('[Suspense FMS Sync] syncSuspensePlanned error:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

/**
 * ── 2. SUSPENSE ACTUAL (Triggered when CM Accepts or Rejects for their Center) ──
 * Updates the corresponding center's row in tab 'expense fms':
 * - Sets Col Z (Actual) to the review timestamp
 * - Sets Col AA (Status) to "Done" (or "Overdue")
 */
export async function syncSuspenseActual(params: {
  suspenseId: number;
  centerName: string;
  actualTimestamp: string;
  status: 'Pending' | 'Done' | 'Overdue';
}) {
  try {
    const payment = await getSuspensePaymentById(params.suspenseId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    const payload = {
      action: 'suspense_actual',
      sheetName: 'expense fms',
      suspenseId: payment.id,
      rowStart: payment.fmsRowStart || null,
      payReceiveDate: payment.payReceiveDate,
      suspensePaymentType: payment.suspensePaymentType,
      centerName: params.centerName.toLowerCase().trim(),
      actual: params.actualTimestamp,
      status: params.status,
    };

    console.log(`[Suspense FMS Sync] 📤 Dispatching Suspense Actual for ${params.centerName}:`, payload);
    const result = await postToFms(payload);

    if (result.success) {
      console.log(`[Suspense FMS Sync] ✅ Synced Actual to expense fms for ${params.centerName}`);
    }

    return result;
  } catch (err: any) {
    console.error('[Suspense FMS Sync] syncSuspenseActual error:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

/**
 * ── 3. SUSPENSE UPDATE (Triggered when Accountant edits an existing Suspense Entry) ──
 * Updates Col V (Pay Receive Date) & Col W (Suspense Payment Type) for this entry's 3-row block.
 * If the entry was not yet logged in Google Sheets, automatically performs suspense_planned!
 */
export async function syncSuspenseUpdate(suspenseId: number) {
  try {
    const payment = await getSuspensePaymentById(suspenseId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // If never synced to Google Sheets yet, run planned sync
    if (!payment.fmsRowStart) {
      console.log(`[Suspense FMS Sync] Entry #${suspenseId} has no fmsRowStart, triggering full planned sync...`);
      return await syncSuspensePlanned(suspenseId);
    }

    const payload = {
      action: 'suspense_update',
      sheetName: 'expense fms',
      suspenseId: payment.id,
      rowStart: payment.fmsRowStart,
      payReceiveDate: payment.payReceiveDate,
      suspensePaymentType: payment.suspensePaymentType,
      amount: payment.amount,
      payerName: payment.payerName || '',
      paymentMode: payment.paymentMode || '',
      utrNumber: payment.utrNumber || '',
    };

    console.log(`[Suspense FMS Sync] 📤 Dispatching Suspense Update for #${suspenseId} (Row ${payment.fmsRowStart}):`, payload);
    const result = await postToFms(payload);

    if (result.success) {
      console.log(`[Suspense FMS Sync] ✅ Updated expense fms at row ${payment.fmsRowStart}`);
    }

    return result;
  } catch (err: any) {
    console.error('[Suspense FMS Sync] syncSuspenseUpdate error:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

/**
 * ── 4. RESYNC / MANUAL SYNC ──
 * Force syncs the payment entry and any already-completed CM reviews to Google Sheets
 */
export async function resyncSuspensePayment(suspenseId: number) {
  const payment = await getSuspensePaymentById(suspenseId);
  if (!payment) {
    return { success: false, error: 'Payment not found' };
  }

  // 1. Sync Planned / Core Row Block
  const plannedRes = await syncSuspensePlanned(suspenseId);
  if (!plannedRes.success) {
    return plannedRes;
  }

  // 2. Sync any already reviewed center allocations
  const allocs = payment.allocations || [];
  for (const a of allocs) {
    if (a.decision !== 'PENDING' && a.actualTimestamp) {
      await syncSuspenseActual({
        suspenseId: payment.id,
        centerName: a.centerName,
        actualTimestamp: a.actualTimestamp,
        status: a.fmsStatus || 'Done',
      });
    }
  }

  return { success: true, message: 'Successfully synced to Google Sheets', rowStart: payment.fmsRowStart };
}

/**
 * ── 5. SUSPENSE DELETE ──
 * Completely removes the suspense entry from Google Sheets tab 'expense fms' (unmerges and clears Rows V to AB)
 */
export async function syncSuspenseDelete(params: {
  id: number;
  fmsRowStart?: number | null;
  payReceiveDate?: string | null;
  suspensePaymentType?: string | null;
}) {
  try {
    const payload = {
      action: 'suspense_delete',
      sheetName: 'expense fms',
      suspenseId: params.id,
      rowStart: params.fmsRowStart || null,
      payReceiveDate: params.payReceiveDate || '',
      suspensePaymentType: params.suspensePaymentType || '',
    };

    console.log(`[Suspense FMS Sync] 📤 Dispatching Suspense Delete for #${params.id}:`, payload);
    const result = await postToFms(payload);

    if (result.success) {
      console.log(`[Suspense FMS Sync] ✅ Removed suspense entry #${params.id} from Google Sheets`);
    }

    return result;
  } catch (err: any) {
    console.error('[Suspense FMS Sync] syncSuspenseDelete error:', err?.message || err);
    return { success: false, error: err?.message || err };
  }
}

