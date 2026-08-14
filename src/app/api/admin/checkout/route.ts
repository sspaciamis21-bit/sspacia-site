import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder',
});

interface CheckoutBody {
  productId: number | string;
  pricingPlanId?: number | string;
  startDate?: string;
  date?: string;
  slots?: string[];
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationUnits?: number;
  seats?: number;
  notes?: string;
  discountCode?: string;
}

function generateBookingNumber(): string {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.floor(100000 + Math.random() * 900000);
  return `BK-${date}-${rand}`;
}

// POST /api/admin/checkout — Create Razorpay order + pending booking
export const POST = withPermission('payments', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const body = await req.json() as CheckoutBody;

    const numProductId = Number(body.productId);
    const effectiveStartDate = body.startDate || body.date || new Date().toISOString().split('T')[0];

    if (isNaN(numProductId)) {
      return NextResponse.json({ error: 'Valid productId is required' }, { status: 400 });
    }

    // 1. Fetch Product
    const product = await prisma.product.findUnique({
      where: { id: numProductId, isActive: true },
      select: {
        id: true,
        name: true,
        locationId: true,
        location: { select: { name: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Fetch Pricing Plan
    let plan = null;
    if (body.pricingPlanId) {
      plan = await prisma.pricingPlan.findUnique({
        where: { id: Number(body.pricingPlanId), productId: numProductId, isActive: true },
        select: { id: true, price: true, durationTypeId: true },
      });
    } else {
      plan = await prisma.pricingPlan.findFirst({
        where: { productId: numProductId, isActive: true },
        select: { id: true, price: true, durationTypeId: true },
      });
    }

    if (!plan) {
      return NextResponse.json({ error: 'No active pricing plan found for space' }, { status: 404 });
    }

    // 3. User & Customer lookup
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customer = await prisma.customer.findUnique({
      where: { email: dbUser.email },
      select: { id: true },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: dbUser.email, name: dbUser.name, phone: dbUser.phone ?? undefined },
        select: { id: true },
      });
    }

    // 4. Compute Total with Slots & GST
    const slotCount = Array.isArray(body.slots) && body.slots.length > 0 ? body.slots.length : 1;
    const units = Math.max(1, body.durationUnits ?? slotCount);
    const unitPrice = Number(plan.price);
    const baseSubtotal = unitPrice * units;
    
    // Apply promo discount if valid
    const discount = body.discountCode === 'WELCOME10' ? baseSubtotal * 0.1 : 0;
    const subtotal = Math.max(0, baseSubtotal - discount);

    // 18% GST (9% CGST + 9% SGST)
    const taxRate = 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    // 5. Booking Status & Payment Status
    const [pendingBookingStatus, pendingPaymentStatus] = await Promise.all([
      prisma.bookingStatus.findUnique({ where: { name: 'PENDING' } }),
      prisma.paymentStatus.findUnique({ where: { name: 'PENDING' } }),
    ]);

    const parsedStartDate = new Date(effectiveStartDate);
    const parsedEndDate   = body.endDate ? new Date(body.endDate) : new Date(parsedStartDate.getTime() + units * 3600000);

    // 5.1 Strict Server-Side Overlap & Reservation Verification
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      const startOfDay = new Date(parsedStartDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(parsedStartDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const TIME_SLOTS_ORDER = [
        '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
      ];

      const existingBookings = await prisma.booking.findMany({
        where: {
          productId: product.id,
          startDate: { gte: startOfDay, lte: endOfDay },
          status: { name: { notIn: ['CANCELLED', 'FAILED'] } },
        },
        select: { startTime: true, endTime: true },
      });

      const alreadyBooked = new Set<string>();
      for (const eb of existingBookings) {
        if (eb.startTime && eb.endTime) {
          const sIdx = TIME_SLOTS_ORDER.indexOf(eb.startTime);
          const eIdx = TIME_SLOTS_ORDER.indexOf(eb.endTime);
          if (sIdx !== -1 && eIdx !== -1) {
            for (let i = sIdx; i <= eIdx; i++) {
              alreadyBooked.add(TIME_SLOTS_ORDER[i]);
            }
          } else if (sIdx !== -1) {
            alreadyBooked.add(eb.startTime);
          }
        }
      }

      const conflictingSlots = body.slots.filter((slot: string) => alreadyBooked.has(slot));
      if (conflictingSlots.length > 0) {
        return NextResponse.json({
          error: `The slot(s) ${conflictingSlots.join(', ')} are already reserved by another customer for this space. Please choose available time slots.`,
        }, { status: 409 });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: generateBookingNumber(),
        customerId:    customer.id,
        productId:     product.id,
        durationTypeId: plan.durationTypeId,
        statusId:      pendingBookingStatus?.id ?? 1,
        startDate:     parsedStartDate,
        endDate:       parsedEndDate,
        startTime:     body.startTime ?? (body.slots?.[0] ?? undefined),
        endTime:       body.endTime ?? (body.slots?.[body.slots.length - 1] ?? undefined),
        durationUnits: units,
        seats:         body.seats ?? 1,
        unitPrice,
        totalAmount:   subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        notes:         body.notes ?? (body.slots ? `Slots: ${body.slots.join(', ')}` : undefined),
      },
    });

    // 6. Create Razorpay order
    const amountInPaisa = Math.round(grandTotal * 100);

    let razorpayOrder = { id: `order_mock_${booking.id}`, amount: amountInPaisa, currency: 'INR' };
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
        const rzpRes = await razorpay.orders.create({
          amount:   amountInPaisa,
          currency: 'INR',
          receipt:  booking.bookingNumber,
          notes: {
            bookingId:     String(booking.id),
            bookingNumber: booking.bookingNumber,
            customerEmail: dbUser.email,
          },
        });
        razorpayOrder = { id: rzpRes.id, amount: Number(rzpRes.amount), currency: rzpRes.currency };
      }
    } catch (rzpErr) {
      console.warn('[Checkout] Razorpay API fallback to mock order ID:', rzpErr);
    }

    // 7. Create Payment Record
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100000 + Math.random() * 900000);
    const paymentNumber = `PAY-${dateStr}-${randNum}`;

    await prisma.payment.create({
      data: {
        paymentNumber,
        bookingId:        booking.id,
        amount:           grandTotal,
        currency:         'INR',
        method:           'RAZORPAY',
        statusId:         pendingPaymentStatus?.id ?? 1,
        gatewayOrderId:   razorpayOrder.id,
      },
    });

    return NextResponse.json({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      orderId:   razorpayOrder.id,
      amount:    razorpayOrder.amount,
      currency:  razorpayOrder.currency,
      keyId:     process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : '') }, { status: 500 });
  }
});
