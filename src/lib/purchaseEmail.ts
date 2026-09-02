import nodemailer from 'nodemailer';

export interface SendPurchaseOrderEmailOptions {
  productName: string;
  centerName: string;
  currentStock: number;
  bufferLimit: number;
  reorderQty: number; // 3x buffer
  requestedByName?: string;
  remarks?: string | null;
}

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

  return { hostCandidates, port, user, pass };
}

export async function sendPurchaseOrderEmail(options: SendPurchaseOrderEmailOptions) {
  const {
    productName,
    centerName,
    currentStock,
    bufferLimit,
    reorderQty,
    requestedByName = 'Community Manager',
    remarks,
  } = options;

  const toEmail = 'ssinfrazone1@gmail.com';
  const ccEmails = ['praveen.agarwal1@gmail.com'];

  const subject = `🛒 [Purchase Order Request] Low Stock: ${productName} - ${centerName}`;
  const nowFormatted = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="background-color: #006064; padding: 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">SSPACIA COWORKING</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #b2dfdb; font-weight: 500;">Consumable Inventory &bull; Purchase Order Dispatch</p>
    </div>

    <!-- Alert Banner -->
    <div style="background-color: #fef2f2; border-bottom: 2px solid #f87171; padding: 14px 24px; text-align: center;">
      <span style="font-size: 13px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">
        ⚠️ Buffer Stock Limit Reached — Urgent Replenishment Required
      </span>
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">Hello Purchase Team,</p>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; color: #475569;">
        The stock level for consumable item <strong>"${productName}"</strong> has reached or dropped below its minimum configured buffer threshold at <strong>${centerName}</strong>. Please arrange for immediate procurement:
      </p>

      <!-- Purchase Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
        <tbody>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b; width: 45%;">🏢 Workspace Centre:</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a;">${centerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">📦 Item / Product:</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #006064; font-size: 14px;">${productName}</td>
          </tr>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">📉 Current Remaining Stock:</td>
            <td style="padding: 10px 14px; font-weight: 800; color: #dc2626; font-size: 14px;">${currentStock} units</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">🛡️ Configured Buffer Limit:</td>
            <td style="padding: 10px 14px; font-weight: 700; color: #475569;">${bufferLimit} units</td>
          </tr>
          <tr style="background-color: #ecfdf5; border: 2px solid #10b981;">
            <td style="padding: 12px 14px; font-weight: 700; color: #065f46; font-size: 14px;">🛒 Required Purchase Qty (3x Buffer):</td>
            <td style="padding: 12px 14px; font-weight: 900; color: #047857; font-size: 16px;">${reorderQty} units / packets</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">👤 Requested By:</td>
            <td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">${requestedByName} (Community Team)</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">⏰ Alert Timestamp:</td>
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">${nowFormatted}</td>
          </tr>
          ${remarks
      ? `
          <tr style="background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #64748b;">📝 Notes / Placement:</td>
            <td style="padding: 10px 14px; font-style: italic; color: #334155;">"${remarks}"</td>
          </tr>
          `
      : ''
    }
        </tbody>
      </table>

      <!-- Instructions Box -->
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #065f46; margin-bottom: 20px;">
        <strong>Next Step:</strong> Once procured and delivered to ${centerName}, please notify the Community Manager so they can confirm delivery in the SSPACIA portal and update live available counts.
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">
        This automated purchase requisition has been logged to the Google Sheets <em>sspacia-purchase</em> FMS tracker.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">SSPACIA Coworking Solutions Ltd.</p>
      <p style="margin: 0;">Community Team &bull; <a href="mailto:cm@sspacia.com" style="color: #006064; text-decoration: none;">cm@sspacia.com</a> &bull; Ahmedabad, Gujarat</p>
    </div>

  </div>
</body>
</html>
  `.trim();

  const textBody = `
[SSPACIA PURCHASE ORDER REQUISITION]

Centre: ${centerName}
Item: ${productName}
Current Stock: ${currentStock} units
Buffer Limit: ${bufferLimit} units
Required Purchase Qty (3x Buffer): ${reorderQty} units

Requested By: ${requestedByName}
Timestamp: ${nowFormatted}
${remarks ? `Notes: ${remarks}` : ''}

Please procure and dispatch to ${centerName}.
  `.trim();

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
        to: toEmail,
        cc: ccEmails,
        subject,
        text: textBody,
        html,
        envelope: {
          from: user,
          to: [toEmail, ...ccEmails],
        },
      });

      messageId = info.messageId;
      console.log(`[Purchase Email] Successfully sent purchase order for "${productName}" to ${toEmail} via ${host} (ID: ${messageId})`);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Purchase Email] Failed via ${host}:`, err?.message || err);
    }
  }

  if (!messageId) {
    console.error(`[Purchase Email] All SMTP hosts failed for purchase order:`, lastError?.message || lastError);
    return { success: false, error: lastError?.message || 'Failed to dispatch purchase email' };
  }

  return { success: true, messageId };
}
