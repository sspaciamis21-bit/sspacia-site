import { NextRequest, NextResponse } from 'next/server';
import {
  getSuspensePayments,
  createSuspensePayment,
  formatIstDate,
} from '@/lib/suspense-db';
import { syncSuspensePlanned } from '@/lib/suspenseFmsSync';

// GET /api/admin/suspense — Fetch list of suspense payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const center = searchParams.get('center') || 'ALL';
    const search = searchParams.get('search') || '';

    const payments = await getSuspensePayments({ status, center, search });

    // Calculate analytics / summary
    let totalAmount = 0;
    let pendingCount = 0;
    let identifiedCount = 0;
    let overdueCount = 0;

    for (const p of payments) {
      totalAmount += p.amount || 0;
      if (p.overallStatus === 'PENDING') pendingCount++;
      else if (p.overallStatus === 'IDENTIFIED') identifiedCount++;
      else if (p.overallStatus === 'OVERDUE') overdueCount++;
    }

    return NextResponse.json({
      success: true,
      payments,
      summary: {
        totalCount: payments.length,
        totalAmount,
        pendingCount,
        identifiedCount,
        overdueCount,
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/suspense GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch suspense records' },
      { status: 500 }
    );
  }
}

// POST /api/admin/suspense — Accountant logs new advance suspense payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      payReceiveDate,
      suspensePaymentType,
      amount,
      bankName,
      paymentMode,
      utrNumber,
      utrDate,
      payerName,
      remarks,
      proofUrl,
      proofName,
      enteredById,
      enteredByName,
    } = body;

    if (!suspensePaymentType || !String(suspensePaymentType).trim()) {
      return NextResponse.json(
        { error: 'Suspense payment type/description is required' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid received payment amount is required' },
        { status: 400 }
      );
    }

    // Default pay receive date to today if not provided
    const cleanDate = payReceiveDate ? String(payReceiveDate).trim() : formatIstDate();

    const payment = await createSuspensePayment({
      payReceiveDate: cleanDate,
      suspensePaymentType: String(suspensePaymentType).trim(),
      amount: numAmount,
      bankName: bankName ? String(bankName).trim() : null,
      paymentMode: paymentMode ? String(paymentMode).trim() : null,
      utrNumber: utrNumber ? String(utrNumber).trim() : null,
      utrDate: utrDate ? String(utrDate).trim() : null,
      payerName: payerName ? String(payerName).trim() : null,
      remarks: remarks ? String(remarks).trim() : null,
      proofUrl: proofUrl ? String(proofUrl).trim() : null,
      proofName: proofName ? String(proofName).trim() : null,
      enteredById: enteredById ? Number(enteredById) : null,
      enteredByName: enteredByName ? String(enteredByName).trim() : 'Accountant',
    });

    if (!payment) {
      throw new Error('Failed to create suspense payment record');
    }

    // Background sync to Google Sheets 'expense fms' tab
    syncSuspensePlanned(payment.id).catch((syncErr) => {
      console.warn('[API /api/admin/suspense POST] Background sheet sync notice:', syncErr);
    });

    return NextResponse.json({
      success: true,
      message: 'Advance suspense payment logged and dispatched to Community Managers',
      payment,
    });
  } catch (error: any) {
    console.error('[API /api/admin/suspense POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create suspense payment' },
      { status: 500 }
    );
  }
}
