import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { stampPdfWithDigitalSignature } from '@/lib/digital-signature';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const invoiceRecordId = parseInt(rawId, 10);
    if (isNaN(invoiceRecordId)) {
      return NextResponse.json({ error: 'Invalid invoice record ID' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { signedPdfBase64, signerName, serialNumber, thumbprint, issuer } = body;

    if (!signedPdfBase64) {
      return NextResponse.json({ error: 'Signed PDF data is required' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signed-invoices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const inputBuffer = Buffer.from(signedPdfBase64, 'base64');
    
    // Stamp the official Adobe Digital Signature Box and PKCS#7 cryptographic seal
    const finalSignedPdf = await stampPdfWithDigitalSignature(inputBuffer, {
      signerName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
      signerTitle: 'Director',
      companyName: 'SSPACIA INDIA PVT LTD',
      date: new Date(),
      location: 'Ahmedabad, India'
    });

    const fileName = `usb_signed_invoice_${invoiceRecordId}_${Date.now()}.pdf`;

    // Save to database StoredDocument
    const storedDoc = await (prisma as any).storedDocument.create({
      data: {
        fileName,
        fileData: finalSignedPdf,
        mimeType: 'application/pdf',
        fileSize: finalSignedPdf.length,
      },
    });

    const signedPdfUrl = `/api/admin/stored-documents/${storedDoc.id}`;

    // Optionally also write to disk if directory is accessible
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signed-invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, fileName), finalSignedPdf);
    } catch (diskErr) {
      console.warn('[USB_SIGN] Disk write notice (DB storage used):', diskErr);
    }

    const updated = await (prisma as any).invoiceRecord.update({
      where: { id: invoiceRecordId },
      data: {
        digitallySignedPdfUrl: signedPdfUrl,
        digitallySignedPdfName: fileName,
        signedAt: new Date(),
        signedByName: signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
        status: 'APPROVED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Official USB DSC Signed PDF saved successfully!',
      data: {
        invoiceRecord: updated,
        signedPdfUrl,
        signerInfo: {
          signerName,
          serialNumber,
          issuer,
        },
      },
    });
  } catch (error) {
    console.error('Save USB signed PDF error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save signed PDF' },
      { status: 500 }
    );
  }
}
