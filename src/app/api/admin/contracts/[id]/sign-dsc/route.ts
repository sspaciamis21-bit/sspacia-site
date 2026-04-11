import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import { hashDocument } from '@/lib/clm/signature-utils';
import { generateSigningChallenge, verifyDSCSignature } from '@/lib/clm/digital-signature';

/**
 * GET /api/admin/contracts/[id]/sign-dsc
 * Generate a signing challenge for the manager.
 */
export const GET = withPermission('clm', 'approve', async (
  req: NextRequest,
  { params }: PermissionContext
) => {
  try {
    const { id } = await params;
    const contractId = Number(id);

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const lastVersion = contract.versions[0];
    if (!lastVersion) return NextResponse.json({ error: 'No content found' }, { status: 400 });

    const documentHash = hashDocument(lastVersion.content);
    const { challengeToken, challenge } = generateSigningChallenge(id, documentHash);

    await prisma.signingChallenge.create({
      data: {
        contractId: id,
        token: challengeToken,
        expiresAt: new Date(challenge.expiresAt),
      }
    });

    return NextResponse.json({
      data: {
        challengeToken,
        documentHash,
        expiresAt: challenge.expiresAt,
      }
    });

  } catch (error) {
    console.error('[AdminDSCChallenge] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

/**
 * POST /api/admin/contracts/[id]/sign-dsc
 * Verify the manager's DSC signature.
 * NOTE: This only VERIFIES. The actual counter-sign fields update is handled by /sign-counter.
 */
export const POST = withPermission('clm', 'approve', async (
  req: NextRequest,
  { params }: PermissionContext
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { challengeToken, signedData, certificate, algorithm } = body;

    const challenge = await prisma.signingChallenge.findUnique({
      where: { token: challengeToken }
    });

    if (!challenge || challenge.used || new Date() > challenge.expiresAt) {
      return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
    }

    // Mark used
    await prisma.signingChallenge.update({
      where: { id: challenge.id },
      data: { used: true }
    });

    const verification = await verifyDSCSignature({
      contractId: id,
      signedData,
      certificate,
      algorithm,
      timestamp: new Date().toISOString()
    }, challengeToken);

    if (verification.valid) {
      return NextResponse.json({ 
        data: { 
          success: true, 
          signerName: verification.signerName,
          certificate // Returning so frontend can send it to /sign-counter
        } 
      });
    } else {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('[AdminDSCVerify] Error:', error);
    const msg = error instanceof Error ? error.message : 'Verification error';
    return NextResponse.json({ error: msg || 'Verification error' }, { status: 400 });
  }
});
