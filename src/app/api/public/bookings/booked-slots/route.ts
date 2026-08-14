import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

// GET /api/public/bookings/booked-slots?productId=X&date=YYYY-MM-DD
// Returns which time slots are already taken for the given product/date.
// No auth required — needed by the public-facing booking UI.
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
      select: { startTime: true, endTime: true },
    });

    const bookedSlots = new Set<string>();

    for (const booking of bookings) {
      if (booking.startTime && booking.endTime) {
        const startIdx = TIME_SLOTS.indexOf(booking.startTime);
        const endIdx = TIME_SLOTS.indexOf(booking.endTime);
        if (startIdx !== -1 && endIdx !== -1) {
          for (let i = startIdx; i <= endIdx; i++) {
            bookedSlots.add(TIME_SLOTS[i]);
          }
        } else if (startIdx !== -1 && booking.startTime === booking.endTime) {
          bookedSlots.add(booking.startTime);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: Array.from(bookedSlots),
      bookedSlots: Array.from(bookedSlots),
    });
  } catch (error) {
    console.error('[PUBLIC_BOOKED_SLOTS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
