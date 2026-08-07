import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generatePDFForManualSign, saveUploadedScan } from '@/lib/clm/signature-utils';

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
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  });

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  const lastVersion = contract.versions[0];
  if (!lastVersion) {
    return NextResponse.json({ error: 'Contract content not found' }, { status: 400 });
  }

  const pdfBuffer = await generatePDFForManualSign({
    id: contract.id,
    title: contract.title,
    finalContent: lastVersion.content
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="contract-${id}.pdf"`,
    },
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

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate MIME type and size
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, PDF' }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
  }

  const uploadUrl = await saveUploadedScan(id, file);

  await prisma.contract.update({
    where: { id: parseInt(id) },
    data: {
      status: { connect: { name: 'SIGNED' } },
      signatureType: 'MANUAL',
      manualUploadUrl: uploadUrl,
      signedAt: new Date(),
      signerName: (payload.name as string) || 'Member'
    }
  });

  return NextResponse.json({ data: { success: true, uploadUrl } });
}
