import { NextRequest, NextResponse } from 'next/server';
import {
  getSuspensePaymentById,
  updateSuspensePayment,
  deleteSuspensePayment,
} from '@/lib/suspense-db';
import { syncSuspenseUpdate } from '@/lib/suspenseFmsSync';

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

// PUT /api/admin/suspense/[id] — Update an existing suspense payment (Accountant / Super Admin edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const existing = await getSuspensePaymentById(numId);
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      payReceiveDate,
      suspensePaymentType,
      amount,
      paymentMode,
      bankName,
      utrNumber,
      utrDate,
      payerName,
      remarks,
      proofUrl,
      proofName,
    } = body;

    if (suspensePaymentType !== undefined && !String(suspensePaymentType).trim()) {
      return NextResponse.json(
        { error: 'Suspense payment type/description cannot be empty' },
        { status: 400 }
      );
    }

    let numAmount: number | undefined;
    if (amount !== undefined) {
      numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid received payment amount is required' },
          { status: 400 }
        );
      }
    }

    const updated = await updateSuspensePayment(numId, {
      payReceiveDate: payReceiveDate !== undefined ? String(payReceiveDate).trim() : undefined,
      suspensePaymentType: suspensePaymentType !== undefined ? String(suspensePaymentType).trim() : undefined,
      amount: numAmount,
      paymentMode: paymentMode !== undefined ? String(paymentMode).trim() : undefined,
      bankName: bankName !== undefined ? (bankName ? String(bankName).trim() : null) : undefined,
      utrNumber: utrNumber !== undefined ? (utrNumber ? String(utrNumber).trim() : null) : undefined,
      utrDate: utrDate !== undefined ? (utrDate ? String(utrDate).trim() : null) : undefined,
      payerName: payerName !== undefined ? (payerName ? String(payerName).trim() : null) : undefined,
      remarks: remarks !== undefined ? (remarks ? String(remarks).trim() : null) : undefined,
      proofUrl: proofUrl !== undefined ? (proofUrl ? String(proofUrl).trim() : null) : undefined,
      proofName: proofName !== undefined ? (proofName ? String(proofName).trim() : null) : undefined,
    });

    // Background sync updated details to Google Sheets tab 'expense fms'
    syncSuspenseUpdate(numId).catch((syncErr) => {
      console.warn('[API /api/admin/suspense/[id] PUT] Background sheet sync notice:', syncErr);
    });

    return NextResponse.json({
      success: true,
      message: 'Suspense payment updated successfully',
      payment: updated,
    });
  } catch (error: any) {
    console.error('[API /api/admin/suspense/[id] PUT]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update suspense payment' },
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
