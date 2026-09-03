import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { deleteBookingCascade } from '@/lib/bookingDeleteHelper';

/**
 * DELETE /api/admin/bookings/[id]
 * Permanently deletes a booking record (SUPER ADMIN ONLY).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const resolvedParams = await params;
    const bookingId = Number(resolvedParams.id);

    if (isNaN(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: { role: true },
    });

    const isSuperAdmin = dbUser?.role?.name === 'ADMIN' || dbUser?.role?.name === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can delete bookings' }, { status: 403 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, product: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking record not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all cascading dependencies (contracts, negs, sigs, payments, units, docs, qr) & booking
      await deleteBookingCascade(tx, bookingId);

      // 2. Activity Log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          module: 'bookings',
          recordId: bookingId,
          oldData: JSON.stringify({
            bookingNumber: booking.bookingNumber,
            customerName: booking.customer?.name,
            customerEmail: booking.customer?.email,
            productName: booking.product?.name,
            grandTotal: booking.grandTotal,
          }),
          newData: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${booking.bookingNumber} has been permanently deleted.`,
    });
  } catch (error: any) {
    console.error('[DELETE_BOOKING_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete booking' }, { status: 500 });
  }
}
