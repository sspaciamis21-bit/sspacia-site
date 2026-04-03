import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/user/bookings — FETCH the authenticated user's own space reservations
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const email = payload.email as string;

    // Find the customer record matching the user's email to get their external activity
    const customer = await prisma.customer.findUnique({
        where: { email }
    });

    if (!customer) {
        return NextResponse.json({ data: [] });
    }

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          bookingNumber: true,
          createdAt: true,
          startDate: true,
          startTime: true,
          endTime: true,
          grandTotal: true,
          customer: { select: { name: true, email: true } },
          product: { 
            select: { 
                name: true, 
                location: { select: { name: true } } 
            } 
          },
          status: { select: { name: true, displayName: true } },
          payments: {
             select: { method: true },
             take: 1
          }
      }
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error('[USER_BOOKINGS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
