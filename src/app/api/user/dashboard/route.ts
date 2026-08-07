import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/user/dashboard — User personalized dashboard stats
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const email = payload.email as string;

    // Find the customer record matching the user's email to get their external activity
    const customer = await prisma.customer.findUnique({
        where: { email }
    });

    // Fetch user details for profile completion check
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            name: true,
            email: true,
            phone: true,
            companyName: true
        }
    });

    const isProfileComplete = !!(user?.companyName && user?.phone);

    // 1. Fetch relevant metrics if customer exists
    let totalBookings = 0;
    let pendingTickets = 0;
    let totalTickets = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentBookings: any[] = [];

    if (customer) {
      const results = await prisma.$transaction([
        // Count total bookings for this customer (via email link)
        prisma.booking.count({ where: { customerId: customer.id } }),

        // Count unresolved tickets for this customer
        prisma.supportTicket.count({
          where: {
            customerId: customer.id,
            status: { name: { notIn: ['CLOSED', 'RESOLVED'] } }
          }
        }),

        // Count all tickets for this customer
        prisma.supportTicket.count({ where: { customerId: customer.id } }),

        // Fetch last 5 bookings for summary
        prisma.booking.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            bookingNumber: true,
            grandTotal: true,
            startDate: true,
            product: { select: { name: true } },
            status: { select: { displayName: true } }
          }
        })
      ]);

      [totalBookings, pendingTickets, totalTickets, recentBookings] = results;
    }


    return NextResponse.json({
      data: {
        stats: {
          totalBookings,
          activePasses: isProfileComplete ? 1 : 0, // Placeholder mapping
          pendingTickets,
          totalTickets,
        },
        recentActivity: recentBookings
      }
    });
  } catch (error) {
    console.error('[USER_DASHBOARD_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
