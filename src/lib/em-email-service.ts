import nodemailer from 'nodemailer';

export interface EmEmailOptions {
  to?: string | string[];
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
 * MIS Email Credentials
 * Specifically configured for mis.sspacia01@gmail.com
 */
const MIS_EMAIL_USER = (process.env.MIS_SMTP_USER || 'mis.sspacia01@gmail.com').trim();
const MIS_EMAIL_PASS = (process.env.MIS_SMTP_PASS || 'xgfdlhrtgdzuonld').replace(/\s+/g, '');

export const DEFAULT_EM_RECIPIENTS = {
  TO: ['praveen@shreeshyamgp.com', 'komal@shreeshyamgp.com'],
  CC: ['ea2praveen@gmail.com', 'cm@sspacia.com'],
};

/**
 * Creates Nodemailer SMTP transport for mis.sspacia01@gmail.com
 */
export function getMisEmailTransporter() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: MIS_EMAIL_USER,
      pass: MIS_EMAIL_PASS,
    },
  });

  return { transporter, sender: MIS_EMAIL_USER };
}

/**
 * Send an EM Report Email from mis.sspacia01@gmail.com
 */
export async function sendMisReportEmail(options: EmEmailOptions) {
  const { transporter, sender } = getMisEmailTransporter();

  const toList = options.to || DEFAULT_EM_RECIPIENTS.TO;
  const ccList = options.cc || DEFAULT_EM_RECIPIENTS.CC;

  const mailOptions: any = {
    from: `"SSPACIA MIS Executive System" <${sender}>`,
    to: Array.isArray(toList) ? toList.join(', ') : toList,
    subject: options.subject,
    text: options.text || '',
    html: options.html,
    attachments: options.attachments || [],
  };

  if (ccList && (Array.isArray(ccList) ? ccList.length > 0 : String(ccList).trim())) {
    mailOptions.cc = Array.isArray(ccList) ? ccList.join(', ') : ccList;
  }

  const info = await transporter.sendMail(mailOptions);
  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

/**
 * Dispatch Consolidated Weekly EM Report with PDFs attached for all centres
 * Called by Monday 6:00 AM IST Cron job or manual trigger
 */
export async function dispatchWeeklyEmReportEmail(options?: {
  to?: string | string[];
  cc?: string | string[];
  period?: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  targetCentres?: string[];
}) {
  const { generateFullEmScorecard } = await import('./em-scorecard-engine');
  const { generateEmScorecardPdf } = await import('./em-pdf-generator');

  const period = options?.period || 'weekly';
  const rawTargetCentres = options?.targetCentres || [
    'Mercado',
    'Agarwal Complex',
    'Premier House',
  ];
  // Strictly exclude 'All Centres' PDF from email dispatch
  const targetCentres = rawTargetCentres.filter((c) => !c.toLowerCase().includes('all'));

  const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
  const centreSummaries: {
    centre: string;
    displayDateRange: string;
    workDonePct: number;
    onTimePct: number;
    planned: number;
    actual: number;
    pending: number;
  }[] = [];

  for (const c of targetCentres) {
    const card = await generateFullEmScorecard({
      centre: c,
      period,
      startDate: options?.startDate,
      endDate: options?.endDate,
    });

    const pdfBytes = await generateEmScorecardPdf(card);
    const safeName = c.replace(/\s+/g, '_');
    attachments.push({
      filename: `SSPACIA_EM_Scorecard_${safeName}_${card.startDate}_to_${card.endDate}.pdf`,
      content: Buffer.from(pdfBytes),
      contentType: 'application/pdf',
    });

    centreSummaries.push({
      centre: c,
      displayDateRange: card.displayDateRange,
      workDonePct: card.summary.overallWorkDonePct,
      onTimePct: card.summary.overallOnTimePct,
      planned: card.summary.totalPlanned,
      actual: card.summary.totalActual,
      pending: card.summary.totalPending,
    });
  }

  const primarySummary = centreSummaries[0];
  const subject = `[EM REPORT] SSPACIA Unified Operations MIS Scorecard — ${primarySummary.displayDateRange}`;

  const tableRowsHtml = centreSummaries
    .map((s) => {
      const workColor = s.workDonePct >= 0 ? '#166534' : '#991b1b';
      const workBg = s.workDonePct >= 0 ? '#f0fdf4' : '#fef2f2';
      const otColor = s.onTimePct >= 0 ? '#166534' : '#991b1b';
      const otBg = s.onTimePct >= 0 ? '#f0fdf4' : '#fef2f2';

      return `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 12px 14px; font-weight: bold; color: #1e293b;">${s.centre}</td>
        <td style="padding: 12px 14px; text-align: center; color: #475569;">${s.planned}</td>
        <td style="padding: 12px 14px; text-align: center; color: #166534; font-weight: 600;">${s.actual}</td>
        <td style="padding: 12px 14px; text-align: center; color: #b45309; font-weight: 600;">${s.pending}</td>
        <td style="padding: 12px 14px; text-align: right; background-color: ${workBg}; color: ${workColor}; font-weight: bold;">
          ${s.workDonePct >= 0 ? '+' : ''}${s.workDonePct.toFixed(2)}%
        </td>
        <td style="padding: 12px 14px; text-align: right; background-color: ${otBg}; color: ${otColor}; font-weight: bold;">
          ${s.onTimePct >= 0 ? '+' : ''}${s.onTimePct.toFixed(2)}%
        </td>
      </tr>
    `;
    })
    .join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <div style="max-width: 680px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #cbd5e1;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0c1933 0%, #1e3a5f 100%); padding: 24px 28px; color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">SSPACIA WORKSPACE</h1>
          <span style="background-color: #d4af37; color: #0c1933; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">
            Executive Meeting (EM)
          </span>
        </div>
        <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 13px;">
          Weekly Operational Compliance & Performance MIS Scorecard
        </p>
      </div>

      <!-- Period Banner -->
      <div style="background-color: #f8fafc; padding: 12px 28px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; display: flex; justify-content: space-between;">
        <span><strong>Reporting Window:</strong> ${primarySummary.displayDateRange}</span>
        <span><strong>Period Filter:</strong> ${period.toUpperCase()}</span>
      </div>

      <!-- Body Content -->
      <div style="padding: 24px 28px;">
        <p style="margin-top: 0; font-size: 14px; line-height: 1.6; color: #334155;">
          Dear Leadership Team,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Please find below the consolidated executive summary of the <strong>SSPACIA Operational MIS Scorecard</strong>. The metrics reflect live task execution across Community Management (Invoice approvals & Suspense recognitions) and Housekeeping checklist compliance.
        </p>

        <!-- Scorecard Summary Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 14px; text-align: left;">Centre</th>
              <th style="padding: 10px 14px; text-align: center;">Planned</th>
              <th style="padding: 10px 14px; text-align: center;">Actual</th>
              <th style="padding: 10px 14px; text-align: center;">Pending</th>
              <th style="padding: 10px 14px; text-align: right;">Work Done %</th>
              <th style="padding: 10px 14px; text-align: right;">On Time %</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; margin: 24px 0; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
            📌 <strong>Attached Landscape MIS Reports:</strong> Full tabular scorecards with benchmark breakdowns, KRA/KPI metrics, and pending tasks have been attached as individual PDFs for each centre.
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
          Dispatched automatically from: <strong>mis.sspacia01@gmail.com</strong><br />
          SSPACIA Process & Compliance Automated Node
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f1f5f9; padding: 14px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
        SSPACIA Coworking Spaces Pvt. Ltd. • Executive Operations & MIS Portal
      </div>
    </div>
  </body>
  </html>
  `;

  return await sendMisReportEmail({
    to: options?.to || DEFAULT_EM_RECIPIENTS.TO,
    cc: options?.cc || DEFAULT_EM_RECIPIENTS.CC,
    subject,
    html,
    attachments,
  });
}
