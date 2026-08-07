import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/contracts/[id]
 * Returns full details of a specific contract.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    const contract = await prisma.contract.findUnique({
      where: { id: Number(id) },

      include: {
        status: true,
        booking: {
          include: {
            product: { 
              include: { 
                type: true, 
                category: true,
                location: true 
              } 
            }
          }
        },

        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 5
        },
        negotiations: {
          include: { messages: true },
          orderBy: { createdAt: 'desc' }
        },
        signature: true
      }

    });

    if (!contract || contract.booking.customerId !== customer.id) {

      return NextResponse.json({ error: 'Contract not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ data: contract });

  } catch (error) {
    console.error('[UserContractDetail] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
