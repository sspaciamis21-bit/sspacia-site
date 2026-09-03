import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { deleteBookingCascade } from '@/lib/bookingDeleteHelper';

/**
 * PATCH /api/admin/qr-bookings/[id]
 * Handles Approve / Reject actions by Community Manager or Super Admin.
 */
export async function PATCH(
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
    const qrBookingId = Number(resolvedParams.id);

    if (isNaN(qrBookingId)) {
      return NextResponse.json({ error: 'Invalid QR booking ID' }, { status: 400 });
    }

    const body = await req.json();
    const { action, reason } = body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Valid action (APPROVE or REJECT) is required' }, { status: 400 });
    }

    // 1. Fetch user role and assigned locations
    const dbUser = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        role: true,
        assignedLocations: { select: { locationId: true } },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSuperAdmin = dbUser.role.name === 'ADMIN' || dbUser.assignedLocations.length === 0;
    const assignedLocationIds = dbUser.assignedLocations.map((al) => al.locationId);

    // 2. Fetch QrBooking
    const qrBooking = await (prisma as any).qrBooking.findUnique({
      where: { id: qrBookingId },
      include: {
        booking: true,
      },
    });

    if (!qrBooking) {
      return NextResponse.json({ error: 'QR booking record not found' }, { status: 404 });
    }

    // 3. Location Scope Verification (Community Manager can only manage their center)
    if (!isSuperAdmin && !assignedLocationIds.includes(qrBooking.locationId)) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only verify bookings for your assigned center' },
        { status: 403 }
      );
    }

    // 4. Status mapping
    const [confirmedStatus, cancelledStatus, paidPaymentStatus, failedPaymentStatus] = await Promise.all([
      prisma.bookingStatus.findFirst({ where: { name: 'CONFIRMED' } }),
      prisma.bookingStatus.findFirst({ where: { name: 'CANCELLED' } }),
      prisma.paymentStatus.findFirst({ where: { name: 'PAID' } }),
      prisma.paymentStatus.findFirst({ where: { name: 'FAILED' } }),
    ]);

    const isApprove = action === 'APPROVE';
    const newStatus = isApprove ? 'APPROVED' : 'REJECTED';

    // 5. Update QrBooking, linked Booking, and linked Payment in transaction
    const updated = await prisma.$transaction(async (tx) => {
      const updatedQr = await (tx as any).qrBooking.update({
        where: { id: qrBookingId },
        data: {
          status: newStatus,
          rejectionReason: !isApprove ? (reason || 'Payment verification failed by space manager') : null,
          verifiedById: dbUser.id,
          verifiedAt: new Date(),
        },
      });

      if (qrBooking.bookingId) {
        await tx.booking.update({
          where: { id: qrBooking.bookingId },
          data: {
            statusId: isApprove ? (confirmedStatus?.id ?? 2) : (cancelledStatus?.id ?? 4),
            notes: `${qrBooking.remarks} | Verified by: ${dbUser.name} (${newStatus})`,
          },
        });

        await tx.payment.updateMany({
          where: { bookingId: qrBooking.bookingId },
          data: {
            statusId: isApprove ? (paidPaymentStatus?.id ?? 2) : (failedPaymentStatus?.id ?? 5),
            paidAt: isApprove ? new Date() : null,
          },
        });
      }

      return updatedQr;
    });

    return NextResponse.json({
      success: true,
      message: `QR Booking successfully ${isApprove ? 'approved and reserved' : 'rejected'}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('[PATCH_QR_BOOKING_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update QR booking' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/qr-bookings/[id]
 * Permanently deletes a QR booking (SUPER ADMIN ONLY).
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
    const qrBookingId = Number(resolvedParams.id);

    if (isNaN(qrBookingId)) {
      return NextResponse.json({ error: 'Invalid QR booking ID' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: { role: true },
    });

    const isSuperAdmin = dbUser?.role?.name === 'ADMIN' || dbUser?.role?.name === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only Super Admin can delete bookings' }, { status: 403 });
    }

    const qrBooking = await (prisma as any).qrBooking.findUnique({
      where: { id: qrBookingId },
    });

    if (!qrBooking) {
      return NextResponse.json({ error: 'QR booking record not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const bookingId = qrBooking.bookingId;

      if (bookingId) {
        // Delete all dependent records and booking via helper
        await deleteBookingCascade(tx, bookingId);
      } else {
        // Just delete QrBooking
        await (tx as any).qrBooking.delete({
          where: { id: qrBookingId },
        });
      }

      // Activity Log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          module: 'qr_bookings',
          recordId: qrBookingId,
          oldData: JSON.stringify({
            bookingNumber: qrBooking.bookingNumber,
            customerName: qrBooking.customerName,
            customerEmail: qrBooking.customerEmail,
            grandTotal: qrBooking.grandTotal,
          }),
          newData: null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `QR Booking ${qrBooking.bookingNumber} has been permanently deleted.`,
    });
  } catch (error: any) {
    console.error('[DELETE_QR_BOOKING_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete QR booking' }, { status: 500 });
  }
}


