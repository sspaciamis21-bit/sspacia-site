/**
 * expenseFmsSync.ts — Multi-step Live Event-Driven EXPENSE FMS Synchronization
 * Target Spreadsheet: https://docs.google.com/spreadsheets/d/1a7ajEb9clt8ORnM73rtKem0_bT9Ifl8T5J6mifoonX0/edit
 *
 * Target Tab: "EXPENSE FMS" (Cols A to S):
 * - Cols A:C (DATA SET): Center, Expense Date, header - item desc
 * - Cols D:G (Step 1): Approve or reject with remarks Expense Entered by CM's (Dipendra | sspacia site | 8)
 * - Cols H:K (Step 2): Get Approval From Super Admin For The Same (Dipendra | sspacia site | 2)
 * - Cols L:O (Step 3): Take Approval before entering UTR Details (Dipendra | sspacia site | 2)
 * - Cols P:S (Step 4): Enter UTR Details (Dipendra | sspacia site | 2)
 */

import prisma from '@/lib/prisma';
import { formatFmsTimestamp } from './invoiceWorkflowFmsSync';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

function formatExpenseDate(d?: Date | string | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

async function postToFms(payload: Record<string, any>) {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (err: any) {
    console.warn('[Expense FMS Sync Notice]:', err?.message || err);
    return { error: err?.message || String(err) };
  }
}

export function formatExpenseHeaderDesc(category?: string | null, description?: string | null): string {
  const cat = (category || '').trim();
  const desc = (description || '').trim();
  return cat && desc ? `${cat} - ${desc}` : cat || desc || 'Expense Entry';
}

export async function fetchAllExpenseFmsItems() {
  const records = await (prisma as any).expenseRecord.findMany({
    orderBy: [
      { expenseDate: 'asc' },
      { id: 'asc' },
    ],
    include: {
      location: { select: { id: true, name: true } },
    },
  });

  return records.map((exp: any) => {
    const centerName = exp.locationName || exp.location?.name || 'Mercado';
    let isoDateStr = '';
    if (exp.expenseDate) {
      const d = new Date(exp.expenseDate);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        isoDateStr = `${y}-${m}-${day}`;
      }
    }

    const headerItemDesc = formatExpenseHeaderDesc(exp.category, exp.description);

    const isAccountantEntered =
      exp.createdByRole === 'ACCOUNTANT' ||
      (exp.createdByName && exp.createdByName.toLowerCase().includes('account'));

    const logTimestamp = formatFmsTimestamp(exp.createdAt || exp.expenseDate);

    // Step 1: Accountant Approve/Reject with remarks Expense Entered by CM's
    // Rule: If accountant entered expense, accountant does not approve their own expense,
    // so Step 1 Actual is the log timestamp!
    let step1Actual = '';
    let step1Status = 'Pending';
    if (isAccountantEntered) {
      step1Actual = logTimestamp;
      step1Status = 'Done';
    } else if (exp.accountantApprovedAt) {
      step1Actual = formatFmsTimestamp(exp.accountantApprovedAt);
      step1Status = exp.accountantApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done';
    } else if (exp.superAdminApprovedAt) {
      step1Actual = formatFmsTimestamp(exp.superAdminApprovedAt);
      step1Status = exp.accountantApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done';
    }

    // Step 2: Get Approval From Super Admin For The Same
    let step2Actual = '';
    let step2Status = 'Pending';
    if (exp.superAdminApprovedAt) {
      step2Actual = formatFmsTimestamp(exp.superAdminApprovedAt);
      step2Status = exp.superAdminApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done';
    }

    // Step 3: Take Approval before entering UTR Details
    let step3Actual = '';
    let step3Status = 'Pending';
    if (exp.paymentApprovedAt) {
      step3Actual = formatFmsTimestamp(exp.paymentApprovedAt);
      step3Status = exp.paymentApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done';
    }

    // Step 4: Enter UTR Details
    let step4Actual = '';
    let step4Status = 'Pending';
    const isPaid = exp.paymentStatus === 'PAID' || Boolean(exp.utrNumber);
    if (isPaid) {
      step4Actual = formatFmsTimestamp(exp.updatedAt || exp.paymentApprovedAt || new Date());
      step4Status = 'Done';
    }

    return {
      id: exp.id,
      centerName,
      expenseDate: isoDateStr || formatExpenseDate(exp.expenseDate),
      headerItemDesc,
      logTimestamp,
      isAccountantEntered,
      step1Planned: '',
      step1Actual,
      step1Status,
      step2Planned: '',
      step2Actual,
      step2Status,
      step3Planned: '',
      step3Actual,
      step3Status,
      step4Planned: '',
      step4Actual,
      step4Status,
    };
  });
}

