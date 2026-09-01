import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { getTerminationById, updateTerminationFields } from '@/lib/termination-db';

export const dynamic = 'force-dynamic';

// GET /api/admin/client-master/terminations/[id] — Fetch single termination record
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const termId = parseInt(id, 10);
    if (isNaN(termId)) {
      return NextResponse.json({ error: 'Invalid termination ID' }, { status: 400 });
    }

    const termination = await getTerminationById(termId);

    if (!termination) {
      return NextResponse.json({ error: 'Termination record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      termination,
    });
  } catch (error: any) {
    console.error('[API Termination Detail Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/client-master/terminations/[id] — Edit checklist fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const termId = parseInt(id, 10);
    const body = await req.json();

    const updateData: any = {};
    if (body.agreementStartDate !== undefined) updateData.agreementStartDate = body.agreementStartDate ? new Date(body.agreementStartDate) : null;
    if (body.agreementEndDate !== undefined) updateData.agreementEndDate = body.agreementEndDate ? new Date(body.agreementEndDate) : null;
    if (body.lockinEndDate !== undefined) updateData.lockinEndDate = body.lockinEndDate ? new Date(body.lockinEndDate) : null;
    if (body.noticePeriodMonths !== undefined) updateData.noticePeriodMonths = parseInt(String(body.noticePeriodMonths), 10);
    if (body.noticeReceivedDate !== undefined) updateData.noticeReceivedDate = body.noticeReceivedDate ? new Date(body.noticeReceivedDate) : null;
    if (body.noticeApplicableEndDate !== undefined) updateData.noticeApplicableEndDate = body.noticeApplicableEndDate ? new Date(body.noticeApplicableEndDate) : null;
    if (body.sorAmountHeld !== undefined) updateData.sorAmountHeld = parseFloat(String(body.sorAmountHeld));
    if (body.duesHeld !== undefined) updateData.duesHeld = parseFloat(String(body.duesHeld));
    if (body.tdsPending !== undefined) updateData.tdsPending = parseFloat(String(body.tdsPending));
    if (body.isSdrRefundApplicable !== undefined) updateData.isSdrRefundApplicable = Boolean(body.isSdrRefundApplicable);
    if (body.sdrRefundAmount !== undefined) updateData.sdrRefundAmount = parseFloat(String(body.sdrRefundAmount));
    if (body.remarks !== undefined) updateData.remarks = body.remarks;

    const updated = await updateTerminationFields(termId, updateData);

    return NextResponse.json({
      success: true,
      termination: updated,
      message: 'Checklist details updated successfully.',
    });
  } catch (error: any) {
    console.error('[API Termination Update Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update termination record' },
      { status: 500 }
    );
  }
}
