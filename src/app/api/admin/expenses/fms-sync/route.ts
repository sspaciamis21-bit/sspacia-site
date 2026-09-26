import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { formatFmsTimestamp } from '@/lib/invoiceWorkflowFmsSync';

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

async function fetchAllExpenseFmsItems() {
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

    const category = (exp.category || 'GENERAL EXPENSE').trim();
    const description = (exp.description || '').trim();
    const headerItemDesc = `${category} - ${description}`;

    // Step 1: Accountant Check
    // If accountantApprovedAt exists (accountant reviewed/approved/rejected), use it.
    // If missing but superAdminApprovedAt exists (historical expense before accountant step), fallback to superAdminApprovedAt!
    let step1Actual = '';
    let step1Status = 'Pending';
    if (exp.accountantApprovedAt) {
      step1Actual = formatFmsTimestamp(exp.accountantApprovedAt);
      step1Status = exp.accountantApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done';
    } else if (exp.superAdminApprovedAt) {
      step1Actual = formatFmsTimestamp(exp.superAdminApprovedAt);
      step1Status = 'Done';
    }

    // Step 2: Super Admin Approval
    const step2Actual = exp.superAdminApprovedAt ? formatFmsTimestamp(exp.superAdminApprovedAt) : '';
    const step2Status = step2Actual ? (exp.superAdminApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done') : 'Pending';

    // Step 3: 3rd Payment Approval ("Sir Pays")
    const step3Actual = exp.paymentApprovedAt ? formatFmsTimestamp(exp.paymentApprovedAt) : '';
    const step3Status = step3Actual ? (exp.paymentApprovalStatus === 'REJECTED' ? 'Rejected' : 'Done') : 'Pending';

    // Step 4: UTR Details Entry
    const isPaid = exp.paymentStatus === 'PAID' || Boolean(exp.utrNumber);
    const step4Actual = isPaid ? formatFmsTimestamp(exp.updatedAt || exp.paymentApprovedAt || new Date()) : '';
    const step4Status = isPaid ? 'Done' : 'Pending';

    return {
      id: exp.id,
      centerName,
      expenseDate: isoDateStr || formatExpenseDate(exp.expenseDate),
      headerItemDesc,
      step1Actual,
      step1Status,
      step2Actual,
      step2Status,
      step3Actual,
      step3Status,
      step4Actual,
      step4Status,
    };
  });
}

export async function GET() {
  try {
    const items = await fetchAllExpenseFmsItems();
    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Fetch expense FMS items error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'sync_all';

    if (action === 'sync_all') {
      const items = await fetchAllExpenseFmsItems();

      const fmsRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expense_fms_bootstrap_sync',
          items,
        }),
      });

      const fmsText = await fmsRes.text();
      let parsed = {};
      try {
        parsed = JSON.parse(fmsText);
      } catch {
        parsed = { raw: fmsText };
      }

      return NextResponse.json({
        success: true,
        message: `Successfully dispatched ${items.length} records to EXPENSE FMS tab!`,
        count: items.length,
        fmsResponse: parsed,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Expense FMS sync error:', error);
    return NextResponse.json({ error: error?.message || 'FMS sync error' }, { status: 500 });
  }
}
