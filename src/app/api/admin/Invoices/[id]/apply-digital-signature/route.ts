import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { stampPdfWithDigitalSignature } from '@/lib/digital-signature';
import fs from 'fs';
import path from 'path';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId = 1;
    let userName = 'Community Manager';

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        userName = (payload.name as string) || (payload.email as string) || userName;
      }
    }

    const { id: rawId } = await params;
    const invoiceRecordId = parseInt(rawId, 10);
    if (isNaN(invoiceRecordId)) {
      return NextResponse.json({ error: 'Invalid invoice record ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { signerName, signerTitle, customSignatureUrl } = body;

    // 1. Fetch InvoiceRecord and attached invoice PDF
    const invoiceRecord = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceRecordId },
      include: {
        attachedInvoice: true,
      },
    });

    if (!invoiceRecord) {
      return NextResponse.json({ error: 'Invoice record not found' }, { status: 404 });
    }

    const pdfUrl = invoiceRecord.attachedInvoice?.fileUrl;
    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'No accountant invoice PDF attached to sign. Please upload an invoice PDF first.' },
        { status: 400 }
      );
    }

    // 2. Fetch active digital signature stamp setting
    const signatureSetting = await (prisma as any).digitalSignatureSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const activeSignatureUrl = customSignatureUrl || signatureSetting?.signatureUrl || '';
    const activeSigner = signerName || signatureSetting?.signerName || 'PRAVEEN DILIPKUMAR AGARWAL';
    const activeTitle = signerTitle || signatureSetting?.signerTitle || 'Director';
    const company = signatureSetting?.companyName || 'SSPACIA INDIA PVT LTD';

    // 3. Read base PDF bytes (support both DB StoredDocument and Remote/Local files)
    let pdfBuffer: Buffer | null = null;

    if (pdfUrl.includes('/api/admin/stored-documents/')) {
      const match = pdfUrl.match(/\/api\/admin\/stored-documents\/(\d+)/);
      if (match && match[1]) {
        const docId = Number(match[1]);
        const doc = await (prisma as any).storedDocument.findUnique({
          where: { id: docId },
          select: { fileData: true },
        });
        if (doc?.fileData) {
          pdfBuffer = Buffer.from(doc.fileData);
        }
      }
    }

    if (!pdfBuffer) {
      if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`Failed to fetch attached PDF from remote storage: HTTP ${res.status}`);
        pdfBuffer = Buffer.from(await res.arrayBuffer());
      } else {
        const localPath = path.join(process.cwd(), 'public', pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl);
        if (fs.existsSync(localPath)) {
          pdfBuffer = fs.readFileSync(localPath);
        } else {
          // If not on disk, try looking up in storedDocument as fallback
          const doc = await (prisma as any).storedDocument.findFirst({
            where: { fileName: invoiceRecord.attachedInvoice?.fileName || '' },
            select: { fileData: true },
          });
          if (doc?.fileData) {
            pdfBuffer = Buffer.from(doc.fileData);
          } else {
            return NextResponse.json({ error: `Attached invoice PDF file not found at ${pdfUrl}` }, { status: 404 });
          }
        }
      }
    }

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'Could not load PDF content to apply digital signature' }, { status: 400 });
    }

    // 4. Apply Digital Signature Stamp
    const signedPdfBuffer = await stampPdfWithDigitalSignature(pdfBuffer, {
      signerName: activeSigner,
      signerTitle: activeTitle,
      companyName: company,
      signatureImageUrl: activeSignatureUrl,
      date: new Date(),
    });

    // 5. Save stamped PDF to Database StoredDocument (ensures persistence on Hostinger / Cloud)
    const signedFileName = `signed_invoice_${invoiceRecord.id}_${Date.now()}.pdf`;

    const storedDoc = await (prisma as any).storedDocument.create({
      data: {
        fileName: signedFileName,
        fileData: signedPdfBuffer,
        mimeType: 'application/pdf',
        fileSize: signedPdfBuffer.length,
      },
    });

    const signedPdfUrl = `/api/admin/stored-documents/${storedDoc.id}`;

    // Optionally also write to disk if directory is accessible
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signed-invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, signedFileName), signedPdfBuffer);
    } catch (diskErr) {
      console.warn('[DIGITAL_SIGN] Disk write notice (DB storage used):', diskErr);
    }

    // 6. Update InvoiceRecord
    const updated = await (prisma as any).invoiceRecord.update({
      where: { id: invoiceRecordId },
      data: {
        digitallySignedPdfUrl: signedPdfUrl,
        digitallySignedPdfName: signedFileName,
        signedAt: new Date(),
        signedByName: activeSigner,
        status: 'APPROVED', // Once signed, invoice is approved and client-ready
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Digital signature applied successfully!',
      data: {
        invoiceRecord: updated,
        signedPdfUrl,
      },
    });
  } catch (error) {
    console.error('Apply digital signature error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply digital signature' },
      { status: 500 }
    );
  }
}
