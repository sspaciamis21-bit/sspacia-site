import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: {
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }[];
}

/**
 * Creates Nodemailer SMTP transport for Zoho Mail (cm@sspacia.com)
 */
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtppro.zoho.in';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || 'cm@sspacia.com').trim();
  const rawPass = (process.env.SMTP_PASS || 'VXQxVpCnBDZg').trim();
  const pass = rawPass.replace(/\s+/g, '');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  } as nodemailer.TransportOptions);

  return { transporter, sender: user };
}

/**
 * Sends an email using the configured SMTP server
 */
export async function sendEmail({ to, cc, subject, html, text, attachments }: SendEmailOptions) {
  try {
    const { transporter, sender } = getEmailTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"SSPāCIA Community & Operations" <${sender}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || '',
      html,
      attachments,
    };

    if (cc) {
      mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Email] Dispatched successfully: ${info.messageId} to ${Array.isArray(to) ? to.join(', ') : to}${cc ? ` (cc: ${Array.isArray(cc) ? cc.join(', ') : cc})` : ''}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('[Email] Failed to dispatch email:', error?.message || error);
    return { success: false, error: error?.message || 'Email delivery failed' };
  }
}
