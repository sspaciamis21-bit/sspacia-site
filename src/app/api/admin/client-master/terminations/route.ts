import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds, getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';
import { getTerminationsList, getTerminationsStats, saveTerminationChecklist } from '@/lib/termination-db';

export const dynamic = 'force-dynamic';

// GET /api/admin/client-master/terminations — List all termination records with centre & status filters
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let isAdmin = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        const role = (payload.role as string || '').toUpperCase();
        isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPER-ADMIN';
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const locationParam = url.searchParams.get('locationId') || 'ALL';
    const statusParam = url.searchParams.get('status') || 'ALL';
    const searchParam = url.searchParams.get('search') || '';

    let createdByIds: number[] | null = null;

    if (isAdmin && locationParam && locationParam !== 'ALL') {
      createdByIds = await getUserIdsByLocation(parseInt(locationParam, 10));
    } else if (!isAdmin) {
      createdByIds = await getNodeScopedUserIds(currentUserId);
    }

    const terminations = await getTerminationsList({
      status: statusParam,
      createdByIds,
      search: searchParam,
    });

    const stats = await getTerminationsStats(createdByIds);

    return NextResponse.json({
      success: true,
      terminations,
      stats,
    });
  } catch (error: any) {
    console.error('[API Terminations List Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/client-master/terminations — Initiate / Submit Termination Checklist for a Client
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientMasterId,
      agreementStartDate,
      agreementEndDate,
      lockinEndDate,
      noticePeriodMonths,
      noticeReceivedDate,
      noticeApplicableEndDate,
      sorAmountHeld,
      duesHeld,
      tdsPending,
      isSdrRefundApplicable,
      sdrRefundAmount,
      remarks,
    } = body;

    if (!clientMasterId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const client = await prisma.clientMaster.findUnique({
      where: { id: Number(clientMasterId) },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const terminationRecord = await saveTerminationChecklist({
      clientMasterId: Number(clientMasterId),
      agreementStartDate: agreementStartDate ? new Date(agreementStartDate) : null,
      agreementEndDate: agreementEndDate ? new Date(agreementEndDate) : null,
      lockinEndDate: lockinEndDate ? new Date(lockinEndDate) : null,
      noticePeriodMonths: noticePeriodMonths ? parseInt(String(noticePeriodMonths), 10) : null,
      noticeReceivedDate: noticeReceivedDate ? new Date(noticeReceivedDate) : null,
      noticeApplicableEndDate: noticeApplicableEndDate ? new Date(noticeApplicableEndDate) : null,
      sorAmountHeld: sorAmountHeld ? parseFloat(String(sorAmountHeld)) : 0,
      duesHeld: duesHeld ? parseFloat(String(duesHeld)) : 0,
      tdsPending: tdsPending ? parseFloat(String(tdsPending)) : 0,
      isSdrRefundApplicable: Boolean(isSdrRefundApplicable),
      sdrRefundAmount: sdrRefundAmount ? parseFloat(String(sdrRefundAmount)) : 0,
      remarks: remarks || '',
      createdById: userId,
    });

    // Set client status to "Termination: Pending SA 1st Approval" while in checklist pipeline
    await prisma.clientMaster.update({
      where: { id: Number(clientMasterId) },
      data: {
        clientStatus: 'Termination: Pending SA 1st Approval',
      },
    });

    // Create system notification for Super Admin
    try {
      await prisma.userNotification.create({
        data: {
          userEmail: 'admin@sspacia.com',
          title: `Termination Checklist Submitted: ${client.companyName}`,
          message: `Community Manager has submitted a termination checklist for ${client.companyName}. Review SDR refund of ₹${sdrRefundAmount || 0} and grant 1st approval.`,
        },
      });
    } catch (e) {
      console.warn('[Notification create error]:', e);
    }

    return NextResponse.json({
      success: true,
      termination: terminationRecord,
      message: 'Termination checklist submitted successfully for Super Admin review.',
    });
  } catch (error: any) {
    console.error('[API Termination Submit Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit termination checklist' },
      { status: 500 }
    );
  }
}
