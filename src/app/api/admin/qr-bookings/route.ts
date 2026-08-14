import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

function generateBookingNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `QR-${date}-${rand}`;
}

/**
 * GET /api/admin/qr-bookings
 * Returns QR bookings scoped by role:
 *  - ?mine=true: Returns current user's own QR bookings
 *  - Community Manager: Scoped to their assigned location(s)
 *  - Super Admin: Returns all QR bookings across all centers (supports ?locationId=X)
 */
export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const { searchParams } = req.nextUrl;
    const mine = searchParams.get('mine') === 'true';
    const status = searchParams.get('status');
    const locationIdParam = searchParams.get('locationId');

    const dbUser = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        role: true,
        assignedLocations: { select: { locationId: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let whereClause: any = {};

    if (mine) {
      whereClause = {
        customerEmail: dbUser.email,
        ...(status ? { status } : {}),
      };
    } else {
      const isSuperAdmin = dbUser.role.name === 'ADMIN' || dbUser.assignedLocations.length === 0;
      const assignedLocationIds = dbUser.assignedLocations.map((al) => al.locationId);

      if (!isSuperAdmin) {
        whereClause.locationId = { in: assignedLocationIds };
      } else if (locationIdParam && !isNaN(Number(locationIdParam))) {
        whereClause.locationId = Number(locationIdParam);
      }

      if (status && status !== 'ALL') {
        whereClause.status = status;
      }
    }

    const qrBookings = await (prisma as any).qrBooking.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true, email: true } },
        booking: {
          select: {
            id: true,
            status: { select: { name: true, displayName: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: qrBookings });
  } catch (error: any) {
    console.error('[GET_QR_BOOKINGS_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch QR bookings' }, { status: 500 });
  }
}

/**
 * POST /api/admin/qr-bookings
 * Submits a new QR payment booking request.
 * Saves payment remarks + Base64 screenshotData directly to the database.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Please log in to complete your booking' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const body = await req.json();

    const {
      productId,
      pricingPlanId,
      startDate,
      date,
      endDate,
      slots,
      durationUnits,
      seats,
      discountCode,
      customerName,
      customerEmail,
      customerPhone,
      remarks,
      screenshotData,
    } = body;

    const numProductId = Number(productId);
    if (isNaN(numProductId)) {
      return NextResponse.json({ error: 'Valid productId is required' }, { status: 400 });
    }

    if (!remarks || !remarks.trim()) {
      return NextResponse.json({ error: 'Payment remarks / UTR / Reference ID is mandatory' }, { status: 400 });
    }

    // 1. Fetch Product & Location
    const product = await prisma.product.findUnique({
      where: { id: numProductId, isActive: true },
      include: {
        location: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Selected space product not found' }, { status: 404 });
    }

    // 2. Fetch Pricing Plan
    let plan = null;
    if (pricingPlanId) {
      plan = await prisma.pricingPlan.findUnique({
        where: { id: Number(pricingPlanId), productId: numProductId, isActive: true },
        select: { id: true, price: true, durationTypeId: true },
      });
    } else {
      plan = await prisma.pricingPlan.findFirst({
        where: { productId: numProductId, isActive: true },
        select: { id: true, price: true, durationTypeId: true },
      });
    }

    if (!plan) {
      return NextResponse.json({ error: 'No active pricing plan found for this space' }, { status: 404 });
    }

    // 3. User & Customer Lookup
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    let customer = await prisma.customer.findUnique({
      where: { email: customerEmail || dbUser.email },
      select: { id: true },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: customerEmail || dbUser.email,
          name: customerName || dbUser.name,
          phone: customerPhone || dbUser.phone || undefined,
        },
        select: { id: true },
      });
    }

    // 4. Compute Totals with GST
    const slotCount = Array.isArray(slots) && slots.length > 0 ? slots.length : 1;
    const units = Math.max(1, durationUnits ?? slotCount);
    const unitPrice = Number(plan.price);
    const baseSubtotal = unitPrice * units;

    const discount = discountCode === 'WELCOME10' ? baseSubtotal * 0.1 : 0;
    const subtotal = Math.max(0, baseSubtotal - discount);

    const taxRate = 18;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;

    const effectiveStartDate = new Date(startDate || date || new Date().toISOString().split('T')[0]);
    const effectiveEndDate = endDate ? new Date(endDate) : new Date(effectiveStartDate.getTime() + units * 3600000);

    const bookingNum = generateBookingNumber();

    // 5. Create pending standard Booking record
    const pendingBookingStatus = await prisma.bookingStatus.findFirst({
      where: { name: 'PENDING' },
    });

    const pendingPaymentStatus = await prisma.paymentStatus.findFirst({
      where: { name: 'PENDING' },
    });

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: bookingNum,
        customerId: customer.id,
        productId: product.id,
        durationTypeId: plan.durationTypeId,
        statusId: pendingBookingStatus?.id ?? 1,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        startTime: slots?.[0] ?? undefined,
        endTime: slots?.[slots.length - 1] ?? undefined,
        durationUnits: units,
        seats: seats ?? 1,
        unitPrice,
        totalAmount: subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        notes: `QR Payment Submission - Remarks: ${remarks.trim()}${slots ? ` | Slots: ${slots.join(', ')}` : ''}`,
      },
    });

    // 6. Create pending Payment record with method UPI_QR
    const payNum = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
    await prisma.payment.create({
      data: {
        paymentNumber: payNum,
        bookingId: booking.id,
        statusId: pendingPaymentStatus?.id ?? 1,
        amount: grandTotal,
        method: 'UPI_QR',
        transactionRef: remarks.trim(),
        notes: `QR UPI Payment submitted by customer: ${customerName || dbUser.name}`,
      },
    });

    // 7. Create QrBooking record storing screenshotData directly in MySQL
    const qrBooking = await (prisma as any).qrBooking.create({
      data: {
        bookingNumber: bookingNum,
        customerId: customer.id,
        customerName: (customerName || dbUser.name).trim(),
        customerEmail: (customerEmail || dbUser.email).trim(),
        customerPhone: (customerPhone || dbUser.phone || '').trim() || null,
        productId: product.id,
        productName: product.name,
        locationId: product.location.id,
        locationName: product.location.name,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        startTime: slots?.[0] ?? null,
        endTime: slots?.[slots.length - 1] ?? null,
        slots: Array.isArray(slots) ? slots.join(', ') : null,
        durationUnits: units,
        seats: seats ?? 1,
        subtotal,
        taxAmount,
        grandTotal,
        discountCode: discountCode || null,
        remarks: remarks.trim(),
        screenshotData: screenshotData || null,
        status: 'PENDING',
        bookingId: booking.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'QR Payment submitted for verification',
      bookingNumber: bookingNum,
      bookingId: booking.id,
      qrBookingId: qrBooking.id,
    });
  } catch (error: any) {
    console.error('[POST_QR_BOOKING_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to submit QR payment' }, { status: 500 });
  }
}
