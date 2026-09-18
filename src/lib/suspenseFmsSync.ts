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
 * Dispatch webhook payload with timeout
 */
async function postToFms(payload: Record<string, any>) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`[Suspense FMS Sync] Webhook returned status ${res.status}`);
      return { success: false, status: res.status };
    }

    const data = await res.json().catch(() => ({}));
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
