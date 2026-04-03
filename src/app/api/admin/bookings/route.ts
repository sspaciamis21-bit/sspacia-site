import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/bookings
 *
 * Single merged bookings endpoint:
 *  - ?mine=true   → returns only the current user's own bookings (by email)
 *  - otherwise    → returns bookings scoped to the user's assigned locations
 *                   (if no locations assigned, returns all — admin behaviour)
 *
 * Supports pagination: ?page=1&limit=50
 * Supports filters:    ?statusId=X&productId=X&sortBy=createdAt&sortOrder=desc
 */
export const GET = withPermission('bookings', 'read', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const { searchParams } = req.nextUrl;

    // 1. Parse & validate
    const page      = Math.max(1, parseInt(searchParams.get('page')      ?? '1',  10));
    const limit     = Math.max(1, Math.min(100, parseInt(searchParams.get('limit')    ?? '50', 10)));
    const skip      = (page - 1) * limit;
    const mine      = searchParams.get('mine') === 'true';
    const statusId  = searchParams.get('statusId')  ? parseInt(searchParams.get('statusId')!,  10) : undefined;
    const productId = searchParams.get('productId') ? parseInt(searchParams.get('productId')!, 10) : undefined;
    const sortBy    = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    let whereClause: Prisma.BookingWhereInput = {};

    if (mine) {
      // Scope to current user's own bookings via their email → Customer record
      const dbUser = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: { email: true },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const customer = await prisma.customer.findUnique({
        where: { email: dbUser.email },
        select: { id: true },
      });

      if (!customer) {
        return NextResponse.json({ data: [], meta: { total: 0, page, limit, totalPages: 0 } });
      }

      whereClause = { customerId: customer.id };
    } else {
      // Scope to assigned locations (manager), or all (admin/no restriction)
      const user = await prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: { assignedLocations: { select: { locationId: true } } },
      });

      if (!user) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      const locationIds = user.assignedLocations.map((al) => al.locationId);

      whereClause = {
        ...(locationIds.length > 0
          ? { product: { locationId: { in: locationIds } } }
          : {}),
        ...(statusId  && !isNaN(statusId)  ? { statusId }  : {}),
        ...(productId && !isNaN(productId) ? { productId } : {}),
      };
    }

    // 2. Query
    const [total, bookings] = await prisma.$transaction([
      prisma.booking.count({ where: whereClause }),
      prisma.booking.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          bookingNumber: true,
          startDate: true,
          endDate: true,
          startTime: true,
          endTime: true,
          durationUnits: true,
          unitPrice: true,
          totalAmount: true,
          taxAmount: true,
          grandTotal: true,
          seats: true,
          createdAt: true,
          customer: {
            select: { id: true, name: true, email: true, phone: true },
          },
          product: {
            select: {
              id: true,
              name: true,
              location: { select: { id: true, name: true } },
            },
          },
          status: {
            select: { id: true, name: true, displayName: true, color: true },
          },
          durationType: {
            select: { id: true, name: true, displayName: true },
          },
          payments: {
            select: {
              id: true,
              paymentNumber: true,
              amount: true,
              method: true,
              paidAt: true,
              status: { select: { name: true, displayName: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return NextResponse.json({
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[BOOKINGS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
