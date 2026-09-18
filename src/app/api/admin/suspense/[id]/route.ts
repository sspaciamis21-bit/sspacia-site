import { NextRequest, NextResponse } from 'next/server';
import {
  getSuspensePaymentById,
  deleteSuspensePayment,
} from '@/lib/suspense-db';

// GET /api/admin/suspense/[id] — Fetch single suspense payment
export async function GET(
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
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error('[API /api/admin/suspense/[id] GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suspense payment' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/suspense/[id] — Delete suspense payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteSuspensePayment(numId);
    return NextResponse.json({ success: true, message: 'Suspense payment deleted' });
  } catch (error: any) {
    console.error('[API /api/admin/suspense/[id] DELETE]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete suspense payment' },
      { status: 500 }
    );
  }
}
