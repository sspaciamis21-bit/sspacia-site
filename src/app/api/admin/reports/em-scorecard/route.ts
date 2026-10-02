import { NextRequest, NextResponse } from 'next/server';
import { generateFullEmScorecard, ScorecardPeriodFilter } from '@/lib/em-scorecard-engine';
import { generateEmScorecardPdf } from '@/lib/em-pdf-generator';
import { generateEmScorecardExcel } from '@/lib/em-excel-generator';
import { sendMisReportEmail, DEFAULT_EM_RECIPIENTS } from '@/lib/em-email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow sufficient time for fetching Google Sheets & generating PDFs

/**
 * GET /api/admin/reports/em-scorecard
 * Query params:
 *   - centre: 'All Centres' | 'Mercado' | 'Agarwal Complex' | 'Premier House'
 *   - period: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom'
 *   - startDate: YYYY-MM-DD
 *   - endDate: YYYY-MM-DD
 *   - format: 'json' (default) | 'pdf' | 'excel'
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const centre = searchParams.get('centre') || 'All Centres';
    const period = (searchParams.get('period') || 'weekly') as any;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const format = searchParams.get('format') || 'json';

    const scorecard = await generateFullEmScorecard({
      centre,
      period,
      startDate,
      endDate,
    });

    const safeCentre = centre.replace(/\s+/g, '_');

    if (format === 'pdf') {
      const pdfBytes = await generateEmScorecardPdf(scorecard);
      const filename = `SSPACIA_EM_Scorecard_${safeCentre}_${scorecard.startDate}_to_${scorecard.endDate}.pdf`;

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    if (format === 'excel') {
      const excelBuffer = generateEmScorecardExcel(scorecard);
      const filename = `SSPACIA_EM_Scorecard_${safeCentre}_${scorecard.startDate}_to_${scorecard.endDate}.xlsx`;

      return new NextResponse(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: scorecard,
    });
  } catch (error: any) {
    console.error('[API /api/admin/reports/em-scorecard GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate scorecard report',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/reports/em-scorecard
 * Body:
 *   - action: 'send_email'
 *   - centre: optional
 *   - period: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom'
 *   - startDate: YYYY-MM-DD
 *   - endDate: YYYY-MM-DD
 *   - to: string[] (optional overrides)
 *   - cc: string[] (optional overrides)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'send_email';
    const period = body.period || 'weekly';
    const startDate = body.startDate || undefined;
    const endDate = body.endDate || undefined;
    const customCentre = body.centre;

    if (action !== 'send_email') {
      return NextResponse.json(
        { success: false, error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    // Exclude 'All Centres' PDF completely per management requirement. Only individual centers.
    const targetCentres = customCentre && customCentre !== 'All Centres'
      ? [customCentre]
      : ['Mercado', 'Agarwal Complex', 'Premier House'];

    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    let displayRange = '';

    for (const c of targetCentres) {
      const card = await generateFullEmScorecard({
        centre: c,
        period,
        startDate,
        endDate,
      });

      if (!displayRange) {
        displayRange = card.displayDateRange;
      }

      const pdfBytes = await generateEmScorecardPdf(card);
      const safeName = c.replace(/\s+/g, '_');
      attachments.push({
        filename: `SSPACIA_EM_Scorecard_${safeName}_${card.startDate}_to_${card.endDate}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      });
    }

    // Exact subject requested by user: Mercado | AG | PH  EM Reports period :- {displayDateRange}
    const subject = `Mercado | AG | PH  EM Reports period :- ${displayRange}`;

    // Simple, clean email body with observation notice before 10 AM
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px; font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 6px;">
        <p style="margin-top: 0;">Dear Team,</p>
        
        <p>Please find attached the Executive Meeting (EM) MIS Reports for <strong>Mercado | AG | PH</strong> for the period: <strong>${displayRange}</strong>.</p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: #1e3a8a;">
          📌 <strong>Important Notice:</strong> If any observation, please reply to this email before 10:00 AM.
        </div>

        <p style="font-size: 13px; color: #475569; margin-bottom: 8px;">
          <strong>Attached PDF Scorecards:</strong>
        </p>
        <ul style="font-size: 13px; color: #475569; padding-left: 20px; margin-top: 4px;">
          <li>Mercado CM MIS Report (PDF)</li>
          <li>Agarwal Complex (AG) CM MIS Report (PDF)</li>
          <li>Premier House (PH) CM MIS Report (PDF)</li>
        </ul>

        <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          SSPACIA Executive MIS System | Standard BMP MIS Format | Confidential<br />
          Sender: <strong>mis.sspacia01@gmail.com</strong>
        </div>
      </div>
    </body>
    </html>
    `;

    const result = await sendMisReportEmail({
      to: body.to || DEFAULT_EM_RECIPIENTS.TO,
      cc: body.cc || DEFAULT_EM_RECIPIENTS.CC,
      subject,
      html,
      attachments,
    });

    return NextResponse.json({
      success: true,
      message: 'EM Report email sent successfully from mis.sspacia01@gmail.com',
      messageId: result.messageId,
      accepted: result.accepted,
      attachmentsCount: attachments.length,
      subject,
    });
  } catch (error: any) {
    console.error('[API /api/admin/reports/em-scorecard POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to dispatch scorecard email',
      },
      { status: 500 }
    );
  }
}
