import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

// GET /api/public/bookings/booked-slots?productId=X&date=YYYY-MM-DD
// Returns which time slots are already taken for the given product/date,
// identifying slots booked by the current user vs other customers.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const dateStr = searchParams.get('date');

    if (!productId || !dateStr) {
      return NextResponse.json({ error: 'Missing productId or date' }, { status: 400 });
    }

    const id = parseInt(productId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    const payload = await requireAuth();
    let currentCustomerId: number | null = null;

    if (payload?.email) {
      const customer = await prisma.customer.findUnique({
        where: { email: payload.email as string },
        select: { id: true },
      });
      if (customer) {
        currentCustomerId = customer.id;
      }
    }

    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookings = await prisma.booking.findMany({
      where: {
        productId: id,
        startDate: { gte: startOfDay, lte: endOfDay },
        status: { name: { notIn: ['CANCELLED', 'FAILED'] } },
      },
      select: { startTime: true, endTime: true, customerId: true },
    });

    const bookedSlots = new Set<string>();
    const myBookedSlots = new Set<string>();
    const othersBookedSlots = new Set<string>();

    for (const booking of bookings) {
      if (booking.startTime && booking.endTime) {
        const startIdx = TIME_SLOTS.indexOf(booking.startTime);
        const endIdx = TIME_SLOTS.indexOf(booking.endTime);
        const isMine = Boolean(currentCustomerId && booking.customerId === currentCustomerId);

        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            const slot = TIME_SLOTS[i];
            bookedSlots.add(slot);
            if (isMine) {
              myBookedSlots.add(slot);
            } else {
              othersBookedSlots.add(slot);
            }
          }
        } else if (startIdx !== -1 && booking.startTime === booking.endTime) {
          bookedSlots.add(booking.startTime);
          if (isMine) {
            myBookedSlots.add(booking.startTime);
          } else {
            othersBookedSlots.add(booking.startTime);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(bookedSlots),
      bookedSlots: Array.from(bookedSlots),
      myBookedSlots: Array.from(myBookedSlots),
      othersBookedSlots: Array.from(othersBookedSlots),
    });
  } catch (error) {
    console.error('[PUBLIC_BOOKED_SLOTS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
