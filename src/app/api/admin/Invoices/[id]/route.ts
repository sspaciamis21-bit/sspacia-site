import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const role = (payload.role as string || '').toUpperCase().replace(/[\s_-]/g, '');
        isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Node scoping verification for non-admins
    if (!isAdmin) {
      const scopedUserIds = await getNodeScopedUserIds(userId);
      if (scopedUserIds !== null) {
        const existingRecord = await (prisma as any).invoiceRecord.findUnique({
          where: { id },
          select: { createdById: true },
        });

        if (!existingRecord || (existingRecord.createdById && !scopedUserIds.includes(existingRecord.createdById))) {
          return NextResponse.json({ error: 'Forbidden: You cannot edit invoices from another center' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    const {
      companyName,
      cabinName,
      noOfSeats,
      ratePerAgreement,
      amount,
      gstPercent,
      totalAmount,
      gstNo,
      billingMonth,
      status,
      remarks,
      itemsJson,
      splitsJson,
      dueDate,
      lateFeePerDay,
      lateDays,
      lateFeeAmount,
      waivedLateDays,
      waivedLateFee,
      digitallySignedPdfUrl,
      digitallySignedPdfName,
      signedAt,
      signedByName,
    } = body;

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (cabinName !== undefined) updateData.cabinName = cabinName;
    if (noOfSeats !== undefined) updateData.noOfSeats = noOfSeats !== '' ? Number(noOfSeats) : null;
    if (ratePerAgreement !== undefined) updateData.ratePerAgreement = ratePerAgreement !== '' ? Number(ratePerAgreement) : null;
    if (amount !== undefined) updateData.amount = amount !== '' ? Number(amount) : null;
    if (gstPercent !== undefined) updateData.gstPercent = gstPercent !== '' ? Number(gstPercent) : null;
    if (totalAmount !== undefined && waivedLateDays === undefined && waivedLateFee === undefined) updateData.totalAmount = totalAmount !== '' ? Number(totalAmount) : null;
    if (gstNo !== undefined) updateData.gstNo = gstNo;
    if (billingMonth !== undefined) updateData.billingMonth = billingMonth;
    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (itemsJson !== undefined) updateData.itemsJson = itemsJson;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (lateFeePerDay !== undefined) updateData.lateFeePerDay = Number(lateFeePerDay);
    if (lateDays !== undefined && waivedLateDays === undefined && waivedLateFee === undefined) updateData.lateDays = Number(lateDays);
    if (lateFeeAmount !== undefined && waivedLateDays === undefined && waivedLateFee === undefined) updateData.lateFeeAmount = Number(lateFeeAmount);
    if (digitallySignedPdfUrl !== undefined) updateData.digitallySignedPdfUrl = digitallySignedPdfUrl;
    if (digitallySignedPdfName !== undefined) updateData.digitallySignedPdfName = digitallySignedPdfName;
    if (signedAt !== undefined) updateData.signedAt = signedAt ? new Date(signedAt) : null;
    if (signedByName !== undefined) updateData.signedByName = signedByName;

    if (Object.keys(updateData).length > 0) {
      await (prisma as any).invoiceRecord.update({
        where: { id },
        data: updateData,
      });
    }

    if (splitsJson !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE InvoiceRecord SET splitsJson = ?, updatedAt = NOW() WHERE id = ?`,
        splitsJson ? (typeof splitsJson === 'string' ? splitsJson : JSON.stringify(splitsJson)) : null,
        id
      );
    }

    if (waivedLateDays !== undefined || waivedLateFee !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE InvoiceRecord SET 
          waivedLateDays = ?, 
          waivedLateFee = ?,
          lateDays = COALESCE(?, lateDays),
          lateFeeAmount = COALESCE(?, lateFeeAmount),
          totalAmount = COALESCE(?, totalAmount),
          updatedAt = NOW()
        WHERE id = ?`,
        Number(waivedLateDays || 0),
        Number(waivedLateFee || 0),
        lateDays !== undefined ? Number(lateDays) : null,
        lateFeeAmount !== undefined ? Number(lateFeeAmount) : null,
        totalAmount !== undefined ? Number(totalAmount) : null,
        id
      );
    }

    const updated = await (prisma as any).invoiceRecord.findUnique({
      where: { id },
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            products: { orderBy: { sortOrder: 'asc' } },
          },
        },
        attachedInvoice: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update invoice record error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update invoice record' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const role = (payload.role as string || '').toUpperCase().replace(/[\s_-]/g, '');
        isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Node scoping verification for non-admins
    if (!isAdmin) {
      const scopedUserIds = await getNodeScopedUserIds(userId);
      if (scopedUserIds !== null) {
        const existingRecord = await (prisma as any).invoiceRecord.findUnique({
          where: { id },
          select: { createdById: true },
        });

        if (!existingRecord || (existingRecord.createdById && !scopedUserIds.includes(existingRecord.createdById))) {
          return NextResponse.json({ error: 'Forbidden: You cannot delete invoices from another center' }, { status: 403 });
        }
      }
    }

    // Delete attached invoices first to prevent foreign key errors
    await (prisma as any).attachedInvoice.deleteMany({
      where: { invoiceRecordId: id },
    });

    // Delete the invoice record
    await (prisma as any).invoiceRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Invoice record deleted successfully' });
  } catch (error) {
    console.error('Delete invoice record error:', error);
    return NextResponse.json({ error: 'Failed to delete invoice record' }, { status: 500 });
  }
}
