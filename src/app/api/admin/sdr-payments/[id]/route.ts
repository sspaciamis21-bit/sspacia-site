import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/sdr-payments/[id] — Update SDR payment details for a client
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
    const clientMasterId = parseInt(rawId, 10);
    if (isNaN(clientMasterId)) {
      return NextResponse.json({ error: 'Invalid Client ID' }, { status: 400 });
    }

    // Existing client check
    const existingClient = await (prisma as any).clientMaster.findUnique({
      where: { id: clientMasterId },
      select: {
        id: true,
        companyName: true,
        createdById: true,
        sdrAmount: true,
        sorAmount: true,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Strict Role Access: Only Accounts and Super Admin can record or update SDR payments (not CM)
    if (!isAdmin && !isAccountant) {
      return NextResponse.json(
        { error: 'Forbidden: Only Accounts and Super Admin can record or update SDR payments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sdrReceivedAmount,
      sdrRecdDate,
      sdrPaymentMode,
      sdrUtrNumber,
      sdrUtrDate,
      sdrBankName,
      sdrPdfUrl,
      sdrPdfName,
      sdrPaymentsJson,
      sdrPaymentStatus,
      sdrRemarks,
    } = body;

    const agreedSdr = Number(existingClient.sdrAmount ?? existingClient.sorAmount ?? 0);
    const updateData: any = {};

    if (sdrReceivedAmount !== undefined) {
      updateData.sdrReceivedAmount = sdrReceivedAmount !== '' && sdrReceivedAmount !== null ? Number(sdrReceivedAmount) : null;
    }
    if (sdrRecdDate !== undefined) {
      updateData.sdrRecdDate = sdrRecdDate ? new Date(sdrRecdDate) : null;
    }
    if (sdrPaymentMode !== undefined) {
      updateData.sdrPaymentMode = sdrPaymentMode ? String(sdrPaymentMode).trim() : null;
    }
    if (sdrUtrNumber !== undefined) {
      updateData.sdrUtrNumber = sdrUtrNumber ? String(sdrUtrNumber).trim() : null;
    }
    if (sdrUtrDate !== undefined) {
      updateData.sdrUtrDate = sdrUtrDate ? new Date(sdrUtrDate) : null;
    }
    if (sdrBankName !== undefined) {
      updateData.sdrBankName = sdrBankName ? String(sdrBankName).trim() : null;
    }
    if (sdrPdfUrl !== undefined) {
      updateData.sdrPdfUrl = sdrPdfUrl ? String(sdrPdfUrl).trim() : null;
    }
    if (sdrPdfName !== undefined) {
      updateData.sdrPdfName = sdrPdfName ? String(sdrPdfName).trim() : null;
    }
    if (sdrPaymentsJson !== undefined) {
      updateData.sdrPaymentsJson = typeof sdrPaymentsJson === 'string' ? sdrPaymentsJson : JSON.stringify(sdrPaymentsJson);
    }
    if (sdrRemarks !== undefined) {
      updateData.sdrRemarks = sdrRemarks ? String(sdrRemarks).trim() : null;
    }

    // Automatically compute status if not explicitly provided
    if (sdrPaymentStatus) {
      updateData.sdrPaymentStatus = sdrPaymentStatus;
    } else if (updateData.sdrReceivedAmount !== undefined) {
      const rec = updateData.sdrReceivedAmount || 0;
      if (agreedSdr > 0) {
        if (rec >= agreedSdr) {
          updateData.sdrPaymentStatus = 'COMPLETED';
        } else if (rec > 0) {
          updateData.sdrPaymentStatus = 'PARTIAL';
        } else {
          updateData.sdrPaymentStatus = 'PENDING';
        }
      } else if (rec > 0) {
        updateData.sdrPaymentStatus = 'COMPLETED';
      } else {
        updateData.sdrPaymentStatus = 'PENDING';
      }
    }

    // Use robust SQL execution to update SDR fields directly in MySQL (prevents Prisma in-memory schema mismatch)
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updateData.sdrReceivedAmount !== undefined) {
      setClauses.push('sdrReceivedAmount = ?');
      values.push(updateData.sdrReceivedAmount);
    }
    if (updateData.sdrPaymentStatus !== undefined) {
      setClauses.push('sdrPaymentStatus = ?');
      values.push(updateData.sdrPaymentStatus);
    }
    if (updateData.sdrRecdDate !== undefined) {
      setClauses.push('sdrRecdDate = ?');
      values.push(updateData.sdrRecdDate ? new Date(updateData.sdrRecdDate) : null);
    }
    if (updateData.sdrPaymentMode !== undefined) {
      setClauses.push('sdrPaymentMode = ?');
      values.push(updateData.sdrPaymentMode);
    }
    if (updateData.sdrUtrNumber !== undefined) {
      setClauses.push('sdrUtrNumber = ?');
      values.push(updateData.sdrUtrNumber);
    }
    if (updateData.sdrUtrDate !== undefined) {
      setClauses.push('sdrUtrDate = ?');
      values.push(updateData.sdrUtrDate ? new Date(updateData.sdrUtrDate) : null);
    }
    if (updateData.sdrBankName !== undefined) {
      setClauses.push('sdrBankName = ?');
      values.push(updateData.sdrBankName);
    }
    if (updateData.sdrPdfUrl !== undefined) {
      setClauses.push('sdrPdfUrl = ?');
      values.push(updateData.sdrPdfUrl);
    }
    if (updateData.sdrPdfName !== undefined) {
      setClauses.push('sdrPdfName = ?');
      values.push(updateData.sdrPdfName);
    }
    if (updateData.sdrPaymentsJson !== undefined) {
      setClauses.push('sdrPaymentsJson = ?');
      values.push(updateData.sdrPaymentsJson);
    }
    if (updateData.sdrRemarks !== undefined) {
      setClauses.push('sdrRemarks = ?');
      values.push(updateData.sdrRemarks);
    }

    setClauses.push('updatedAt = NOW()');
    values.push(clientMasterId);

    if (setClauses.length > 0) {
      const sql = `UPDATE ClientMaster SET ${setClauses.join(', ')} WHERE id = ?`;
      await (prisma as any).$executeRawUnsafe(sql, ...values);
    }

    const updated = await (prisma as any).clientMaster.findUnique({
      where: { id: clientMasterId },
    });

    return NextResponse.json({
      success: true,
      message: `SDR payment details updated for ${updated?.companyName || existingClient.companyName}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('[SDR_PAYMENT_UPDATE_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update SDR payment' }, { status: 500 });
  }
}
