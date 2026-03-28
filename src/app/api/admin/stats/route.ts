import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// GET /api/admin/stats - Dashboard stats (ADMIN only)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload || (payload.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [totalProducts, totalLocations, totalUsers, activeListings] =
      await Promise.all([
        prisma.product.count(),
        prisma.location.count(),
        prisma.user.count(),
        prisma.product.count({ where: { isActive: true } }),
      ]);

    return NextResponse.json({
      data: { totalProducts, totalLocations, totalUsers, activeListings },
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
