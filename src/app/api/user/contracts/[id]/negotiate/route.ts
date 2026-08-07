import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canTransition } from '@/lib/clm/transitions';

/**
 * POST /api/user/contracts/[id]/negotiate
 * Allows a customer to request changes/negotiate on a contract.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const contractId = Number(id);

    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: auth.email as string }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const { message, title } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required for negotiation' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { status: true, booking: true }
    });


    if (!contract || contract.booking.customerId !== customer.id) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const currentStatus = contract.status.name as import('@/types/clm').ContractStatusName;
    const isAlreadyNegotiating = currentStatus === 'NEGOTIATION';

    // Check if transition to NEGOTIATION is valid, or if we are already there
    if (!isAlreadyNegotiating && !canTransition(currentStatus, 'NEGOTIATION')) {
      return NextResponse.json({ 
        error: `Cannot start negotiation from current status: ${contract.status.displayName}` 
      }, { status: 400 });
    }


    const negotiationStatus = await prisma.contractStatus.findUnique({
      where: { name: 'NEGOTIATION' }
    });

    if (!negotiationStatus) {
      return NextResponse.json({ error: 'Negotiation status not configured' }, { status: 500 });
    }

    // Use a transaction to ensure all records are created correctly
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Contract Status
      await tx.contract.update({
        where: { id: contractId },
        data: { statusId: negotiationStatus.id }
      });

      // 2. Find existing OPEN negotiation or create a new one (Single Thread Model)
      let negotiation = await tx.contractNegotiation.findFirst({
        where: { contractId: contractId, status: 'OPEN' }
      });

      if (!negotiation) {
        negotiation = await tx.contractNegotiation.create({
          data: {
            contractId: contractId,
            customerId: customer.id,
            title: title || 'Agreement Negotiation',
            status: 'OPEN'
          }
        });
      }



      // 3. Create Negotiation Message
      const negMessage = await tx.negotiationMessage.create({
        data: {
          negotiationId: negotiation.id,
          authorType: 'CUSTOMER',
          authorCustomerId: customer.id,
          body: message
        }
      });

      // 4. Log Activity
      await tx.activityLog.create({
        // Note: For customers, we might not have a userId in activityLog if it's strictly User-based.
        // But our activityLog has userId (Int).
        data: {
          userId: Number(auth.id), // In current system, customer IDs and user IDs might be distinct.
          action: 'UPDATE',
          module: 'clm_negotiation',
          recordId: contractId,
          newData: JSON.stringify({ message, status: 'NEGOTIATION' })
        }
      });

      return { negMessage };
    });

    return NextResponse.json({
      message: 'Negotiation started successfully',
      data: result
    });

  } catch (error) {
    console.error('[ContractNegotiation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

