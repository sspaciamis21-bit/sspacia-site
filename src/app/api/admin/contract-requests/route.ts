import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';

/**
 * GET /api/admin/contract-requests
 * Lists all pending or recent contract requests for managers.
 */
export const GET = withPermission('clm', 'view', async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status') || 'PENDING';

    const requests = await prisma.contractRequest.findMany({
      where: { status },
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
