import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

/**
 * Creates Nodemailer SMTP transport for Zoho Mail (cm@sspacia.com)
 */
function createSmtpTransport() {
  const hostCandidates = [
    process.env.SMTP_HOST || 'smtppro.zoho.in',
    'smtp.zoho.in',
    'smtppro.zoho.com',
    'smtp.zoho.com',
  ];
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || 'cm@sspacia.com').trim();
  const rawPass = (process.env.SMTP_PASS || 'VXQxVpCnBDZg').trim();
  const pass = rawPass.replace(/\s+/g, '');

  return {
    hostCandidates,
    port,
    user,
    pass,
  };
}

/**
 * Fetches PDF file buffer from StoredDocument (DB) or remote URL
 */
async function fetchPdfBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url) return null;

    // 1. If stored in local StoredDocument database (e.g. /api/admin/stored-documents/95)
    if (url.includes('/api/admin/stored-documents/')) {
      const match = url.match(/\/api\/admin\/stored-documents\/(\d+)/);
      if (match && match[1]) {
        const docId = Number(match[1]);
        const doc = await (prisma as any).storedDocument.findUnique({
          where: { id: docId },
          select: { fileData: true },
        });
        if (doc?.fileData) {
          return Buffer.from(doc.fileData);
        }
      }
    }

    // 2. If it's a remote URL
    const fullUrl = url.startsWith('http') ? url : `https://sspacia.com${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(fullUrl);
    if (!res.ok) {
      console.warn(`[Invoice Email] Failed to fetch PDF from ${fullUrl}: Status ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.error(`[Invoice Email] Error downloading PDF buffer from ${url}:`, err?.message || err);
    return null;
  }
}

/**
 * Formats ordinal suffix for due days (e.g. 7 -> "7th", 15 -> "15th", 1 -> "1st")
 */
