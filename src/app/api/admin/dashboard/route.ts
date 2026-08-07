import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/dashboard — Manager/admin dashboard: location-scoped stats
export const GET = withPermission('dashboard', 'view', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);

    // Get the caller's assigned locations and role for scoping
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        name: true,
        role: { select: { name: true } },
        assignedLocations: {
          select: {
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const roleName = user.role.name.toLowerCase();
    const isAdmin = roleName === 'admin' || roleName === 'super_admin';
    const assignedLocationIds = user.assignedLocations.map((al) => al.location.id);

    // If NOT an admin and has NO assigned locations, they effectively see nothing (unless we want to error)
    // If IS an admin, we show EVERYTHING if they have no specific assignments.
    const locationFilter = (isAdmin && assignedLocationIds.length === 0)
      ? undefined
      : { in: assignedLocationIds };

    const productFilter = locationFilter ? { locationId: locationFilter } : {};

    const [
      totalProducts,
      totalBookings,
      bookingStatusSummary,
      totalRevenue,
      pendingTickets,
      totalTickets,
      recentBookings,
      recentTickets,
    ] = await prisma.$transaction([
      // 1. Product count
      prisma.product.count({ where: { isActive: true, ...productFilter } }),

      // 2. Total bookings count
      prisma.booking.count({ where: { product: productFilter } }),

      // 3. Status breakdown
      prisma.booking.groupBy({
        by: ['statusId'],
        where: { product: productFilter },
        _count: true,
        orderBy: { statusId: 'asc' },
      }),

      // 4. Revenue
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: { name: 'PAID' },
          booking: { product: productFilter },
        },
      }),

      // 5. Unresolved tickets
      prisma.supportTicket.count({
        where: {
          status: { name: { notIn: ['CLOSED', 'RESOLVED'] } },
          ...(locationFilter ? { locationId: locationFilter } : {}),
        },
      }),

      // 6. Total tickets
      prisma.supportTicket.count({
        where: {
          ...(locationFilter ? { locationId: locationFilter } : {}),
        },
      }),

      // 7. Recent activity
      prisma.booking.findMany({
        where: { product: productFilter },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          bookingNumber: true,
          grandTotal: true,
          startDate: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
          product:  { select: { name: true, location: { select: { name: true } } } },
          status:   { select: { name: true, displayName: true, color: true } },
        },
      }),
      // 8. Recent tickets
      prisma.supportTicket.findMany({
        where: {
          status: { name: { notIn: ['CLOSED', 'RESOLVED'] } },
          ...(locationFilter ? { locationId: locationFilter } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          name: true,
          description: true,
          createdAt: true,
          status: { select: { id: true, name: true, displayName: true } },
          locationRel: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Format groupBy results
    const statusCounts = await prisma.bookingStatus.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true },
    });

    const statusBreakdown = statusCounts.map(status => {
      const match = bookingStatusSummary.find(s => s.statusId === status.id);
      return {
        id: status.id,
        name: status.name,
        displayName: status.displayName,
        count: match ? match._count : 0,
      };
    });

    return NextResponse.json({
      data: {
        user: {
          name: user.name,
          role: user.role.name,
          isGlobalView: isAdmin && assignedLocationIds.length === 0,
          locations: user.assignedLocations.map((al) => al.location),
        },
        stats: {
          totalProducts,
          totalBookings,
          totalRevenue: Number(totalRevenue._sum.amount ?? 0),
          openTickets: pendingTickets,
          totalTickets,
          totalLocations: assignedLocationIds.length,
          statusBreakdown,
        },
        recentBookings,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tickets: recentTickets.map((t: any) => ({
          ...t,
          status: t.status.name,
          location: t.locationRel?.name || 'Unknown',
        })),
        bookings: recentBookings,
        locations: user.assignedLocations.map((al) => al.location),
      },
    });
  } catch (error) {
    console.error('[DASHBOARD_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
