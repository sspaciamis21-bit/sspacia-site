import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

// PATCH /api/admin/invoice-payments/[id] — Update payment receive details for an approved invoice
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;
    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const role = String(payload.role || '').toUpperCase().replace(/[\s_-]/g, '');

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        });

        if (dbUser) {
          const roleName = (dbUser.role?.name || '').toUpperCase().replace(/[\s_-]/g, '');
          isAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
          isAccountant =
            (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' ||
            (dbUser.name || '').toLowerCase() === 'accounts' ||
            roleName === 'ACCOUNTS' ||
            roleName === 'ACCOUNTANT';
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const invoiceId = parseInt(rawId, 10);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid invoice ID' }, { status: 400 });
    }

    // Node scoping verification for non-admins / non-accountants
    if (!isAdmin && !isAccountant) {
      const scopedUserIds = await getNodeScopedUserIds(userId);
      if (scopedUserIds !== null) {
        const existingRecord = await (prisma as any).invoiceRecord.findUnique({
          where: { id: invoiceId },
          select: { createdById: true },
        });

        if (!existingRecord || (existingRecord.createdById && !scopedUserIds.includes(existingRecord.createdById))) {
          return NextResponse.json({ error: 'Forbidden: You cannot modify invoices from another center' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const {
      payReceiveDate,
      receiveAmount,
      paymentMode,
      utrNumber,
      utrDate,
      utrFileUrl,
      utrFileName,
      tdsDeducted,
      tdsAmount,
      paymentsJson,
      paymentStatus,
      remarks,
    } = body;

    const updateData: any = {};

    if (payReceiveDate !== undefined) {
      updateData.payReceiveDate = payReceiveDate ? new Date(payReceiveDate) : null;
    }
    if (receiveAmount !== undefined) {
      updateData.receiveAmount = receiveAmount !== '' ? Number(receiveAmount) : null;
    }
    if (paymentMode !== undefined) {
      updateData.paymentMode = paymentMode ? String(paymentMode).trim() : null;
    }
    if (utrNumber !== undefined) {
      updateData.utrNumber = utrNumber ? String(utrNumber).trim() : null;
    }
    if (utrDate !== undefined) {
      updateData.utrDate = utrDate ? new Date(utrDate) : null;
    }
    if (utrFileUrl !== undefined) {
      updateData.utrFileUrl = utrFileUrl || null;
    }
    if (utrFileName !== undefined) {
      updateData.utrFileName = utrFileName || null;
    }
    if (tdsDeducted !== undefined) {
      updateData.tdsDeducted = tdsDeducted ? String(tdsDeducted).trim() : 'No';
    }
    if (tdsAmount !== undefined) {
      updateData.tdsAmount = tdsAmount !== '' ? Number(tdsAmount) : null;
    }
    if (paymentsJson !== undefined) {
      updateData.paymentsJson = typeof paymentsJson === 'string' ? paymentsJson : JSON.stringify(paymentsJson);
    }
    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
    }
    if (remarks !== undefined) {
      updateData.remarks = remarks ? String(remarks).trim() : null;
    }

    const updated = await (prisma as any).invoiceRecord.update({
      where: { id: invoiceId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment receive details saved successfully',
      data: updated,
    });
  } catch (error) {
    console.error('[INVOICE_PAYMENT_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update payment receive details' }, { status: 500 });
  }
}
