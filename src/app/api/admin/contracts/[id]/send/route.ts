import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import { canTransition } from '@/lib/clm/transitions';
import type { ContractStatusName } from '@/types/clm';

/**
 * POST /api/admin/contracts/[id]/send
 * Sends the contract to the customer for review or signature.
 */
export const POST = withPermission('clm', 'update', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const contractId = Number(id);

    const { targetStatus } = await req.json(); // Usually 'SENT' or 'PENDING_SIGN'


    if (!['SENT', 'PENDING_SIGN'].includes(targetStatus)) {
      return NextResponse.json({ error: 'Invalid target status' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { status: true }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (!canTransition(contract.status.name as ContractStatusName, targetStatus)) {
      return NextResponse.json({ 
        error: `Cannot transition from ${contract.status.displayName} to ${targetStatus}` 
      }, { status: 400 });
    }


    const newStatus = await prisma.contractStatus.findUnique({
      where: { name: targetStatus }
    });

    if (!newStatus) {
      return NextResponse.json({ error: 'Status configuration missing' }, { status: 500 });
    }

    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: { statusId: newStatus.id }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: Number(payload.id),
        action: 'UPDATE',
        module: 'clm_contract',
        recordId: contractId,
        newData: JSON.stringify({ status: targetStatus, action: 'SEND' })
      }
    });


    return NextResponse.json({
      message: `Contract status updated to ${targetStatus}`,
      data: updatedContract
    });

  } catch (error) {
    console.error('[AdminContractSend] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
