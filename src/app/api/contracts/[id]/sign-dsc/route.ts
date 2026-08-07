/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hashDocument } from '@/lib/clm/signature-utils';
import { generateSigningChallenge, verifyDSCSignature } from '@/lib/clm/digital-signature';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const payload = await requireAuth();
  if (!payload || !payload.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contractId = parseInt(id);
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { 
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      booking: true
    }
  });

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Verify ownership: look up customer by email (JWT has no customerId)
  const role = (payload.role as string || '').toUpperCase();
  const isManager = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'MANAGER';

  if (!isManager) {
    const customer = await prisma.customer.findUnique({
      where: { email: payload.email as string }
    });
    if (!customer || contract.booking.customerId !== customer.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }
  }

  const lastVersion = contract.versions[0];
  if (!lastVersion) {
    return NextResponse.json({ error: 'Contract content not found' }, { status: 400 });
  }

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
}

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
  const { challengeToken, signedData, certificate, algorithm, pin } = body;

  // Validate PIN is provided (required for password-protected USB tokens)
  if (!pin || typeof pin !== 'string' || !pin.trim()) {
    return NextResponse.json({ error: 'USB Token PIN is required' }, { status: 400 });
  }

  const challenge = await prisma.signingChallenge.findUnique({
    where: { token: challengeToken }
  });

  if (!challenge || challenge.used || new Date() > challenge.expiresAt) {
    return NextResponse.json({ error: 'Invalid or expired challenge' }, { status: 400 });
  }

  // Replay protection: Mark used immediately
  await prisma.signingChallenge.update({
    where: { id: challenge.id },
    data: { used: true }
  });

  try {
    const verification = await verifyDSCSignature({
      contractId: id,
      signedData,
      certificate,
      algorithm,
      pin,
      timestamp: new Date().toISOString()
    }, challengeToken);

    if (verification.valid) {
      // Hash the PIN for audit trail — never store plain text
      const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
      await prisma.contract.update({
        where: { id: parseInt(id) },
        data: {
          signatureType: 'DSC',
          signatureData: JSON.stringify({
            signature: signedData,
            pinVerified: true,
            pinHash,
            verifiedAt: new Date().toISOString()
          }),
          signerCertificate: certificate,
          signerName: verification.signerName,
          signedAt: new Date(),
          status: {
            connect: { name: 'SIGNED' }
          }
        }
      });

      return NextResponse.json({ data: { success: true, signerName: verification.signerName } });
    } else {
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Signature verification error' }, { status: 400 });
  }
}
