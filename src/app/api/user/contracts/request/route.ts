import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/user/contracts/request
 * Allows a customer to request a legal contract for a confirmed booking.
 */
export async function POST(req: Request) {
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

    const { bookingId, notes }: { bookingId: string | number; notes?: string } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Verify booking belongs to this customer
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { status: true }
    });

    if (!booking || booking.customerId !== customer.id) {
      return NextResponse.json({ error: 'Booking not found or unauthorized' }, { status: 404 });
    }

    // Check if a request already exists
    const existingRequest = await prisma.contractRequest.findFirst({
      where: { bookingId: Number(bookingId) }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Contract request already exists for this booking' }, { status: 400 });
    }

    // Create Contract Request
    const contractRequest = await prisma.contractRequest.create({
      data: {
        bookingId: Number(bookingId),
        customerId: customer.id,
        requestNote: notes,
        status: 'PENDING'
      }
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: Number(auth.id),
        action: 'CREATE',
        module: 'clm_request',
        recordId: contractRequest.id,
        newData: JSON.stringify(contractRequest)
      }
    });

    return NextResponse.json({
      message: 'Contract request submitted successfully',
      data: contractRequest
    });

  } catch (error) {
    console.error('[ContractRequest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/user/contracts/request
 * Returns all contract requests submitted by the logged-in user.
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customer = await prisma.customer.findUnique({
      where: { email: auth.email as string }
    });

    if (!customer) return NextResponse.json({ data: [] });

    const requests = await prisma.contractRequest.findMany({
      where: { customerId: customer.id },
      include: {
        booking: {
          include: {
            product: { include: { location: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: requests });

  } catch (error) {
    console.error('[ContractRequestsRead] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


