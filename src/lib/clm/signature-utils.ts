import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export function hashDocument(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function generatePDFForManualSign(contract: { id: string | number, title: string, finalContent: string }): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  let cursorY = height - margin;
  const fontSize = 11;
  const headingSize = 16;
  const lineHeight = 14;
  const maxWidth = width - (margin * 2);

  // Helper for word wrap and drawing
  const drawWrappedText = (text: string, currentFont: any, size: number, spacing = 5) => {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + word + ' ';
      const textWidth = currentFont.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth) {
        page.drawText(line.trim(), { x: margin, y: cursorY, size, font: currentFont });
        line = word + ' ';
        cursorY -= (size * 1.2);
        
        if (cursorY < margin + 120) { // Keep space for signature
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

  // Title
  page.drawText(contract.title, { x: margin, y: cursorY, size: 20, font: boldFont });
  cursorY -= 40;

  page.drawText(`Contract ID: ${contract.id}`, { x: margin, y: cursorY, size: 10, font });
  cursorY -= 15;
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: margin, y: cursorY, size: 10, font });
  cursorY -= 30;

  try {
    const doc = JSON.parse(contract.finalContent);
    const nodes = doc.content || [];

    for (const node of nodes) {
      if (node.type === 'heading') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        drawWrappedText(text, boldFont, headingSize - (node.attrs?.level || 1), 10);
      } else if (node.type === 'paragraph') {
        const text = node.content?.map((c: any) => c.text).join('') || '';
        if (text.trim()) {
          drawWrappedText(text, font, fontSize, 8);
        } else {
          cursorY -= 10;
        }
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        for (const item of (node.content || [])) {
          const itemText = "• " + (item.content?.[0]?.content?.map((c: any) => c.text).join('') || '');
          drawWrappedText(itemText, font, fontSize, 5);
        }
      }

      if (cursorY < margin + 120) {
        page = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - margin;
      }
    }
  } catch (e) {
    drawWrappedText(contract.finalContent.replace(/<[^>]*>/g, ''), font, fontSize);
  }

  // Signature Block at the end or on new page if no space
  if (cursorY < 150) {
    page = pdfDoc.addPage([595.28, 841.89]);
    cursorY = height - margin;
  }

  cursorY -= 40;
  page.drawRectangle({ 
    x: margin, 
    y: cursorY - 80, 
    width: 220, 
    height: 80, 
    borderWidth: 1, 
    borderColor: rgb(0, 0, 0),
    color: rgb(1, 1, 1) // White fill
  });
  page.drawText('Customer Signature', { x: margin, y: cursorY - 100, size: 12, font: boldFont });
  page.drawText('Date: ________________', { x: margin + 280, y: cursorY - 100, size: 12, font: boldFont });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function saveUploadedScan(contractId: string, file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const extension = path.extname(file.name) || '.pdf';
  const fileName = `${contractId}-scan${extension}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'signatures');
  
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return `/uploads/signatures/${fileName}`;
}
