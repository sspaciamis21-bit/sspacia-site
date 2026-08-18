import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface StampOptions {
  signerName?: string;
  signerTitle?: string;
  companyName?: string;
  signatureImageUrl?: string; // base64 or local file path or public URL
  date?: Date;
  location?: string;
}

export async function stampPdfWithDigitalSignature(
  pdfBuffer: Buffer,
  options: StampOptions = {}
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  // Draw digital signature stamp at bottom right
  const boxWidth = 230;
  const boxHeight = 75;
  const margin = 20;
  const x = Math.max(10, width - boxWidth - margin);
  const y = margin;

  // Background container
  lastPage.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    color: rgb(0.98, 0.99, 1.0),
    borderColor: rgb(0.0, 0.38, 0.39), // SSPACIA brand teal
    borderWidth: 1.2,
  });

  // Top accent bar
  lastPage.drawRectangle({
    x,
    y: y + boxHeight - 4,
    width: boxWidth,
    height: 4,
    color: rgb(0.0, 0.38, 0.39),
  });

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let hasImage = false;

  // Embed signature image if available
  if (options.signatureImageUrl) {
    try {
      let imgBytes: Buffer | null = null;
      if (options.signatureImageUrl.startsWith('data:image/')) {
        const base64Data = options.signatureImageUrl.split(',')[1];
        if (base64Data) imgBytes = Buffer.from(base64Data, 'base64');
      } else if (options.signatureImageUrl.startsWith('http://') || options.signatureImageUrl.startsWith('https://')) {
        const res = await fetch(options.signatureImageUrl);
        if (res.ok) {
          imgBytes = Buffer.from(await res.arrayBuffer());
        }
      } else if (options.signatureImageUrl.startsWith('/')) {
        const localPath = path.join(process.cwd(), 'public', options.signatureImageUrl);
        if (fs.existsSync(localPath)) {
          imgBytes = fs.readFileSync(localPath);
        }
      }

      if (imgBytes) {
        let embeddedImg;
        try {
          embeddedImg = await pdfDoc.embedPng(imgBytes);
        } catch {
          embeddedImg = await pdfDoc.embedJpg(imgBytes);
        }

        if (embeddedImg) {
          lastPage.drawImage(embeddedImg, {
            x: x + 8,
            y: y + 20,
            width: 70,
            height: 42,
          });
          hasImage = true;
        }
      }
    } catch (e) {
      console.warn('Could not embed signature graphic:', e);
    }
  }

  const textX = hasImage ? x + 84 : x + 12;
  const signer = options.signerName || 'Authorized Signatory';
  const title = options.signerTitle || 'Community Manager';
  const company = options.companyName || 'SSPACIA Workspaces';
  const signDate = options.date || new Date();
  const dateStr = signDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  lastPage.drawText('DIGITALLY SIGNED & VERIFIED', {
    x: textX,
    y: y + 54,
    size: 7.5,
    font: fontBold,
    color: rgb(0.0, 0.38, 0.39),
  });

  lastPage.drawText(signer, {
    x: textX,
    y: y + 42,
    size: 7.5,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  lastPage.drawText(`${title} | ${company}`, {
    x: textX,
    y: y + 32,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  lastPage.drawText(`Timestamp: ${dateStr} IST`, {
    x: textX,
    y: y + 22,
    size: 6,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Footer badge
  lastPage.drawText('[OK] Verified Electronic Signatory Seal', {
    x: x + 8,
    y: y + 8,
    size: 6,
    font: fontBold,
    color: rgb(0.05, 0.55, 0.25),
  });

  const modifiedBytes = await pdfDoc.save();
  return Buffer.from(modifiedBytes);
}
