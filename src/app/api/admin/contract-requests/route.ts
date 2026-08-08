import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';

/**
 * GET /api/admin/contract-requests
 * Lists all pending or recent contract requests for managers with location scoping.
 */
export const GET = withPermission('clm', 'view', async (req: NextRequest, { payload }) => {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') || 'PENDING';

    const userId = Number(payload.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: { select: { name: true } }, assignedLocations: { select: { locationId: true } } }
    });

    const roleName = dbUser?.role?.name?.toLowerCase() || '';
    const isSuperAdmin = roleName === 'super admin' || roleName === 'admin';
    const assignedLocationIds = dbUser?.assignedLocations.map(al => al.locationId) || [];

    let locationWhere = {};
    if (!isSuperAdmin && assignedLocationIds.length > 0) {
      locationWhere = {
        booking: {
          product: {
            locationId: { in: assignedLocationIds }
          }
        }
      };
    }

    const requests = await prisma.contractRequest.findMany({
      where: {
        status,
        ...locationWhere,
      },
      include: {
        customer: { select: { id: true, name: true, email: true, organization: true } },
        booking: {
          include: {
            product: { select: { name: true, location: { select: { name: true } } } }
          }
        },
        contract: { select: { id: true, contractNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: requests });

  } catch (error) {
    console.error('[AdminContractRequests] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
