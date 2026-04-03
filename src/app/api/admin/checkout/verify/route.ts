import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import crypto from 'crypto';

interface VerifyBody {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  bookingId:         number;
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
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = body;

    // 1. Validate required
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 2. Verify HMAC signature
    const secret    = process.env.RAZORPAY_KEY_SECRET!;
    const message   = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generated = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    if (generated !== razorpaySignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // 3. Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      select: {
        id: true,
        bookingNumber: true,
        grandTotal: true,
        customerId: true,
        status: { select: { name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 4. Get CONFIRMED + PAID statuses
    const [confirmedStatus, paidPaymentStatus] = await prisma.$transaction([
      prisma.bookingStatus.findFirst({
        where: { name: { in: ['CONFIRMED', 'Confirmed'] } },
        select: { id: true },
      }),
      prisma.paymentStatus.findFirst({
        where: { name: { in: ['PAID', 'Paid', 'SUCCESS'] } },
        select: { id: true },
      }),
    ]);

    // 5. Update booking status + create payment record
    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: booking.id },
        data: { statusId: confirmedStatus?.id ?? 2 },
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
          gatewayOrderId:   razorpayOrderId,
          gatewayPaymentId: razorpayPaymentId,
          amount:           booking.grandTotal,
          currency:         'INR',
          method:           'RAZORPAY',
          statusId:         paidPaymentStatus?.id ?? 1,
          paidAt:           new Date(),
        },
      });

      return b;
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[CHECKOUT_VERIFY]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
