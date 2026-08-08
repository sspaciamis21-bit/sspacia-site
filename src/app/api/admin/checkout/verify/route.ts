import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import crypto from 'crypto';

interface VerifyBody {
  razorpayOrderId?:   string;
  razorpay_order_id?: string;
  razorpayPaymentId?: string;
  razorpay_payment_id?: string;
  razorpaySignature?: string;
  razorpay_signature?: string;
  bookingId:          number;
}

function generatePaymentNumber(): string {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.floor(100000 + Math.random() * 900000);
  return `PAY-${date}-${rand}`;
}

// POST /api/admin/checkout/verify — Verify Razorpay signature + confirm booking
export const POST = withPermission('payments', 'create', async (req: NextRequest) => {
  try {
    const body = await req.json() as VerifyBody;

    const rzpOrderId   = body.razorpayOrderId || body.razorpay_order_id;
    const rzpPaymentId = body.razorpayPaymentId || body.razorpay_payment_id;
    const rzpSignature = body.razorpaySignature || body.razorpay_signature;
    const bookingId    = Number(body.bookingId);

    // 1. Validate required
    if (!rzpOrderId || !rzpPaymentId || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required checkout verification fields' },
        { status: 400 }
      );
    }

    // 2. Verify HMAC signature (for real Razorpay orders)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && !rzpOrderId.startsWith('order_mock_') && rzpSignature) {
      const message   = `${rzpOrderId}|${rzpPaymentId}`;
      const generated = crypto
        .createHmac('sha256', secret)
        .update(message)
        .digest('hex');

      if (generated !== rzpSignature) {
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
      }
    }

    // 3. Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        grandTotal: true,
        startDate: true,
        status: { select: { name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Fetch confirmed status objects
    const [confirmedBookingStatus, paidPaymentStatus] = await Promise.all([
      prisma.bookingStatus.findUnique({ where: { name: 'CONFIRMED' } }),
      prisma.paymentStatus.findUnique({ where: { name: 'PAID' } }),
    ]);

    // 5. Update Booking + Create/Update Payment in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bookingId },
        data: {
          statusId: confirmedBookingStatus?.id ?? 2,
        },
        select: {
          id: true,
          bookingNumber: true,
          grandTotal: true,
          startDate: true,
          status: { select: { name: true, displayName: true, color: true } },
          customer: { select: { name: true, email: true } },
          product:  { select: { name: true, location: { select: { name: true } } } },
        },
      });

      await tx.payment.create({
        data: {
          paymentNumber:    generatePaymentNumber(),
          bookingId:        booking.id,
          gatewayOrderId:   rzpOrderId,
          gatewayPaymentId: rzpPaymentId,
          amount:           booking.grandTotal,
          currency:         'INR',
          method:           'RAZORPAY',
          statusId:         paidPaymentStatus?.id ?? 2,
          paidAt:           new Date(),
        },
      });

      return b;
    });

    return NextResponse.json({ message: 'Payment verified and booking confirmed successfully', data: updated });
  } catch (error) {
    console.error('[CHECKOUT_VERIFY]', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : '') }, { status: 500 });
  }
});
