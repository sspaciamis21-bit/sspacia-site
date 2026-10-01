import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { PDFDocument } from 'pdf-lib';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size cannot exceed 50MB limit' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
      }
    }

    // Ensure valid user ID exists in DB to prevent foreign key errors
    let validUserId = userId;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validUserId },
        select: { id: true },
      });
      if (!userExists) validUserId = null;
    }

    if (!validUserId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      validUserId = firstUser ? firstUser.id : 1;
    }

    const bytes = await file.arrayBuffer();
    const rawBuffer = Buffer.from(bytes);

    let finalBuffer: Buffer = rawBuffer;
    let finalMimeType: string = file.type || 'application/pdf';
    let finalFileName: string = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    let finalFileSize: number = file.size;

    // Check if the uploaded file is an image (JPG, JPEG, PNG, etc.)
    const isImageMime = file.type && file.type.toLowerCase().startsWith('image/');
    const isImageExt = /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);
    const isPngSignature = rawBuffer.length > 8 && rawBuffer[0] === 0x89 && rawBuffer[1] === 0x50 && rawBuffer[2] === 0x4E && rawBuffer[3] === 0x47;
    const isJpgSignature = rawBuffer.length > 3 && rawBuffer[0] === 0xFF && rawBuffer[1] === 0xD8 && rawBuffer[2] === 0xFF;

    if (isImageMime || isImageExt || isPngSignature || isJpgSignature) {
      try {
        const pdfDoc = await PDFDocument.create();
        let embeddedImage: any = null;

        if (isPngSignature || file.type === 'image/png' || /\.png$/i.test(file.name)) {
          try {
            embeddedImage = await pdfDoc.embedPng(rawBuffer);
          } catch {
            try {
              embeddedImage = await pdfDoc.embedJpg(rawBuffer);
            } catch {
              embeddedImage = null;
            }
          }
        } else {
          try {
            embeddedImage = await pdfDoc.embedJpg(rawBuffer);
          } catch {
            try {
              embeddedImage = await pdfDoc.embedPng(rawBuffer);
            } catch {
              embeddedImage = null;
            }
          }
        }

        if (embeddedImage) {
          const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height,
          });

          const pdfBytes = await pdfDoc.save();
          finalBuffer = Buffer.from(pdfBytes);
          finalMimeType = 'application/pdf';
          finalFileSize = finalBuffer.length;
          // Silently rename extension to .pdf
          finalFileName = finalFileName.replace(/\.[^.]+$/, '') + '.pdf';
        }
      } catch (convErr) {
        console.warn('[SILENT_PDF_CONVERSION_NOTICE] Kept original image format:', convErr);
      }
    }

    // Store directly in database for serverless (Vercel / Hostinger) compatibility
    const storedDoc = await (prisma as any).storedDocument.create({
      data: {
        fileName: finalFileName,
        mimeType: finalMimeType,
        fileData: finalBuffer,
        fileSize: finalFileSize,
        uploadedById: validUserId,
      },
    });

    const fileUrl = `/api/admin/stored-documents/${storedDoc.id}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      url: fileUrl,
      documentId: storedDoc.id,
      id: storedDoc.id,
      data: {
        fileUrl,
        fileName: finalFileName,
        fileSize: finalFileSize,
        mimeType: finalMimeType,
      },
    });
  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
  }
}