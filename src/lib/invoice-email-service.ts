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
    transporter: nodemailer.createTransport({
      host: hostCandidates[0],
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    } as nodemailer.TransportOptions),
    sender: user,
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
 * Format Indian Rupee currency string
 */
function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Dispatches an official Tax Invoice Email when Community Manager approves the attached invoice.
 * Handles both Single PDF invoices and Split Multiple PDF invoices with proper formatting.
 * 
 * Target Recipient: cm@sspacia.com (client CC can be enabled later).
 */
export async function sendInvoiceApprovalEmail(invoiceRecordId: number): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 1. Fetch invoice record with client details, products, and attachments
    const invoice = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceRecordId },
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            products: { orderBy: { sortOrder: 'asc' } },
          },
        },
        attachedInvoice: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedLocations: {
              select: {
                location: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: `InvoiceRecord #${invoiceRecordId} not found` };
    }

    const companyName = invoice.companyName || invoice.clientMaster?.companyName || 'Valued Client';
    const clientId = invoice.clientMaster?.clientId || `SSP-${invoice.clientMasterId}`;
    const billingMonth = invoice.billingMonth || 'Current Billing Cycle';
    const locationName = invoice.createdBy?.assignedLocations?.[0]?.location?.name || 'SSPACIA Centre';
    const totalAmount = Number(invoice.totalAmount || 0);
    const baseAmount = Number(invoice.amount || 0);
    const gstPercent = Number(invoice.gstPercent || 18);
    const gstAmount = totalAmount > baseAmount ? totalAmount - baseAmount : (baseAmount * gstPercent) / 100;
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Due upon receipt';

    // 2. Parse splits if present
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

    // 3. Prepare PDF Attachments
    const emailAttachments: { filename: string; content: Buffer; contentType: string }[] = [];

    if (isSplitInvoice) {
      // Split Invoice: Download and attach every sub-invoice PDF
      for (let i = 0; i < splits.length; i++) {
        const sp = splits[i];
        const fileUrl = sp.attachedInvoice?.fileUrl || (i === 0 ? invoice.attachedInvoice?.fileUrl : null);
        const fileName = sp.attachedInvoice?.fileName || `Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_Part${i + 1}.pdf`;

        if (fileUrl) {
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
    } else if (invoice.attachedInvoice?.fileUrl) {
      // Single Invoice: Download and attach single Tally invoice PDF
      const fileUrl = invoice.attachedInvoice.fileUrl;
      const fileName = invoice.attachedInvoice.fileName || `Tax_Invoice_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${billingMonth.replace(/\s+/g, '_')}.pdf`;
      const buffer = await fetchPdfBuffer(fileUrl);
      if (buffer) {
        emailAttachments.push({
          filename: fileName,
          content: buffer,
          contentType: 'application/pdf',
        });
      }
    }

    // 4. Generate HTML Email Template
    const subject = `📄 Tax Invoice Issued: ${companyName} — ${billingMonth} | SSPACIA Workspaces`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #006064; color: #ffffff; padding: 25px 30px; text-align: left; }
          .header h1 { margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
          .header p { margin: 0; font-size: 12px; color: #b2dfdb; letter-spacing: 0.5px; }
          .badge { display: inline-block; background: #004d40; color: #80cbc4; padding: 4px 10px; font-size: 10px; font-weight: bold; border-radius: 3px; margin-top: 10px; text-transform: uppercase; }
          .content { padding: 30px; }
          .section-title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f8fafc; }
          .info-table .label { color: #64748b; width: 40%; }
          .info-table .value { font-weight: 700; color: #0f172a; text-align: right; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 25px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .summary-row.total { border-top: 2px dashed #cbd5e1; padding-top: 12px; margin-top: 12px; font-size: 16px; font-weight: 900; color: #006064; }
          .split-box { background: #eef2f6; border-left: 4px solid #006064; padding: 12px 15px; margin-bottom: 12px; font-size: 12px; }
          .attachment-badge { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 15px; border-radius: 4px; font-size: 12px; margin-bottom: 25px; display: flex; align-items: center; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SSPACIA COWORKING &amp; ENTERPRISE</h1>
            <p>Official Billing &amp; Invoicing Division</p>
            <div class="badge">Approved &amp; Issued by Community Management</div>
          </div>
          
          <div class="content">
            <p style="font-size: 14px; line-height: 1.5; margin-top: 0; margin-bottom: 20px;">
              Dear <strong>${companyName}</strong>,
              <br/><br/>
              Please find your verified tax invoice for <strong>${billingMonth}</strong> attached with this email. Community Management has reviewed and approved the billing terms.
            </p>

            <div class="section-title">Invoice &amp; Tenancy Specifications</div>
            <table class="info-table">
              <tr>
                <td class="label">Company Name:</td>
                <td class="value">${companyName}</td>
              </tr>
              <tr>
                <td class="label">Client UID:</td>
                <td class="value">${clientId}</td>
              </tr>
              <tr>
                <td class="label">Centre Location:</td>
                <td class="value">${locationName}</td>
              </tr>
              <tr>
                <td class="label">Space / Cabin Allotted:</td>
                <td class="value">${invoice.cabinName || 'Enterprise Workspace'}</td>
              </tr>
              <tr>
                <td class="label">Total Seating Capacity:</td>
                <td class="value">${invoice.noOfSeats || 0} Seats</td>
              </tr>
              <tr>
                <td class="label">Billing Cycle:</td>
                <td class="value">${billingMonth}</td>
              </tr>
              <tr>
                <td class="label">Payment Due Date:</td>
                <td class="value" style="color: #b91c1c;">${dueDateStr}</td>
              </tr>
            </table>

            ${
              isSplitInvoice
                ? `
                <div class="section-title">Split Invoices Itemization (${splits.length} Sub-Invoices)</div>
                ${splits
                  .map(
                    (sp, idx) => `
                  <div class="split-box">
                    <strong style="color: #0f172a; font-size: 13px;">${sp.name || `Sub-Invoice ${idx + 1}`}</strong><br/>
                    <span>Base Amount: ${formatCurrency(sp.amount)} &bull; GST (18%): ${formatCurrency(sp.gstAmount || (sp.amount * 0.18))}</span><br/>
                    <strong style="color: #006064;">Total Payable: ${formatCurrency(sp.totalAmount)}</strong>
                  </div>
                `
                  )
                  .join('')}
              `
                : ''
            }

            <div class="summary-card">
              <div class="section-title" style="border: none; margin-bottom: 8px;">Financial Breakdown</div>
              <div class="summary-row">
                <span style="color: #64748b;">Subtotal (Base Amount):</span>
                <span style="font-weight: 700;">${formatCurrency(baseAmount)}</span>
              </div>
              <div class="summary-row">
                <span style="color: #64748b;">GST (18% IGST / CGST+SGST):</span>
                <span style="font-weight: 700;">${formatCurrency(gstAmount)}</span>
              </div>
              <div class="summary-row total">
                <span>Net Total Payable:</span>
                <span>${formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div class="attachment-badge">
              <span>📎 <strong>Attached Documents (${emailAttachments.length}):</strong> ${
                emailAttachments.map((a) => a.filename).join(', ') || 'Official Tax Invoice PDF'
              }</span>
            </div>
          </div>

          <div class="footer">
            SSPACIA Coworking &amp; Managed Offices &bull; Automated Billing System
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Send via Nodemailer SMTP to cm@sspacia.com and CC t6565154@gmail.com
    const configsToTry = [
      { host: process.env.SMTP_HOST || 'smtppro.zoho.in', port: Number(process.env.SMTP_PORT || 465) },
      { host: 'smtp.zoho.in', port: 465 },
      { host: 'smtppro.zoho.com', port: 465 },
      { host: 'smtp.zoho.com', port: 465 },
      { host: 'smtp.zoho.in', port: 587 },
    ];

    const user = (process.env.SMTP_USER || 'cm@sspacia.com').trim();
    const rawPass = (process.env.SMTP_PASS || 'VXQxVpCnBDZg').trim();
    const pass = rawPass.replace(/\s+/g, '');
    const recipient = 'cm@sspacia.com';
    const ccRecipient = 't6565154@gmail.com';

    let lastError: any = null;
    let messageId: string | undefined;

    for (const cfg of configsToTry) {
      try {
        const isSecure = cfg.port === 465;
        const transporter = nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: isSecure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        } as nodemailer.TransportOptions);

        const info = await transporter.sendMail({
          from: `"SSPACIA Community & Accounts" <${user}>`,
          to: recipient,
          cc: ccRecipient,
          subject,
          html,
          attachments: emailAttachments,
        });

        messageId = info.messageId;
        console.log(`[Invoice Email] ✅ Approved invoice email dispatched for ${companyName} (${billingMonth}) to ${recipient} (CC: ${ccRecipient}) via ${cfg.host}:${cfg.port}. Message ID: ${info.messageId}`);
        break;
      } catch (err: any) {
        console.warn(`[Invoice Email] SMTP attempt on ${cfg.host}:${cfg.port} failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (!messageId && lastError) {
      throw lastError;
    }

    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    console.error(`[Invoice Email] ❌ Failed to dispatch approval email for invoice #${invoiceRecordId}:`, error?.message || error);
    return {
      success: false,
      error: error?.message || 'Failed to dispatch invoice approval email',
    };
  }
}
