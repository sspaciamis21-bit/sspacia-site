import nodemailer from 'nodemailer';

export interface SendPasswordOtpEmailOptions {
  toEmail: string;
  recipientName?: string;
  otp: string;
  purpose: 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'REGISTRATION';
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

/**
 * Dispatches a simple, clean, and high-deliverability OTP email.
 * Uses exact authenticated Zoho identity to achieve 100% SPF/DKIM alignment.
 */
export async function sendPasswordOtpEmail(options: SendPasswordOtpEmailOptions) {
  const { toEmail, recipientName = 'User', otp, purpose } = options;

  let subject = `SSPACIA Verification Code: ${otp}`;
  let purposeDescription = 'complete your verification';

  if (purpose === 'REGISTRATION') {
    subject = `SSPACIA Registration Code: ${otp}`;
    purposeDescription = 'complete your account registration';
  } else if (purpose === 'FORGOT_PASSWORD') {
    subject = `SSPACIA Password Reset Code: ${otp}`;
    purposeDescription = 'reset your account password';
  } else if (purpose === 'RESET_PASSWORD') {
    subject = `SSPACIA Password Update Code: ${otp}`;
    purposeDescription = 'update your account password';
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
    
    <!-- Top Header -->
    <div style="background-color: #006064; padding: 20px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">SSPACIA COWORKING</h1>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px 24px 24px;">
      <p style="font-size: 14px; margin: 0 0 14px 0; color: #0f172a; font-weight: 600;">Hello ${recipientName},</p>
      <p style="font-size: 13px; line-height: 1.5; margin: 0 0 20px 0; color: #475569;">
        Please use the following verification code to ${purposeDescription}:
      </p>

      <!-- OTP Card Box -->
      <div style="background-color: #f0fdfa; border: 2px solid #006064; border-radius: 4px; padding: 18px 20px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: bold; color: #006064; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase;">
          YOUR ONE-TIME OTP
        </div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #006064; font-family: 'Courier New', Courier, monospace;">
          ${otp}
        </div>
      </div>

      <!-- Validity Notice -->
      <p style="font-size: 12px; line-height: 1.4; color: #64748b; margin: 0 0 12px 0;">
        This OTP is valid for <strong>4 minutes</strong>. Please do not share this code with anyone.
      </p>
      
      <p style="font-size: 11px; line-height: 1.4; color: #94a3b8; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        If you did not request this verification code, please ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      Ahmedabad, Gujarat, India &bull; <a href="mailto:cm@sspacia.com" style="color: #006064; text-decoration: none;">cm@sspacia.com</a>
    </div>

  </div>
</body>
</html>
  `.trim();

  const textBody = `
SSPACIA COWORKING

Hello ${recipientName},

Please use the following verification code to ${purposeDescription}:

YOUR ONE-TIME OTP: ${otp}

This OTP is valid for 4 minutes.

Ahmedabad, Gujarat, India • cm@sspacia.com
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
        subject,
        text: textBody,
        html,
        envelope: {
          from: user,
          to: [toEmail],
        },
      });

      messageId = info.messageId;
      console.log(`[OTP Email] ✅ Successfully sent OTP to ${toEmail} via ${host}:${port} (Message ID: ${messageId})`);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[OTP Email] Failed via ${host}:`, err?.message || err);
    }
  }

  if (!messageId) {
    console.error(`[OTP Email] All SMTP hosts failed for OTP dispatch:`, lastError?.message || lastError);
    return { success: false, error: lastError?.message || 'Failed to dispatch verification email' };
  }

  return { success: true, messageId };
}


