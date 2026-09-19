import { NextRequest, NextResponse } from 'next/server';
import { getSuspensePaymentById } from '@/lib/suspense-db';
import { resyncSuspensePayment } from '@/lib/suspenseFmsSync';

// POST /api/admin/suspense/[id]/resync — Manually force sync/re-sync to Google Sheets 'expense fms' tab
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const payment = await getSuspensePaymentById(numId);
    if (!payment) {
      return NextResponse.json({ error: 'Suspense payment record not found' }, { status: 404 });
    }

    const syncResult = await resyncSuspensePayment(numId);
    const updatedPayment = await getSuspensePaymentById(numId);

    if (!syncResult.success) {
      const errMessage = (syncResult as any).error || 'Failed to sync to Google Sheets';
      return NextResponse.json(
        {
          success: false,
          error: errMessage,
          details: syncResult,
          payment: updatedPayment,
        },
        { status: 502 }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Suspense entry synchronized to Google Sheets tab `expense fms`',
      syncResult,
      payment: updatedPayment,
    });
  } catch (error: any) {
    console.error('[API /api/admin/suspense/[id]/resync POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Error syncing with Google Sheets' },
      { status: 500 }
    );
  }
}
