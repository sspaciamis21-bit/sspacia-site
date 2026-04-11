import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

/**
 * POST /api/admin/contracts/[id]/negotiate
 * Managers responding to a contract negotiation.
 */
export const POST = withPermission('clm', 'update', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const contractId = Number(id);

    const { message, body, negotiationId } = await req.json();
    const finalMessage = message || body;

    if (!finalMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }


    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Ensure negotiation exists or create one if this is the first response
    let negId = negotiationId;
    if (!negId) {
      const activeNeg = await prisma.contractNegotiation.findFirst({
        where: { contractId, status: 'OPEN' }
      });
      negId = activeNeg?.id;
    }

    if (!negId) {
      // Create a new negotiation thread if none open
      const newNeg = await prisma.contractNegotiation.create({
        data: {
          contractId,
          title: 'Manager Review',
          status: 'OPEN'
        }
      });
      negId = newNeg.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Message
      const msg = await tx.negotiationMessage.create({
        data: {
          negotiationId: negId,
          authorType: 'STAFF',
          authorUserId: Number(payload.id),

          body: finalMessage
        }
      });


      // 2. Update Contract status to NEGOTIATION if not already
      const negStatus = await tx.contractStatus.findUnique({ where: { name: 'NEGOTIATION' } });
      if (negStatus && contract.statusId !== negStatus.id) {
        await tx.contract.update({
          where: { id: contractId },
          data: { statusId: negStatus.id }
        });
      }

      // 3. Log Activity
      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),

          action: 'UPDATE',
          module: 'clm_negotiate',
          recordId: contractId,
          newData: JSON.stringify({ message, negotiationId: negId })
        }
      });

      return msg;
    });

    return NextResponse.json({
      message: 'Negotiation message sent',
      data: result
    });

  } catch (error) {
    console.error('[AdminContractNegotiate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
