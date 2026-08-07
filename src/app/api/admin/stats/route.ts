import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

// GET /api/admin/stats — Dashboard summary counts
export const GET = withPermission('reports', 'read', async () => {
  try {
    const [
      totalLocations,
      totalProducts,
      totalBookings,
      totalRevenue,
      pendingTickets,
      totalUsers,
      recentBookings,
    ] = await prisma.$transaction([
      prisma.location.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: { name: 'PAID' } },
      }),
      prisma.supportTicket.count({
        where: { status: { name: { notIn: ['CLOSED', 'RESOLVED'] } } },
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          bookingNumber: true,
          grandTotal: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
          product:  { select: { name: true } },
          status:   { select: { name: true, displayName: true, color: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalLocations,
        totalProducts,
        totalBookings,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        pendingTickets,
        totalUsers,
        recentBookings,
      },
    });
  } catch (error) {
    console.error('[STATS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
