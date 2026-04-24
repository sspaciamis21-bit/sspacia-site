/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canTransition } from '@/lib/clm/transitions';
import type { ContractStatusName } from '@/types/clm';


/**
 * POST /api/user/contracts/[id]/sign
 * Allows a customer to sign a contract that is in PENDING_SIGN status.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  try {
    const auth = await requireAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { email: auth.email as string }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const { signatureData, locationIp } = await req.json();
    if (!signatureData) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    const { id } = await params;
    const contractId = Number(id);

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { 
        status: true,
        booking: {
          include: { customer: true }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!contract || contract.booking.customerId !== customer.id) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if transition to SIGNED is valid
    if (!canTransition(contract.status.name as ContractStatusName, 'SIGNED')) {
      return NextResponse.json({ 
        error: `Cannot sign contract from current status: ${contract.status.displayName}` 
      }, { status: 400 });
    }

    const signedStatus = await prisma.contractStatus.findUnique({
      where: { name: 'SIGNED' }
    });

    if (!signedStatus) {
      return NextResponse.json({ error: 'Signed status not configured' }, { status: 500 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Signature Record
      const signature = await tx.contractSignature.create({
        data: {
          contractId: contractId,
          contractVersionId: contract.versions[0]?.id || 0, // Latest version
          signedById: customer.id,
          signatureData,
          ipAddress: locationIp || '0.0.0.0'
        }
      });


      // 2. Update Contract Status to SIGNED
      const updatedContract = await tx.contract.update({
        where: { id: contractId },
        data: { 
          statusId: signedStatus.id,
          signedAt: new Date()
        }
      });

      // 3. Log Activity
      await tx.activityLog.create({
        data: {
          userId: Number(auth.id),
          action: 'UPDATE',
          module: 'clm_sign',
          recordId: contractId,
          newData: JSON.stringify({ action: 'SIGN', signatureId: signature.id })
        }
      });

      return { updatedContract, signature };
    });

    // NOTE: PDF generation is intentionally NOT triggered here.
    // The document must be signed by BOTH the customer AND the manager (counter-sign)
    // before the final PDF is generated. PDF generation happens in the counter-sign route.

    return NextResponse.json({
      message: 'Contract signed successfully. Awaiting management counter-signature.',
      data: result
    });


  } catch (error) {
    console.error('[ContractSign] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
