import { NextRequest, NextResponse } from 'next/server';
import { recordCenterRecognition } from '@/lib/suspense-db';
import { syncSuspenseActual } from '@/lib/suspenseFmsSync';

// POST /api/admin/suspense/[id]/review — Community Manager records center recognition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      centerName,
      decision, // 'ACCEPTED' | 'REJECTED'
      companyName,
      identifiedType,
      cmRemarks,
      reviewedById,
      reviewedByName,
    } = body;

    if (!centerName || !String(centerName).trim()) {
      return NextResponse.json({ error: 'Center name is required' }, { status: 400 });
    }

    if (decision !== 'ACCEPTED' && decision !== 'REJECTED') {
      return NextResponse.json(
        { error: "Decision must be either 'ACCEPTED' or 'REJECTED'" },
        { status: 400 }
      );
    }

    const result = await recordCenterRecognition({
      suspensePaymentId: numId,
      centerName: String(centerName).trim(),
      decision,
      companyName: companyName ? String(companyName).trim() : null,
      identifiedType: identifiedType ? String(identifiedType).trim() : null,
      cmRemarks: cmRemarks ? String(cmRemarks).trim() : null,
      reviewedById: reviewedById ? Number(reviewedById) : null,
      reviewedByName: reviewedByName ? String(reviewedByName).trim() : 'Community Manager',
    });

    // Background sync to Google Sheets 'expense fms' tab Column Z (Actual) and AA (Status)
    syncSuspenseActual({
      suspenseId: numId,
      centerName: String(centerName).trim(),
      actualTimestamp: result.actualTimestamp,
      status: result.fmsStatus as any,
    }).catch((syncErr) => {
      console.warn('[API /api/admin/suspense/[id]/review] Background sheet sync notice:', syncErr);
    });

    return NextResponse.json({
      success: true,
      message: `Center recognition recorded as ${decision === 'ACCEPTED' ? 'Belongs to Center' : 'Not Our Center'}`,
      payment: result.payment,
      actualTimestamp: result.actualTimestamp,
      fmsStatus: result.fmsStatus,
    });
  } catch (error: any) {
    console.error('[API /api/admin/suspense/[id]/review POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record center recognition' },
      { status: 500 }
    );
  }
}
