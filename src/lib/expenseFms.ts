/**
 * expenseFms.ts — Helper to record Actual timestamp in the Google Sheet 'expense fms' tab
 * Sheet URL: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit?usp=sharing
 */

export interface FmsTrackPayload {
  centerName: string;
  userEmail?: string;
  userName?: string;
  action?: 'start_typing' | 'save_changes' | 'mark_actual';
}

export async function trackExpenseFmsActual(payload: FmsTrackPayload) {
  const webhookUrl =
    process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

  try {
    const now = new Date();
    // Format date in IST (DD/MM/YYYY)
    const dateFormatted = now.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Format timestamp in IST (DD/MM/YYYY, hh:mm:ss A)
    const timestampFormatted = now.toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_actual',
        centerName: payload.centerName,
        date: dateFormatted,
        timestamp: timestampFormatted,
        userEmail: payload.userEmail || null,
        userName: payload.userName || null
      }),
      // Don't wait longer than 4 seconds so UI stays super snappy
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) {
      return { success: false, status: response.status };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ExpenseFms] Webhook ping notice:', msg);
    return { success: false, error: msg };
  }
}

export interface TourBookingPayload {
  username: string;
  email: string;
  mobileNo: string;
  locationName: string;
  preferredDate: string;
}

export async function sendTourBookingToSheet(payload: TourBookingPayload) {
  const webhookUrl =
    process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
    'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

  try {
    const now = new Date();
    const timestampFormatted = now.toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'book_a_tour',
        username: payload.username,
        email: payload.email,
        mobileNo: payload.mobileNo,
        locationName: payload.locationName,
        preferredDate: payload.preferredDate,
        timestamp: timestampFormatted
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return { success: false, status: response.status };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[TourBooking] Webhook ping notice:', msg);
    return { success: false, error: msg };
  }
}
