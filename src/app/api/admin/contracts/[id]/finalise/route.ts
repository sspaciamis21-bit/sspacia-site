import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import { generateContractPDF } from '@/lib/clm/pdf';

/**
 * POST /api/admin/contracts/[id]/finalise
 * Generates final PDF via Google Apps Script and stores drive ID.
 */
export const POST = withPermission('clm', 'approve', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const contractId = Number(id);


    const result = await generateContractPDF(contractId, Number(payload.id));

    return NextResponse.json({
      message: 'Contract finalised and PDF uploaded to Drive',
      data: result
    });


  } catch (error) {
    console.error('[AdminContractFinalise] Error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : '') }, { status: 500 });
  }
});
