import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import { generateContractPDF } from '@/lib/clm/pdf';

/**
 * POST /api/admin/contracts/[id]/sign-counter
 * Manager counter-signs the contract using Canvas method.
 * PDF is generated ONLY after both customer and manager have signed.
 */
export const POST = withPermission('clm', 'approve', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { method, signatureData, signerName, certificate } = body;

    if (!signatureData) {
      return NextResponse.json({ error: 'Signature data is required' }, { status: 400 });
    }

    const contractId = Number(id);

    // Update contract with counter-signature
    await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({
        where: { id: contractId },
        include: { status: true }
      });

      if (!contract) throw new Error('Contract not found');
      if (contract.status.name !== 'SIGNED') {
         throw new Error('Contract must be signed by customer first');
      }

      await tx.contract.update({
        where: { id: contractId },
        data: {
          counterSignatureType: method || 'CANVAS',
          counterSignatureData: signatureData,
          counterSignerCertificate: certificate,
          counterSignerName: signerName || payload.name || 'Sspacia Manager',
          counterSignedAt: new Date(),
        }
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),
          action: 'CONTRACT_COUNTER_SIGNED',
          module: 'clm_contract',
          recordId: contractId,
          newData: `Manager ${payload.name} counter-signed contract ${contract.contractNumber}`
        }
      });
    });

    // BOTH parties have now signed — generate the final PDF document
    try {
      await generateContractPDF(contractId, Number(payload.id));
      console.log(`[CounterSign] PDF generated for contract ${contractId} after both signatures.`);
    } catch (pdfErr) {
      console.error('[CounterSign] PDF generation failed:', pdfErr);
      // Don't fail the counter-sign; manager can use "Finalise" button as fallback
    }

    return NextResponse.json({
      message: 'Contract counter-signed successfully. Final document generated.'
    });

  } catch (error) {
    console.error('[AdminContractCounterSign] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : '') 
    }, { status: 500 });
  }
});
