import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';
import { generateContractNumber } from '@/lib/clm/contractNumber';

/**
 * POST /api/admin/contracts
 * Create a new contract draft from an accepted request.
 */
export const POST = withPermission('clm', 'create', async (req: NextRequest) => {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { requestId, title, content, notes, expiresAt } = await req.json();

    if (!requestId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const request = await prisma.contractRequest.findUnique({
      where: { id: Number(requestId) },
      include: { booking: { include: { product: true } } }
    });

    if (!request) {
      return NextResponse.json({ error: 'Contract request not found' }, { status: 404 });
    }

    if (request.status !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Request must be accepted before creating a contract' }, { status: 400 });
    }

    // Check if contract already exists
    const existingContract = await prisma.contract.findUnique({
      where: { requestId: Number(requestId) }
    });

    if (existingContract) {
      return NextResponse.json({ error: 'Contract already exists for this request' }, { status: 400 });
    }

    const draftStatus = await prisma.contractStatus.findUnique({
      where: { name: 'DRAFT' }
    });

    if (!draftStatus) {
      return NextResponse.json({ error: 'Draft status not configured' }, { status: 500 });
    }

    const contractNumber = await generateContractNumber(request.booking!.product.locationId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Contract
      const contract = await tx.contract.create({
        data: {
          contractNumber,
          requestId: Number(requestId),
          bookingId: Number(request.bookingId),
          statusId: draftStatus.id,
          title,
          notes,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdById: Number(auth.id),
        }
      });

      // 2. Create First Version
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          versionNumber: 1,
          content, // Tiptap JSON
          changeNote: 'Initial Draft',
          createdById: Number(auth.id)
        }
      });

      // 3. Update Contract with finalVersionId (optional, but keep it consistent if used)
      await tx.contract.update({
        where: { id: contract.id },
        data: { finalVersionId: version.id }
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          userId: Number(auth.id),
          action: 'CREATE',
          module: 'clm_contract',
          recordId: contract.id,
          newData: JSON.stringify({ contract, version })
        }
      });

      return { contract, version };
    });

    return NextResponse.json({
      message: 'Contract draft created successfully',
      data: result
    });

  } catch (error) {
    console.error('[AdminContractCreate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * GET /api/admin/contracts
 * List all contracts for managers.
 */
export const GET = withPermission('clm', 'view', async (req: NextRequest, { payload }) => {
  try {
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
        booking: { product: { locationId: { in: assignedLocationIds } } }
      };
    }

    const contracts = await prisma.contract.findMany({
      where: locationWhere,
      include: {
        status: { select: { name: true, displayName: true, color: true } },
        booking: {
          include: {
            customer: { select: { id: true, name: true, organization: true } },
            product: { 
              select: { 
                name: true, 
                location: { select: { name: true, address: true } } 
              } 
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    // Flatten for frontend
    const results = contracts.map(con => ({
      ...con,
      customer: con.booking.customer,
      booking: {
          ...con.booking,
          product: con.booking.product,
          location: con.booking.product.location
      }
    }));

    return NextResponse.json({ data: results });

  } catch (error) {
    console.error('[AdminContractsList] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
