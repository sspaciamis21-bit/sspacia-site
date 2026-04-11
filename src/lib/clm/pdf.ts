import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { uploadDocument } from '../driveUpload';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import prisma from '@/lib/prisma';
import { getSigningCertificate } from './certificate';

interface PDFResult {
  fileId: string;
  fileUrl: string;
}

/**
 * Shared logic to generate a PDF for a contract and update its Drive metadata.
 * Uses pdf-lib for layout and @signpdf for cryptographic signing.
 */
export async function generateContractPDF(contractId: number, userId: number): Promise<PDFResult> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      status: true,
      booking: { 
        include: { 
          customer: true, 
          product: { include: { location: true } } 
        } 
      },
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      signature: true
    }
  });

  if (!contract) {
    throw new Error('Contract not found');
  }

  // --- Unified Signature Data Extraction ---
  const customerSignInfo = contract.manualUploadUrl ? {
    data: 'MANUAL_UPLOAD',
    url: contract.manualUploadUrl,
    ip: 'PHYSICAL_NODE',
    timestamp: contract.signedAt || new Date(),
    name: contract.signerName || contract.booking?.customer?.name || 'Customer',
    isManual: true
  } : contract.signature ? {
    data: contract.signature.signatureData,
    ip: contract.signature.ipAddress || '0.0.0.0',
    timestamp: contract.signature.signedAt,
    name: contract.booking?.customer?.name || 'Customer',
    isManual: false
  } : contract.signatureData ? {
    data: contract.signatureData,
    ip: 'N/A (Direct Sign)',
    timestamp: contract.signedAt || new Date(),
    name: contract.signerName || contract.booking?.customer?.name || 'Customer',
    isManual: false
  } : null;

  const managerSignInfo = contract.counterSignatureData ? {
    data: contract.counterSignatureData,
    name: contract.counterSignerName || 'Sspacia Manager',
    timestamp: contract.counterSignedAt || new Date()
  } : null;

  if (!customerSignInfo) {
    if (contract.signatureType === 'MANUAL') {
        throw new Error('Manual signature scan has not been uploaded yet');
    }
    throw new Error('Contract has not been signed by the customer yet');
  }

  const currentVersion = contract.versions[0];
  if (!currentVersion) {
    throw new Error('No contract version found');
  }

  // --- 1. Generate PDF with pdf-lib ---
  const pdfDoc = await PDFDocument.create();

  // If manual sign, try appending the scan as the primary document pages 
  // or after the summary. Here we'll generate the summary first.
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let cursorY = height - margin;

  // Title
  page.drawText(contract.title, {
    x: margin,
    y: cursorY,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  cursorY -= 40;

  // Metadata Box
  page.drawRectangle({
    x: margin,
    y: cursorY - 60,
    width: width - (2 * margin),
    height: 60,
    color: rgb(0.98, 0.98, 0.98),
  });
  
  page.drawText(`Contract ID: ${contract.contractNumber}`, { x: margin + 10, y: cursorY - 20, size: 10, font });
  page.drawText(`Execution Date: ${new Date(customerSignInfo.timestamp).toLocaleDateString()}`, { x: margin + 10, y: cursorY - 35, size: 10, font });
  page.drawText(`Customer: ${customerSignInfo.name}`, { x: margin + 10, y: cursorY - 50, size: 10, font });
  cursorY -= 80;

  // Helper for word wrap and drawing
  const drawWrappedText = (text: string, currentFont: PDFFont, size: number, spacing = 5) => {
    const words = text.split(' ');
    let line = '';
    const maxWidth = width - (margin * 2);

    for (const word of words) {
      const testLine = line + word + ' ';
      const textWidth = currentFont.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth) {
        page.drawText(line.trim(), { x: margin, y: cursorY, size, font: currentFont });
        line = word + ' ';
        cursorY -= (size * 1.2);
        
        if (cursorY < margin + 100) { // Page break check
          page = pdfDoc.addPage([595.28, 841.89]);
          cursorY = height - margin;
        }
      } else {
        line = testLine;
      }
    }
    page.drawText(line.trim(), { x: margin, y: cursorY, size, font: currentFont });
    cursorY -= (size * 1.2 + spacing);
  };

  // Content (Iterate over Tiptap JSON nodes)
  try {
    const doc = JSON.parse(currentVersion.content);
    const nodes = doc.content || [];
    const fontSize = 11;
    const headingSize = 16;

    for (const node of nodes) {
      if (node.type === 'heading') {
        const text = ((node.content as { text: string }[]) || [])?.map(c => c.text).join('') || '';
        const level = (node.attrs as { level: number })?.level || 1;
        drawWrappedText(text, boldFont, headingSize - level, 10);
      } else if (node.type === 'paragraph') {
        const text = ((node.content as { text: string }[]) || [])?.map(c => c.text).join('') || '';
        if (text.trim()) {
          drawWrappedText(text, font, fontSize, 8);
        } else {
          cursorY -= 10;
        }
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        const items = (node.content || []) as { content: { content: { text: string }[] }[] }[];
        for (const item of items) {
          const itemNodes = item.content?.[0]?.content || [];
          const itemText = "• " + (itemNodes.map(c => c.text).join('') || '');
          drawWrappedText(itemText, font, fontSize, 5);
        }
      }

      if (cursorY < margin + 150) {
        page = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - margin;
      }
    }
  } catch (parseError) {
    console.error('[PDFGen] JSON Content Parse Error:', parseError);
    // Fallback if content is unexpectedly plain HTML or text
    const cleanContent = currentVersion.content
      .replace(/<p>/g, '').replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '');
    
    const paragraphs = cleanContent.split('\n');
    for (const para of paragraphs) {
      if (para.trim()) {
        drawWrappedText(para, font, 11, 8);
      }
    }
  }

  // Signature Section - Side-by-side
  if (!customerSignInfo.isManual) {
    cursorY -= 30;
    if (cursorY < 220) {
      page = pdfDoc.addPage([595.28, 841.89]);
      cursorY = height - margin;
    }

    page.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: width - margin, y: cursorY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    cursorY -= 30;

    // Left Side: Customer
    const leftX = margin;
    page.drawText('Customer Signature', { x: leftX, y: cursorY + 15, size: 8, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`Digital Sign: ${customerSignInfo.name}`, { x: leftX, y: cursorY, size: 10, font: boldFont });
    page.drawText(`Node: ${customerSignInfo.ip}`, { x: leftX, y: cursorY - 12, size: 8, font });
    page.drawText(`Timestamp: ${new Date(customerSignInfo.timestamp).toISOString()}`, { x: leftX, y: cursorY - 24, size: 8, font });

    if (customerSignInfo.data.startsWith('data:image')) {
      try {
        const sigImgBase64 = customerSignInfo.data.split(',')[1];
        const sigImg = await pdfDoc.embedPng(Buffer.from(sigImgBase64, 'base64'));
        const dims = sigImg.scale(0.18);
        page.drawImage(sigImg, { x: leftX, y: cursorY - 110, width: dims.width, height: dims.height });
      } catch { /* Silent */ }
    }

    // Right Side: Manager
    const rightX = (width / 2) + 10;
    page.drawText('Manager Authorization', { x: rightX, y: cursorY + 15, size: 8, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
    
    if (managerSignInfo) {
      page.drawText(`Digitally Signed By: ${managerSignInfo.name}`, { x: rightX, y: cursorY, size: 10, font: boldFont });
      page.drawText(`Role: Sspacia Managerial Authority`, { x: rightX, y: cursorY - 12, size: 8, font });
      page.drawText(`Timestamp: ${new Date(managerSignInfo.timestamp).toISOString()}`, { x: rightX, y: cursorY - 24, size: 8, font });

      if (managerSignInfo.data.startsWith('data:image')) {
        try {
          const sigImgBase64 = managerSignInfo.data.split(',')[1];
          const sigImg = await pdfDoc.embedPng(Buffer.from(sigImgBase64, 'base64'));
          const dims = sigImg.scale(0.18);
          page.drawImage(sigImg, { x: rightX, y: cursorY - 110, width: dims.width, height: dims.height });
        } catch { /* Silent */ }
      }
    } else {
      page.drawText('PENDING COUNTER-SIGNATURE', { x: rightX, y: cursorY, size: 10, font: boldFont, color: rgb(0.8, 0, 0) });
      page.drawRectangle({ 
        x: rightX, 
        y: cursorY - 100, 
        width: (width / 2) - margin - 20, 
        height: 80, 
        borderDashArray: [5, 5], 
        borderWidth: 1, 
        borderColor: rgb(0.8, 0.8, 0.8) 
      });
    }
  }

  // --- 2. Add Digital Signature Placeholder with @signpdf ---
  pdflibAddPlaceholder({
    pdfDoc,
    reason: 'Contract Execution',
    contactInfo: 'support@sspacia.com',
    name: 'Sspacia CLM',
    location: 'Bangalore, IN',
    signatureLength: 3322, // Buffer for the signature
  });

  const pdfBytes = await pdfDoc.save();

  // --- 3. Cryptographically Sign with @signpdf ---
  const { p12Buffer, password } = await getSigningCertificate();
  const signer = new P12Signer(p12Buffer, { passphrase: password });
  
  const signedPdfBuffer = await signpdf.sign(Buffer.from(pdfBytes), signer);

  // --- 4. Upload to Drive using helper ---
  console.log(`[CONTRACT_FINALISE] Uploading final PDF to Drive for ${contract.contractNumber}...`);
  
  const result = await uploadDocument({
    companyName: 'SSPACIA',
    customerName: customerSignInfo.name,
    category: 'Contracts',
    fileName: `${contract.contractNumber.replace(/\//g, '_')}.pdf`,
    mimeType: 'application/pdf',
    fileBuffer: signedPdfBuffer
  });

  console.log(`[CONTRACT_FINALISE] Upload successful: ${result.fileId}`);


  // --- 5. Update Record, Log & Sync to Documents Section ---
  console.log(`[CONTRACT_FINALISE] Starting sync for contract ${contract.contractNumber}...`);

  const agreementCategory = await prisma.documentCategory.findFirst({ 
    where: { OR: [{ name: 'AGREEMENT' }, { slug: 'agreement' }] } 
  });
  const approvedStatus = await prisma.documentStatus.findFirst({ 
    where: { name: 'APPROVED' } 
  });

  await prisma.contract.update({
    where: { id: contractId },
    data: {
      finalDriveFileId: result.fileId,
      finalDriveUrl: result.fileUrl
    }
  });

  // Add to global documents table for dashboard visibility
  try {
    const doc = await prisma.document.create({
      data: {
        customerId: contract.booking.customerId,
        bookingId: contract.bookingId,
        categoryId: agreementCategory?.id || 3, // Fallback to AGREEMENT (ID 3)
        statusId: approvedStatus?.id || 4,      // Fallback to APPROVED (ID 4)
        reviewedById: userId,
        title: `${contract.title}`,
        fileUrl: result.fileUrl,
        fileName: `${contract.contractNumber.replace(/\//g, '_')}.pdf`,
        mimeType: 'application/pdf',
        reviewedAt: new Date(),
        notes: `System-generated from finalised contract ${contract.contractNumber}`
      }
    });
    console.log(`[CONTRACT_FINALISE] Document created successfully: ID=${doc.id}`);
  } catch (docError) {
    console.error(`[CONTRACT_FINALISE] Failed to create Document record:`, docError);
  }

  await prisma.activityLog.create({
    data: {
      userId,
      action: 'CONTRACT_COUNTER_SIGNED',
      module: 'contracts',
      recordId: contractId,
      newData: `Manager finalised contract ${contract.contractNumber} and synced to Documents system`,
      ipAddress: 'System'
    }
  });

  return {
    fileId: result.fileId,
    fileUrl: result.fileUrl
  };
}
