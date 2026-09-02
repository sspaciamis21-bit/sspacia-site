/**
 * purchaseFms.ts — Helper to record Purchase Planned & Actual timestamps in the Google Sheet 'sspacia-purchase' tab
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit#gid=1820096360
 */

export interface PurchaseFmsPlannedPayload {
  itemName: string;
  centerName: string;
  reorderQty: number;
  bufferLimit: number;
  currentStock: number;
  userEmail?: string;
  userName?: string;
}

export interface PurchaseFmsActualPayload {
  itemName: string;
  centerName: string;
  userEmail?: string;
  userName?: string;
}

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

/**
 * Formats current date/time in Indian Standard Time (DD/MM/YYYY, hh:mm:ss a)
 */
export function getISTTimestamp(d: Date = new Date()): string {
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Sends a 'purchase_planned' record to Google Sheet 'sspacia-purchase' tab when stock hits buffer limit
 */
export async function trackPurchaseFmsPlanned(payload: PurchaseFmsPlannedPayload) {
  const itemDescription = `${payload.itemName} (${payload.centerName}) - ${payload.reorderQty} units (3x buffer)`;
  const plannedTimestamp = getISTTimestamp();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'purchase_planned',
        itemDescription,
        itemName: payload.itemName,
        centerName: payload.centerName,
        reorderQty: payload.reorderQty,
        bufferLimit: payload.bufferLimit,
        currentStock: payload.currentStock,
        plannedTimestamp,
        timestamp: plannedTimestamp,
        userEmail: payload.userEmail || null,
        userName: payload.userName || null,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { success: false, status: response.status, plannedTimestamp };
    }

    const data = await response.json();
    return { success: true, data, plannedTimestamp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[PurchaseFms] Webhook Planned ping notice:', msg);
    return { success: false, error: msg, plannedTimestamp };
  }
}

/**
 * Sends a 'purchase_actual' record to Google Sheet 'sspacia-purchase' tab when CM confirms delivery
 */
export async function trackPurchaseFmsActual(payload: PurchaseFmsActualPayload) {
  const actualTimestamp = getISTTimestamp();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'purchase_actual',
        itemName: payload.itemName,
        centerName: payload.centerName,
        actualTimestamp,
        timestamp: actualTimestamp,
        userEmail: payload.userEmail || null,
        userName: payload.userName || null,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { success: false, status: response.status, actualTimestamp };
    }

    const data = await response.json();
    return { success: true, data, actualTimestamp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[PurchaseFms] Webhook Actual ping notice:', msg);
    return { success: false, error: msg, actualTimestamp };
  }
}
