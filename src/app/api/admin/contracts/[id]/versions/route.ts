import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';


/**
 * POST /api/admin/contracts/[id]/versions
 * Creates a new version for an existing contract.
 */
export const POST = withPermission('clm', 'create', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const contractId = Number(id);

    const { content, changeNote } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const nextVersionNumber = (contract.versions[0]?.versionNumber || 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.contractVersion.create({
        data: {
          contractId,
          versionNumber: nextVersionNumber,
          content,
          changeNote,
          createdById: Number(payload.id)

        }
      });

      // Update the contract's final version pointer
      await tx.contract.update({
        where: { id: contractId },
        data: { finalVersionId: version.id }
      });

      // Log Activity
      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),

          action: 'UPDATE',
          module: 'clm_version',
          recordId: contractId,
          newData: JSON.stringify({ versionNumber: nextVersionNumber, changeNote })
        }
      });

      return version;
    });

    return NextResponse.json({
      message: `Version ${nextVersionNumber} created successfully`,
      data: result
    });

  } catch (error) {
    console.error('[AdminContractVersion] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

