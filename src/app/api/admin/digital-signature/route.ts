import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await (prisma as any).digitalSignatureSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: setting || {
        signatureUrl: '',
        signerName: 'PRAVEEN DILIPKUMAR AGARWAL',
        signerTitle: 'Director',
        companyName: 'SSPACIA INDIA PVT LTD',
        isActive: false,
      },
    });
  } catch (error) {
    console.error('Fetch digital signature error:', error);
    return NextResponse.json({ error: 'Failed to fetch signature settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId = 1;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
      }
    }

    const contentType = request.headers.get('content-type') || '';

    let signatureUrl = '';
    let signerName = 'PRAVEEN DILIPKUMAR AGARWAL';
    let signerTitle = 'Director';
    let companyName = 'SSPACIA INDIA PVT LTD';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      signerName = (formData.get('signerName') as string) || signerName;
      signerTitle = (formData.get('signerTitle') as string) || signerTitle;
      companyName = (formData.get('companyName') as string) || companyName;

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `signature_${Date.now()}.${ext}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signatures');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        signatureUrl = `/uploads/signatures/${fileName}`;
      }
    } else {
      const body = await request.json();
      signatureUrl = body.signatureUrl || '';
      signerName = body.signerName || signerName;
      signerTitle = body.signerTitle || signerTitle;
      companyName = body.companyName || companyName;
    }

    // Upsert signature setting
    const existing = await (prisma as any).digitalSignatureSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    let result;
    if (existing) {
      result = await (prisma as any).digitalSignatureSetting.update({
        where: { id: existing.id },
        data: {
          signatureUrl: signatureUrl || existing.signatureUrl,
          signatureName: signatureUrl ? 'Uploaded Signature Stamp' : existing.signatureName,
          signerName,
          signerTitle,
          companyName,
          userId,
          updatedAt: new Date(),
        },
      });
    } else {
      result = await (prisma as any).digitalSignatureSetting.create({
        data: {
          signatureUrl,
          signatureName: 'Uploaded Signature Stamp',
          signerName,
          signerTitle,
          companyName,
          userId,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Digital signature stamp updated successfully!',
      data: result,
    });
  } catch (error) {
    console.error('Update digital signature error:', error);
    return NextResponse.json({ error: 'Failed to update signature settings' }, { status: 500 });
  }
}
