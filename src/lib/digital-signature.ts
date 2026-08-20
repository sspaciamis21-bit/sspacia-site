import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import signpdf from '@signpdf/signpdf';
import { P12Signer } from '@signpdf/signer-p12';
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib';
import fs from 'fs';
import path from 'path';
import { getInvoiceSigningCertificate } from '@/lib/digital-signature-cert';

export interface StampOptions {
  signerName?: string;
  signerTitle?: string;
  companyName?: string;
  signatureImageUrl?: string; // base64 or local file path or public URL
  date?: Date;
  location?: string;
}

/**
 * Stamps an invoice PDF with the exact Adobe-style visual digital signature box
 * AND cryptographically signs the PDF binary with PKCS#7 / PAdES standard
 * so Adobe Acrobat displays the official green ribbon "Signed and all signatures are valid".
 */
export async function stampPdfWithDigitalSignature(
  pdfBuffer: Buffer,
  options: StampOptions = {}
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  // Draw signature box at bottom right
  const boxWidth = 235;
  const boxHeight = 56;
  const margin = 20;
  const x = Math.max(10, width - boxWidth - margin);
  const y = margin + 14;

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signer = (options.signerName || 'PRAVEEN DILIPKUMAR AGARWAL').toUpperCase().trim();
  const company = options.companyName || 'SSPACIA INDIA PVT LTD';
  const signDate = options.date || new Date();

  // Format Adobe Standard Date String: YYYY.MM.DD HH:mm:ss +05'30'
  const year = signDate.getFullYear();
  const month = String(signDate.getMonth() + 1).padStart(2, '0');
  const day = String(signDate.getDate()).padStart(2, '0');
  const hours = String(signDate.getHours()).padStart(2, '0');
  const minutes = String(signDate.getMinutes()).padStart(2, '0');
  const seconds = String(signDate.getSeconds()).padStart(2, '0');
  const adobeDateStr = `${year}.${month}.${day} ${hours}:${minutes}:${seconds} +05'30'`;

  // 1. Draw "for SSPACIA INDIA PVT LTD" text right above the box
  lastPage.drawText(`for ${company}`, {
    x: x,
    y: y + boxHeight + 4,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // 2. Draw outer signature box container
  lastPage.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1.2,
  });

  // 3. Embed signature image/watermark if provided
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
            x: x + 95,
            y: y + 5,
            width: 45,
            height: 45,
            opacity: 0.25,
          });
        }
      }
    } catch (e) {
      console.warn('[DIGITAL_SIGN] Could not embed background signature graphic:', e);
    }
  }

  // 4. Draw Left Column (Bold Signer Name in Stacked Format)
  const nameParts = signer.split(' ').filter(Boolean);
  let leftY = y + boxHeight - 16;
  for (const part of nameParts) {
    lastPage.drawText(part, {
      x: x + 8,
      y: leftY,
      size: 9.5,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    leftY -= 13;
  }

  // 5. Draw Right Column (Adobe Standard Digital Signature Metadata)
  const rightX = x + 96;
  lastPage.drawText(`Digitally signed by ${nameParts[0] || signer}`, {
    x: rightX,
    y: y + boxHeight - 14,
    size: 7.2,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });

  const remainingName = nameParts.slice(1).join(' ');
  if (remainingName) {
    lastPage.drawText(remainingName, {
      x: rightX,
      y: y + boxHeight - 23,
      size: 7.2,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });
  }

  lastPage.drawText(`Date: ${year}.${month}.${day} ${hours}:${minutes}:${seconds}`, {
    x: rightX,
    y: y + boxHeight - 34,
    size: 7.2,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });

  lastPage.drawText("+05'30'", {
    x: rightX,
    y: y + boxHeight - 44,
    size: 7.2,
    font: fontRegular,
    color: rgb(0, 0, 0),
  });

  // 6. Draw "Authorised Signatory" label below box
  lastPage.drawText('Authorised Signatory', {
    x: x + 38,
    y: y - 13,
    size: 9.5,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // 7. Add Cryptographic Digital Signature Placeholder for Adobe PKCS#7 Verification
  pdflibAddPlaceholder({
    pdfDoc,
    reason: 'Invoice Authorization',
    contactInfo: 'accounts@sspacia.com',
    name: signer,
    location: options.location || 'Ahmedabad, Gujarat, IN',
    signatureLength: 8192,
  });

  const pdfBytes = await pdfDoc.save();

  // 8. Cryptographically Sign using PKCS#12 Certificate
  try {
    const { p12Buffer, password } = await getInvoiceSigningCertificate({
      signerName: signer,
      companyName: company,
      location: options.location || 'Ahmedabad',
    });

    const signerInstance = new P12Signer(p12Buffer, { passphrase: password });
    const cryptographicallySignedBytes = await signpdf.sign(Buffer.from(pdfBytes), signerInstance);

    return Buffer.from(cryptographicallySignedBytes);
  } catch (signErr) {
    console.error('[DIGITAL_SIGN] Cryptographic signing failed, returning stamped PDF:', signErr);
    return Buffer.from(pdfBytes);
  }
}
