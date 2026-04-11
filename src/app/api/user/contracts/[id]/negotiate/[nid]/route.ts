import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/user/contracts/[id]/negotiate/[nid]
 * Allows a customer to reply to a specific negotiation thread.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; nid: string }> }
) {
  try {
    const { id, nid } = await context.params;
    const contractId = Number(id);
    const negotiationId = Number(nid);

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

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const negotiation = await prisma.contractNegotiation.findUnique({
      where: { id: negotiationId },
      include: { contract: true }
    });

    if (!negotiation || negotiation.contractId !== contractId) {
       return NextResponse.json({ error: 'Negotiation thread not found' }, { status: 404 });
    }

    // Verify ownership
    if (negotiation.contract.bookingId) {
        const contract = await prisma.contract.findUnique({
            where: { id: contractId },
            include: { booking: true }
        });
        if (!contract || contract.booking?.customerId !== customer.id) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    const negMessage = await prisma.negotiationMessage.create({
      data: {
        negotiationId: negotiationId,
        authorType: 'CUSTOMER',
        authorCustomerId: customer.id,
        body: message
      }
    });

    return NextResponse.json({
      message: 'Reply delivered',
      data: { negMessage }
    });

  } catch (error) {
    console.error('[ReplyNegotiation] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
