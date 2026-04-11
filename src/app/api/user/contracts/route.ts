import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/contracts
 * Returns all contracts for the logged-in user's customer profile.
 */
export async function GET() {
  try {
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

    const contracts = await prisma.contract.findMany({
      where: { 
        booking: {
          customerId: customer.id 
        }
      },
      include: {
        status: true,
        booking: {
          include: {
            product: { 
              include: { 
                location: true,
                type: true, 
                category: true 
              } 
            }
          }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });


    return NextResponse.json({ data: contracts });

  } catch (error) {
    console.error('[UserContractsList] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/user/contracts
 * Create a new contract request from a booking.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });

    const customer = await prisma.customer.findUnique({
      where: { email: auth.email as string }
    });
    if (!customer) return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });

    // Verify booking belongs to user & is confirmed
    const booking = await prisma.booking.findFirst({
      where: { 
        id: Number(bookingId),
        customerId: customer.id,
        status: { name: 'CONFIRMED' }
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Valid booking not found for this user' }, { status: 404 });
    }

    // Check if request already exists
    const existing = await prisma.contractRequest.findFirst({
      where: { bookingId: Number(bookingId) }
    });
    if (existing) {
      return NextResponse.json({ error: 'An agreement request already exists for this booking.' }, { status: 400 });
    }

    const request = await prisma.contractRequest.create({
      data: {
        bookingId: Number(bookingId),
        customerId: customer.id,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ message: 'Agreement request submitted.', data: request });

  } catch (error) {
    console.error('[UserContractRequest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
