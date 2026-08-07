import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await requireAuth();
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { signatureData } = body;

  if (!signatureData) {
    return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
  }

  const contractId = parseInt(id);
  if (isNaN(contractId)) {
    return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 });
  }

  try {
    // Verify contract existence and pending status
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { 
        status: true,
        booking: {
          include: { customer: true }
        }
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const signedStatus = await prisma.contractStatus.findUnique({
      where: { name: 'SIGNED' }
    });

    if (!signedStatus) throw new Error('Target status SIGNED not found');

    await prisma.$transaction(async (tx) => {
      // 1. Update Contract
      await tx.contract.update({
        where: { id: contractId },
        data: {
          signatureType: 'CANVAS',
          signatureData: signatureData,
          signedAt: new Date(),
          signerName: (payload.name as string) || (contract.booking?.customer?.name) || 'Member',
          statusId: signedStatus.id
        }
      });

      // 2. Log activity
      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),
          action: 'UPDATE',
          module: 'clm_sign',
          recordId: contractId,
          newData: JSON.stringify({ method: 'CANVAS', status: 'SIGNED' })
        }
      });
    });

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    console.error('[SIGN_CANVAS_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Error saving signature' }, { status: 500 });
  }
}
