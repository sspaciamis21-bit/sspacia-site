/**
 * hrSheetsSync.ts — Helper to synchronize Public Careers candidate applications to Google Sheets 'HR' tab
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit#gid=1939861408
 */

export interface HrApplicationPayload {
  fullName: string;
  email?: string | null;
  mobileNo: string;
  age: number | string;
  gender?: string | null;
  qualification: string;
  experience: string;
  appliedPosition: string;
  address?: string | null;
  status?: string;
  createdAt?: string;
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
 * Appends a candidate application record into the 'HR' tab of the Google Spreadsheet
 */
export async function syncCandidateToHrSheet(payload: HrApplicationPayload) {
  const timestamp = payload.createdAt || getISTTimestamp();

  const sheetData = {
    action: 'hr_application',
    sheetName: 'HR',
    tabName: 'HR',
    centerName: 'CG Road, Ahmedabad',
    timestamp,
    date: timestamp.split(',')[0] || timestamp,
    fullName: payload.fullName,
    candidateName: payload.fullName,
    email: payload.email || 'N/A',
    mobileNo: payload.mobileNo,
    phone: payload.mobileNo,
    age: payload.age,
    gender: payload.gender || 'N/A',
    qualification: payload.qualification,
    experience: payload.experience,
    appliedPosition: payload.appliedPosition,
    position: payload.appliedPosition,
    address: payload.address || 'N/A',
    status: payload.status || 'APPLIED',
  };

  try {

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetData),
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });


    if (!response.ok) {
      console.warn(`[HR Sheet Sync] Webhook responded with status ${response.status}`);
      return { success: false, status: response.status, timestamp };
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[HR Sheet Sync] ✅ Synced application for ${payload.fullName} (${payload.appliedPosition})`);
    return { success: true, data, timestamp };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[HR Sheet Sync] Webhook dispatch notice:', msg);
    return { success: false, error: msg, timestamp };
  }
}
