import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import Razorpay from 'razorpay';


const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface CheckoutBody {
  productId: number;
  pricingPlanId: number;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  durationUnits?: number;
  seats?: number;
  notes?: string;
  durationType?: string;
}

function generateBookingNumber(): string {
  const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand  = Math.floor(100000 + Math.random() * 900000);
  return `BK-${date}-${rand}`;
}

// POST /api/admin/checkout — Create Razorpay order + pending booking
// userId is taken from the session — never from request body.
export const POST = withPermission('payments', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const body = await req.json() as CheckoutBody;

    const {
      productId,
      pricingPlanId,
      startDate,
      endDate,
      startTime,
      endTime,
      durationUnits,
      seats,
      notes,
    } = body;

    // 1. Validate required
    if (!productId || !pricingPlanId || !startDate) {
      return NextResponse.json(
        { error: 'productId, pricingPlanId and startDate are required' },
        { status: 400 }
      );
    }

    // 2. Fetch the product + pricing plan
    const [product, plan] = await prisma.$transaction([
      prisma.product.findUnique({
        where: { id: productId, isActive: true },
        select: {
          id: true,
          name: true,
          locationId: true,
          location: { select: { name: true } },
        },
      }),
      prisma.pricingPlan.findUnique({
        where: { id: pricingPlanId, productId, isActive: true },
        select: {
          id: true,
          price: true,
          durationTypeId: true,
        },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (!plan) {
      return NextResponse.json({ error: 'Pricing plan not found' }, { status: 404 });
    }

    // 3. Determine user's customer record (or create inline)
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

    // 4. Compute total
    const units     = Math.max(1, durationUnits ?? 1);
    const seatCount = Math.max(1, seats ?? 1);
    const unitPrice = Number(plan.price);
    const total     = unitPrice * units;
    const TAX_RATE  = 0.18;
    const taxAmount = Math.round(total * TAX_RATE * 100) / 100;
    const grandTotal = Math.round((total + taxAmount) * 100) / 100;

    // 5. Get PENDING status
    const pendingStatus = await prisma.bookingStatus.findFirst({
      where: { name: { in: ['PENDING', 'Pending'] } },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });

    const bookingNumber = generateBookingNumber();

    // 6. Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount:   Math.round(grandTotal * 100), // paise
      currency: 'INR',
      receipt:  bookingNumber,
      notes:    {
        productId:  String(productId),
        customerId: String(customer.id),
      },
    }) as unknown as { id: string; amount: number; currency: string };

    // 7. Create pending booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        productId,
        customerId:    customer.id,
        statusId:      pendingStatus?.id ?? 1,
        durationTypeId: plan.durationTypeId,
        startDate:     new Date(startDate),
        endDate:       endDate   ? new Date(endDate)   : new Date(startDate),
        startTime:     startTime ?? undefined,
        endTime:       endTime   ?? undefined,
        durationUnits: units,
        unitPrice,
        totalAmount:   total,
        taxAmount,
        grandTotal,
        seats:         seatCount,
        notes:         notes ?? undefined,
      },
      select: {
        id: true,
        bookingNumber: true,
        grandTotal: true,
        startDate: true,
        status: { select: { name: true, displayName: true } },
      },
    });

    return NextResponse.json({
      data: {
        booking,
        razorpay: {
          orderId:  razorpayOrder.id,
          amount:   razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId:    process.env.RAZORPAY_KEY_ID,
        },
      },
    });
  } catch (error) {
    console.error('[CHECKOUT_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
