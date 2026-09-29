import { NextResponse } from 'next/server';
import { fetchAllExpenseFmsItems } from '@/lib/expenseFmsSync';

export const dynamic = 'force-dynamic';

const WEBHOOK_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'expense_fms_bootstrap_sync',
          clearBeforeSync: true,  // Tell Apps Script to clear old data before writing
          items,
        }),
        redirect: 'follow',
        signal: AbortSignal.timeout(60000),
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