async function getExpenseDetails(expenseRecordId: number) {
  try {
    const exp = await (prisma as any).expenseRecord.findUnique({
      where: { id: expenseRecordId },
      include: {
        location: { select: { id: true, name: true } },
      },
    });
    if (!exp) return null;

    const centerName = exp.locationName || exp.location?.name || 'Mercado';
    const expenseDate = formatExpenseDate(exp.expenseDate);
    const headerItemDesc = formatExpenseHeaderDesc(exp.category, exp.description);

    return {
      record: exp,
      centerName,
      expenseDate,
      headerItemDesc,
    };
  } catch (err) {
    console.warn('[Expense FMS Details Error]:', err);
    return null;
  }
}

/**
 * 1. Initial Expense Entry Creation (Data Set: Center, Expense Date, header - item desc, Log Timestamp)
 */
export async function syncExpenseCreated(expenseRecordId: number) {
  const details = await getExpenseDetails(expenseRecordId);
  if (!details) return;

  const isAccountantEntered =
    details.record.createdByRole === 'ACCOUNTANT' ||
    (details.record.createdByName && details.record.createdByName.toLowerCase().includes('account'));
  const logTimestamp = formatFmsTimestamp(details.record.createdAt || details.record.expenseDate || new Date());

  return await postToFms({
    action: 'expense_fms_create',
    sheetName: 'EXPENSE FMS',
    recordId: expenseRecordId,
    centerName: details.centerName,
    expenseDate: details.expenseDate,
    headerItemDesc: details.headerItemDesc,
    logTimestamp,
    isAccountantEntered,
    step1Actual: isAccountantEntered ? logTimestamp : '',
  });
}

/**
 * 2. Step 1: Accountant Approval / Rejection
 */
export async function syncExpenseStep1Accountant(expenseRecordId: number, status: 'Approved' | 'Rejected' | 'Done', timestamp?: Date) {
  const details = await getExpenseDetails(expenseRecordId);
  if (!details) return;

  const actualTime = formatFmsTimestamp(timestamp || details.record.accountantApprovedAt || new Date());

  return await postToFms({
    action: 'expense_fms_step1_accountant',
    sheetName: 'EXPENSE FMS',
    recordId: expenseRecordId,
    centerName: details.centerName,
    expenseDate: details.expenseDate,
    headerItemDesc: details.headerItemDesc,
    actual: actualTime,
    status: status === 'Rejected' ? 'Rejected' : 'Done',
  });
}

/**
 * 3. Step 2: Super Admin Approval / Rejection
 */
export async function syncExpenseStep2SuperAdmin(expenseRecordId: number, status: 'Approved' | 'Rejected' | 'Done', timestamp?: Date) {
  const details = await getExpenseDetails(expenseRecordId);
  if (!details) return;

  const actualTime = formatFmsTimestamp(timestamp || details.record.superAdminApprovedAt || new Date());

  return await postToFms({
    action: 'expense_fms_step2_super_admin',
    sheetName: 'EXPENSE FMS',
    recordId: expenseRecordId,
    centerName: details.centerName,
    expenseDate: details.expenseDate,
    headerItemDesc: details.headerItemDesc,
    actual: actualTime,
    status: status === 'Rejected' ? 'Rejected' : 'Done',
  });
}

/**
 * 4. Step 3: Super Admin Payment Approval (3rd approval / "Sir Pays")
 */
export async function syncExpenseStep3PaymentApproval(expenseRecordId: number, status: 'Approved' | 'Rejected' | 'Done', timestamp?: Date) {
  const details = await getExpenseDetails(expenseRecordId);
  if (!details) return;

  const actualTime = formatFmsTimestamp(timestamp || details.record.paymentApprovedAt || new Date());

  return await postToFms({
    action: 'expense_fms_step3_payment_approval',
    sheetName: 'EXPENSE FMS',
    recordId: expenseRecordId,
    centerName: details.centerName,
    expenseDate: details.expenseDate,
    headerItemDesc: details.headerItemDesc,
    actual: actualTime,
    status: status === 'Rejected' ? 'Rejected' : 'Done',
  });
}

/**
 * 5. Step 4: Accountant Enters & Saves UTR Details
 */
export async function syncExpenseStep4Utr(expenseRecordId: number, timestamp?: Date) {
  const details = await getExpenseDetails(expenseRecordId);
  if (!details) return;

  const actualTime = formatFmsTimestamp(timestamp || new Date());

  return await postToFms({
    action: 'expense_fms_step4_utr',
    sheetName: 'EXPENSE FMS',
    recordId: expenseRecordId,
    centerName: details.centerName,
    expenseDate: details.expenseDate,
    headerItemDesc: details.headerItemDesc,
    actual: actualTime,
    status: 'Done',
  });
}
