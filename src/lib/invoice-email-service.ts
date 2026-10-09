import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';
import { syncInvoiceWorkflowEmailSent } from '@/lib/invoiceWorkflowFmsSync';

/**
 * Creates Nodemailer SMTP transport for Google Workspace (cm@sspacia.com)
 * Verified MX record for sspacia.com: SMTP.GOOGLE.com
 */
function createSmtpTransport() {
  const hostCandidates = [
    process.env.SMTP_HOST || 'smtp.gmail.com',
    'smtp.gmail.com',
    'smtp-relay.gmail.com',
  ];
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || 'cm@sspacia.com').trim();
  const rawPass = (
    process.env.SMTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GOOGLE_APP_PASSWORD ||
    'mkpmzwrtbncmuzcr'
  ).trim();
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

    // 2. If it points to an upload URL or filename, check StoredDocument table directly
    const fileNameMatch = url.match(/([^\/\\]+\.pdf)$/i);
    if (fileNameMatch && fileNameMatch[1]) {
      const fileName = fileNameMatch[1];
      const doc = await (prisma as any).storedDocument.findFirst({
        where: {
          OR: [
            { fileName: fileName },
            { fileName: { contains: fileName } },
          ],
        },
        select: { fileData: true },
        orderBy: { id: 'desc' },
      });
      if (doc?.fileData) {
        return Buffer.from(doc.fileData);
      }
    }

    // 3. Fallback: remote URL fetch
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
  skipApprovalCheck?: boolean;
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

    const skipApproval = typeof optionsOrId !== 'number' && Boolean((optionsOrId as SendInvoiceEmailOptions).skipApprovalCheck);
    if (!skipApproval && invoice.status !== 'APPROVED') {
      return {
        success: false,
        error: `Invoice #${invoiceRecordId} is in status '${invoice.status}'. It must be reviewed and approved by the Community Manager before sending to the client.`,
      };
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

    // 6. Prepare PDF Attachments & Download URLs
    const emailAttachments: { filename: string; content: Buffer; contentType: string }[] = [];
    let primaryDownloadUrl = 'https://sspacia.com';
    const downloadLinks: { label: string; url: string; fileName: string }[] = [];

    if (isSplitInvoice) {
      for (let i = 0; i < splits.length; i++) {
        const sp = splits[i];
        const fileUrl = sp.attachedInvoice?.fileUrl || (i === 0 ? (invoice.digitallySignedPdfUrl || invoice.attachedInvoice?.fileUrl) : null);
        const fileName = sp.attachedInvoice?.fileName || `Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Part${i + 1}.pdf`;
        const label = sp.name || `Sub-Invoice #${i + 1}`;

        if (fileUrl) {
          const resolvedUrl = fileUrl.startsWith('http') ? fileUrl : `https://sspacia.com${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
          if (i === 0) {
            primaryDownloadUrl = resolvedUrl;
          }
          downloadLinks.push({ label, url: resolvedUrl, fileName });
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
      downloadLinks.push({ label: 'Tax Invoice', url: primaryDownloadUrl, fileName });
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

    const downloadText = downloadLinks.length > 1
      ? downloadLinks.map((dl) => `Download ${dl.label}: ${dl.url}`).join('\n')
      : `Download Invoice: ${primaryDownloadUrl}`;

    // 8. Plain Text Body (Anti-Spam Fallback)
    const textBody = `
Dear ${primaryName} Ji,

Please find your tax invoice for the month attached with this email.

The due date for payment is ${dueDayStr} of this month.

${downloadText}

For any clarification, please feel free to reach us anytime.

Best Regards,
${centreName}'s Community Manager

SSPACIA INDIA PVT LTD
Ahmedabad, Gujarat, India
Website: https://sspacia.com | Email: cm@sspacia.com | WhatsApp: +91 76003 93779
    `.trim();

    // 9. Premium HTML Template (100% Inline Styles for Outlook, Gmail, Apple Mail)
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #006064; padding: 24px 30px; color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: 1.5px; margin: 0 0 6px 0; text-transform: uppercase; color: #ffffff;">SSPACIA COWORKING</div>
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); color: #e0f2f1; padding: 4px 12px; font-size: 11px; font-weight: 600; border-radius: 4px; letter-spacing: 0.5px;">Approved &amp; Issued by Community Manager</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 30px; font-size: 15px; line-height: 1.6; color: #1e293b; background-color: #ffffff;">
              <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Dear ${primaryName} Ji,</div>
              <p style="margin: 0 0 14px 0; color: #334155; font-size: 14.5px; line-height: 1.5;">
                Please find your tax invoice for the month attached with this email.
              </p>
              <p style="margin: 0 0 22px 0; color: #334155; font-size: 14.5px; line-height: 1.5;">
                The due date for payment is <strong style="color: #0f172a; font-weight: 700;">${dueDayStr}</strong> of this month.
              </p>
              <!-- Download Button(s) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 26px 0; width: 100%;">
                ${downloadLinks.length > 1 ? `
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                        ${downloadLinks.map((dl) => `
                          <tr>
                            <td align="center" style="padding: 5px 0;">
                              <a href="${dl.url}" target="_blank" style="display: inline-block; background-color: #006064; color: #ffffff !important; text-decoration: none; padding: 12px 26px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border-radius: 4px; border: 1px solid #006064; min-width: 250px; text-align: center;">
                                📥 Download ${dl.label} (${dl.fileName})
                              </a>
                            </td>
                          </tr>
                        `).join('')}
                      </table>
                    </td>
                  </tr>
                ` : `
                  <tr>
                    <td align="center" style="border-radius: 4px; background-color: #006064;">
                      <a href="${primaryDownloadUrl}" target="_blank" style="display: inline-block; background-color: #006064; color: #ffffff !important; text-decoration: none; padding: 13px 28px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border-radius: 4px; border: 1px solid #006064;">
                        📥 Download Tax Invoice
                      </a>
                    </td>
                  </tr>
                `}
              </table>
              <p style="color: #64748b; font-size: 13px; margin: 0 0 24px 0;">
                For any clarification, please feel free to reach us anytime.
              </p>
              <!-- Signoff -->
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #334155;">
                Best Regards,<br>
                <strong style="color: #0f172a; font-size: 14px;">${centreName}'s Community Manager</strong>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center; font-size: 12px; color: #64748b;">
              <div style="font-weight: 800; color: #0f172a; font-size: 12px; letter-spacing: 1px; margin-bottom: 8px;">
                SSPACIA INDIA PVT LTD
              </div>
              <div style="margin: 10px 0 14px 0;">
                <a href="https://wa.me/917600393779" style="color: #006064; text-decoration: none; font-weight: 600; font-size: 11px; margin: 0 6px; text-transform: uppercase;">WhatsApp</a> &bull;
                <a href="https://www.instagram.com/sspacia?igsh=aWR3Z2F4MG0yMXRt" style="color: #006064; text-decoration: none; font-weight: 600; font-size: 11px; margin: 0 6px; text-transform: uppercase;">Instagram</a> &bull;
                <a href="https://www.linkedin.com/company/sspacia/" style="color: #006064; text-decoration: none; font-weight: 600; font-size: 11px; margin: 0 6px; text-transform: uppercase;">LinkedIn</a> &bull;
                <a href="https://www.facebook.com/sspacia" style="color: #006064; text-decoration: none; font-weight: 600; font-size: 11px; margin: 0 6px; text-transform: uppercase;">Facebook</a> &bull;
                <a href="https://www.youtube.com/@sspacia_" style="color: #006064; text-decoration: none; font-weight: 600; font-size: 11px; margin: 0 6px; text-transform: uppercase;">YouTube</a>
              </div>
              <div style="color: #94a3b8; font-size: 11.5px;">
                Ahmedabad, Gujarat, India &bull; <a href="mailto:cm@sspacia.com" style="color: #006064; text-decoration: none; font-weight: 600;">cm@sspacia.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // 10. Dispatch Email via Google Workspace SMTP
    const { hostCandidates, port, user, pass } = createSmtpTransport();
    let messageId: string | undefined;
    let lastError: any = null;

    const emailHeaders = {
      'X-Entity-Ref-ID': `INV-${invoiceRecordId}`,
    };

    // Candidate configs for Google Workspace (465 SSL, 587 STARTTLS)
    const configsToTry = [
      { host: hostCandidates[0] || 'smtp.gmail.com', port: 465, secure: true },
      { host: 'smtp.gmail.com', port: 587, secure: false },
      { host: 'smtp-relay.gmail.com', port: 587, secure: false },
    ];

    for (const cfg of configsToTry) {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        } as any);

        const info = await transporter.sendMail({
          from: `"SSPACIA Community Manager" <${user}>`,
          sender: user,
          replyTo: user,
          to: recipientEmail,
          ...(finalCcList && finalCcList.length > 0 ? { cc: finalCcList } : {}),
          subject,
          text: textBody,
          html,
          headers: emailHeaders,
          attachments: emailAttachments.map((att) => ({
            ...att,
            contentType: 'application/pdf',
            contentDisposition: 'attachment',
          })),
          envelope: {
            from: user,
            to: [recipientEmail, ...finalCcList].filter(Boolean),
          },
        });

        messageId = info.messageId;
        console.log(`[Invoice Email] ✅ Approved invoice email dispatched for ${companyName} (${billingMonth}) to ${recipientEmail} (CC: ${finalCcList.join(', ')}) via Google SMTP ${cfg.host}:${cfg.port}. Message ID: ${info.messageId}`);
        break;
      } catch (err: any) {
        console.warn(`[Invoice Email] Google SMTP attempt on ${cfg.host}:${cfg.port} with ${user} failed:`, err?.message || err);
        lastError = err;
      }
    }

    // Fallback: If cm@sspacia.com auth fails (e.g. pending Google App Password), dispatch via verified Google Transport
    if (!messageId && (process.env.MIS_SMTP_USER || 'mis.sspacia01@gmail.com')) {
      try {
        console.log('[Invoice Email] Trying verified Google App Password fallback to ensure invoice delivery...');
        const fallbackTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: (process.env.MIS_SMTP_USER || 'mis.sspacia01@gmail.com').trim(),
            pass: (process.env.MIS_SMTP_PASS || 'xgfdlhrtgdzuonld').replace(/\s+/g, ''),
          },
        });

        const fallbackInfo = await fallbackTransporter.sendMail({
          from: `"SSPACIA Community Manager" <${user}>`,
          sender: user,
          replyTo: user,
          to: recipientEmail,
          ...(finalCcList && finalCcList.length > 0 ? { cc: finalCcList } : {}),
          subject,
          text: textBody,
          html,
          headers: emailHeaders,
          attachments: emailAttachments.map((att) => ({
            ...att,
            contentType: 'application/pdf',
            contentDisposition: 'attachment',
          })),
        });

        messageId = fallbackInfo.messageId;
        console.log(`[Invoice Email] ✅ Approved invoice email delivered via Google Fallback to ${recipientEmail}. Message ID: ${fallbackInfo.messageId}`);
      } catch (fallbackErr: any) {
        console.error('[Invoice Email] Fallback dispatch also failed:', fallbackErr?.message || fallbackErr);
      }
    }

    if (messageId) {
      // Update DB record with sent timestamp and recipient info
      try {
        await (prisma as any).invoiceRecord.update({
          where: { id: invoiceRecordId },
          data: {
            clientEmailSentAt: new Date(),
            clientEmailSentTo: recipientEmail,
            clientEmailSentCc: (finalCcList || []).join(', '),
          },
        });
        // Live sync Step 4 (Website Auto Send Email Status) to INV PROCESS FMS
        syncInvoiceWorkflowEmailSent(invoiceRecordId).catch((fmsErr) => {
          console.warn('[Invoice Email] Live FMS sync email status notice:', fmsErr);
        });
      } catch (dbErr) {
        console.warn(`[Invoice Email] Could not update clientEmailSentAt on Invoice #${invoiceRecordId}:`, dbErr);
      }
    } else if (lastError) {
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
