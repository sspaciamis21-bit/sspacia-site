import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

/**
 * GET /api/admin/contracts/[id]
 * Full details for managers.
 */
export const GET = withPermission('clm', 'view', async (
  req: NextRequest,
  context: PermissionContext
) => {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      console.error('[AdminContractDetail] Missing ID in params:', resolvedParams);
      return NextResponse.json({ error: 'Missing contract ID' }, { status: 400 });
    }

    const contractId = Number(id);
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID format' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        status: true,
        booking: {
          include: {
            customer: true,
            product: { include: { location: true } }
          }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: { select: { name: true } } }
        },
        negotiations: {
          include: {
            messages: {
              include: { 
                authorUser: { select: { name: true } },
                authorCustomer: { select: { name: true } }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        signature: true
      }
    });

    if (!contract) {
      console.warn(`[AdminContractDetail] Contract # ${contractId} not found.`);
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    return NextResponse.json({ data: contract });

  } catch (error) {
    console.error('[AdminContractDetail] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * PATCH /api/admin/contracts/[id]
 * Updates contract metadata.
 */
export const PATCH = withPermission('clm', 'edit', async (
  req: NextRequest,
  context: PermissionContext
) => {
  try {
    const { params } = context;
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.contract.update({
      where: { id: Number(id) },
      data: {
        statusId: body.statusId,
        title: body.title,
        notes: body.notes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
      include: { status: true }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[AdminContractUpdate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
