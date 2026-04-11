import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const auth = await requireAuth();
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { productId, durationTypeId, unitId, startDate, endDate, notes } = body;

        if (!productId || !durationTypeId ||    !startDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get the customer ID associated with the user's email
        const customer = await prisma.customer.findUnique({
            where: { email: auth.email as string }
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
        }

        // Check if user is verified (has at least one approved KYC document)
        const approvedKyc = await prisma.document.findFirst({
            where: {
                customerId: customer.id,
                status: { name: 'APPROVED' }
            }
        });

        if (!approvedKyc) {
            return NextResponse.json({ 
                error: 'Account verification required. Please upload and get your KYC documents approved before purchasing.',
                code: 'VERIFICATION_REQUIRED'
            }, { status: 403 });
        }

        // Get Product Price
        const pricing = await prisma.pricingPlan.findUnique({
            where: {
                productId_durationTypeId: {
                    productId: Number(productId),
                    durationTypeId: Number(durationTypeId)
                }
            }
        });

        if (!pricing) {
            return NextResponse.json({ error: 'Selected pricing plan not found' }, { status: 404 });
        }

        // Get PENDING status ID
        const pendingStatus = await prisma.bookingStatus.findUnique({
            where: { name: 'PENDING' }
        });

        if (!pendingStatus) {
            return NextResponse.json({ error: 'Booking status configuration missing' }, { status: 500 });
        }

        // Generate Booking Number
        const count = await prisma.booking.count();
        const bookingNumber = `SSP-${new Date().getFullYear()}-BK${(count + 1).toString().padStart(4, '0')}`;

        // Create Booking + Optional Unit Assignment in Transaction
        const booking = await prisma.$transaction(async (tx) => {
            const newBooking = await tx.booking.create({
                data: {
                    bookingNumber,
                    customerId: customer.id,
                    productId: Number(productId),
                    durationTypeId: Number(durationTypeId),
                    statusId: pendingStatus.id,
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 30)),
                    unitPrice: pricing.price,
                    totalAmount: pricing.price,
                    grandTotal: pricing.price,
                    notes: notes || 'Product purchase request via dashboard'
                }
            });

            // If a specific unit was selected, create the assignment
            if (unitId) {
                await tx.bookingUnit.create({
                    data: {
                        bookingId: newBooking.id,
                        productUnitId: Number(unitId),
                        startDate: newBooking.startDate,
                        endDate: newBooking.endDate
                    }
                });
            }

            // ─── NEW: Create Contract Request (Agreement Request) ───────────────
            // This is what the manager sees in their "Contract Lifecycle" dashboard
            await tx.contractRequest.create({
                data: {
                    customerId: customer.id,
                    bookingId: newBooking.id,
                    status: 'PENDING',
                    requestNote: notes || 'Agreement request initiated via User Dashboard Purchase Hub'
                }
            });

            return newBooking;
        });

        // Log Activity
        await prisma.activityLog.create({
            data: {
                userId: Number(auth.id),
                action: 'CREATE',
                module: 'bookings',
                recordId: booking.id,
                newData: JSON.stringify(booking)
            }
        });

        return NextResponse.json({ 
            message: 'Purchase request and Agreement intent submitted successfully',
            data: booking 
        });

    } catch (error) {
        console.error('[BookingRequest] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