function formatOrdinalDay(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

export interface SendInvoiceEmailOptions {
  invoiceRecordId: number;
  primaryContactPersonId?: number | null;
  customPrimaryEmail?: string;
  customPrimaryName?: string;
  customCcEmails?: string[];
}

/**
 * Dispatches the official clean Tax Invoice Email to the client.
 * 
 * Rules:
 * - Sender: SSPACIA Community Manager <cm@sspacia.com>
 * - To: Selected Primary Contact Person's Email
 * - CC: Remaining Contact Persons' Emails + praveen@sspacia.com
 * - Subject: Tax Invoice : {Company Name} - {Month and Year}
 * - Header: SSPACIA COWORKING (Approved & Issued by Community Manager)
 * - Salutation: Dear {Primary Contact Name} Ji,
 * - Body: 
 *     Please find your tax invoice for the month attached with this email.
 *     The due date for payment is {due day} of this month.
 *     [ 📥 Download Tax Invoice Button ]
 *     For any clarification, please feel free to reach us anytime.
 * - Regard: Best Regards, {Centre Name}'s Community Manager
 * - Footer: SSPACIA INDIA PVT LTD with social media links
 */
export async function sendInvoiceApprovalEmail(
  optionsOrId: number | SendInvoiceEmailOptions
): Promise<{ success: boolean; messageId?: string; recipient?: string; cc?: string[]; error?: string }> {
  try {
    const options: SendInvoiceEmailOptions =
      typeof optionsOrId === 'number'
        ? { invoiceRecordId: optionsOrId }
        : optionsOrId;

    const invoiceRecordId = options.invoiceRecordId;

    // 1. Fetch invoice record with client details, contacts, products, location, and attachments
    const invoice = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceRecordId },
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            products: { orderBy: { sortOrder: 'asc' } },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                assignedLocations: {
                  select: { location: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
        attachedInvoice: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedLocations: {
              select: { location: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: `InvoiceRecord #${invoiceRecordId} not found` };
    }

    const companyName = (invoice.companyName || invoice.clientMaster?.companyName || 'Valued Client').trim();
    const billingMonth = (invoice.billingMonth || 'Current Month').trim();

    // 2. Identify Centre Name for Community Manager Sign-off
    const locNameFromInvoice = invoice.createdBy?.assignedLocations?.[0]?.location?.name;
    const locNameFromClient = invoice.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name;
    const centreName = locNameFromInvoice || locNameFromClient || 'SSPACIA';

    // 3. Determine Primary Contact Person (To:) and Remaining Contact Persons (CC:)
    const contacts: any[] = invoice.clientMaster?.contactPersons || [];
    let primaryContact: any = null;

    if (options.primaryContactPersonId) {
      primaryContact = contacts.find((c: any) => c.id === Number(options.primaryContactPersonId));
    }

    if (!primaryContact && contacts.length > 0) {
      // Find first contact with a valid email
      primaryContact = contacts.find((c: any) => c.email && c.email.trim().includes('@')) || contacts[0];
    }

    const primaryName = (
      options.customPrimaryName ||
      primaryContact?.name ||
      companyName ||
      'Valued Member'
    ).trim();

    const recipientEmail = (
      options.customPrimaryEmail ||
      primaryContact?.email ||
      'cm@sspacia.com' // Fallback to CM if client has no email on file
    ).trim().toLowerCase();

    // Prepare CC List: All other contact persons + praveen@sspacia.com
    const otherContactEmails: string[] = [];
    contacts.forEach((c: any) => {
      if (c.email && typeof c.email === 'string') {
        const cleanEmail = c.email.trim().toLowerCase();
        if (cleanEmail.includes('@') && cleanEmail !== recipientEmail && !otherContactEmails.includes(cleanEmail)) {
          otherContactEmails.push(cleanEmail);
        }
      }
    });

    const standardCc = Array.from(new Set([...otherContactEmails, 'praveen@sspacia.com']));
    let finalCcList = options.customCcEmails !== undefined
      ? options.customCcEmails
      : standardCc;

    // If testing with t6565154@gmail.com, strictly clear all CCs
    if (recipientEmail.includes('t6565154')) {
      finalCcList = [];
    }

    // 4. Determine Due Date String
    const rawDueDay = invoice.paymentDueDay || invoice.clientMaster?.paymentDueDay || 7;
    const dueDayNumber = Math.min(31, Math.max(1, Number(rawDueDay) || 7));
    const dueDayStr = formatOrdinalDay(dueDayNumber);

    // 5. Parse splits if present
    let splits: any[] = [];
    if (invoice.splitsJson) {
      try {
        const parsed = JSON.parse(invoice.splitsJson);
        if (Array.isArray(parsed) && parsed.length > 1) {
          splits = parsed;
        }
      } catch (err) {
        console.warn(`[Invoice Email] Error parsing splitsJson for invoice #${invoiceRecordId}:`, err);
      }
    }

    const isSplitInvoice = splits.length > 1;

    // 6. Prepare PDF Attachments & Download URL
    const emailAttachments: { filename: string; content: Buffer; contentType: string }[] = [];
    let primaryDownloadUrl = 'https://sspacia.com';

    if (isSplitInvoice) {
      for (let i = 0; i < splits.length; i++) {
        const sp = splits[i];
        const fileUrl = sp.attachedInvoice?.fileUrl || (i === 0 ? (invoice.digitallySignedPdfUrl || invoice.attachedInvoice?.fileUrl) : null);
        const fileName = sp.attachedInvoice?.fileName || `Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Part${i + 1}.pdf`;

        if (fileUrl) {
          if (i === 0) {
            primaryDownloadUrl = fileUrl.startsWith('http') ? fileUrl : `https://sspacia.com${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
          }
          const buffer = await fetchPdfBuffer(fileUrl);
          if (buffer) {
            emailAttachments.push({
              filename: fileName,
              content: buffer,
              contentType: 'application/pdf',
            });
          }
        }
      }
    } else if (invoice.digitallySignedPdfUrl || invoice.attachedInvoice?.fileUrl) {
      const fileUrl = invoice.digitallySignedPdfUrl || invoice.attachedInvoice?.fileUrl;
      const fileName = invoice.digitallySignedPdfUrl
        ? `Signed_Tax_Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : (invoice.attachedInvoice?.fileName || `Tax_Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      primaryDownloadUrl = fileUrl.startsWith('http') ? fileUrl : `https://sspacia.com${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
      const buffer = await fetchPdfBuffer(fileUrl);
      if (buffer) {
        emailAttachments.push({
          filename: fileName,
          content: buffer,
          contentType: 'application/pdf',
        });
      }
    }

    // 7. Clean Subject: Tax Invoice : {Company Name} - {Month and Year}
    const subject = `Tax Invoice : ${companyName} - ${billingMonth}`;

    // 8. Plain Text Body (Anti-Spam Fallback)
    const textBody = `
Dear ${primaryName} Ji,

Please find your tax invoice for the month attached with this email.

The due date for payment is ${dueDayStr} of this month.

Download Invoice: ${primaryDownloadUrl}

For any clarification, please feel free to reach us anytime.

Best Regards,
${centreName}'s Community Manager

SSPACIA INDIA PVT LTD
Ahmedabad, Gujarat, India
Website: https://sspacia.com | Email: cm@sspacia.com | WhatsApp: +91 76003 93779
    `.trim();

    // 9. Premium HTML Template (Authentic, Minimal, Zero Fake Content)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px 12px;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .brand-header {
      background-color: #006064;
      padding: 24px 30px;
      color: #ffffff;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 0 0 6px 0;
      text-transform: uppercase;
    }
    .brand-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      color: #e0f2f1;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .email-body {
      padding: 32px 30px;
      font-size: 15px;
      line-height: 1.6;
      color: #1e293b;
    }
    .salutation {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .action-container {
      margin: 28px 0;
      text-align: left;
    }
    .btn-download {
      display: inline-block;
      background-color: #006064;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 26px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 96, 100, 0.2);
    }
    .signoff {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      font-size: 14px;
      color: #334155;
    }
    .footer-section {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .social-links {
      margin: 12px 0 16px 0;
    }
    .social-link {
      display: inline-block;
      color: #006064;
      text-decoration: none;
      font-weight: 600;
      font-size: 11px;
      margin: 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="brand-header">
      <div class="brand-title">SSPACIA COWORKING</div>
      <div class="brand-badge">Approved &amp; Issued by Community Manager</div>
    </div>

    <!-- Content -->
    <div class="email-body">
      <div class="salutation">Dear ${primaryName} Ji,</div>
      
      <p style="margin-top: 0; margin-bottom: 14px;">
        Please find your tax invoice for the month attached with this email.
      </p>

      <p style="margin-top: 0; margin-bottom: 22px;">
        The due date for payment is <strong>${dueDayStr}</strong> of this month.
      </p>

      <!-- Download Button -->
      <div class="action-container">
        <a href="${primaryDownloadUrl}" target="_blank" class="btn-download">
          📥 Download Tax Invoice
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; margin-bottom: 24px;">
        For any clarification, please feel free to reach us anytime.
      </p>

      <!-- Regard -->
      <div class="signoff">
        Best Regards,<br>
        <strong style="color: #0f172a;">${centreName}'s Community Manager</strong>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer-section">
      <div style="font-weight: 800; color: #0f172a; font-size: 12px; letter-spacing: 1px; margin-bottom: 6px;">
        SSPACIA INDIA PVT LTD
      </div>
      <div class="social-links">
        <a href="https://wa.me/917600393779" class="social-link" target="_blank">WhatsApp</a> &bull;
        <a href="https://www.instagram.com/sspacia?igsh=aWR3Z2F4MG0yMXRt" class="social-link" target="_blank">Instagram</a> &bull;
        <a href="https://www.linkedin.com/company/sspacia/" class="social-link" target="_blank">LinkedIn</a> &bull;
        <a href="https://www.facebook.com/sspacia" class="social-link" target="_blank">Facebook</a> &bull;
        <a href="https://www.youtube.com/@sspacia_" class="social-link" target="_blank">YouTube</a>
      </div>
      <div>Ahmedabad, Gujarat, India &bull; <a href="mailto:cm@sspacia.com" style="color: #006064; text-decoration: none;">cm@sspacia.com</a></div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // 10. Dispatch Email via Zoho SMTP with Multi-Host Fallback
    const { hostCandidates, port, user, pass } = createSmtpTransport();
    let messageId: string | undefined;
    let lastError: any = null;

    for (const host of hostCandidates) {
      try {
        const isSecure = port === 465;
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: isSecure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        } as nodemailer.TransportOptions);

        const info = await transporter.sendMail({
          from: `"SSPACIA Community Manager" <${user}>`,
          sender: user,
          replyTo: user,
          to: recipientEmail,
          ...(finalCcList && finalCcList.length > 0 ? { cc: finalCcList } : {}),
          subject,
          text: textBody,
          html,
          attachments: emailAttachments,
          envelope: {
            from: user,
            to: [recipientEmail, ...finalCcList].filter(Boolean),
          },
        });

        messageId = info.messageId;
        console.log(`[Invoice Email] ✅ Approved invoice email dispatched for ${companyName} (${billingMonth}) to ${recipientEmail} (CC: ${finalCcList.join(', ')}) via ${host}:${port}. Message ID: ${info.messageId}`);
        break;
      } catch (err: any) {
        console.warn(`[Invoice Email] SMTP attempt on ${host}:${port} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!messageId && lastError) {
      throw lastError;
    }

    return {
      success: true,
      messageId,
      recipient: recipientEmail,
      cc: finalCcList,
    };
  } catch (error: any) {
    console.error(`[Invoice Email] ❌ Failed to dispatch approval email:`, error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to dispatch invoice approval email',
    };
  }
}
