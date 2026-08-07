import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canTransition } from '@/lib/clm/transitions';
import type { ContractStatusName } from '@/types/clm';

/**
 * POST /api/user/contracts/[id]/accept
 * Transitions a contract from SENT to PENDING_SIGN after customer review.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contractId = Number(id);

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { 
        status: true,
        booking: { include: { customer: true } } 
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Verify ownership
    if (contract.booking.customer.email !== (auth.email as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentStatus = contract.status.name as ContractStatusName;

    // Check transition
    if (!canTransition(currentStatus, 'PENDING_SIGN')) {
      return NextResponse.json({ 
        error: `Cannot accept contract from current status: ${contract.status.displayName}` 
      }, { status: 400 });
    }

    const nextStatus = await prisma.contractStatus.findUnique({
      where: { name: 'PENDING_SIGN' }
    });

    if (!nextStatus) {
      return NextResponse.json({ error: 'Status PENDING_SIGN not found' }, { status: 500 });
    }

    // Perform Update
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { statusId: nextStatus.id },
      include: { status: true }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: Number(auth.id),
        action: 'UPDATE',
        module: 'clm_accept',
        recordId: contractId,
        newData: JSON.stringify({ oldStatus: contract.status.name, newStatus: 'PENDING_SIGN' })
      }
    });

    return NextResponse.json({
      message: 'Agreement accepted. Please proceed to signing.',
      data: updated
    });

  } catch (error) {
    console.error('[ContractAccept] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
