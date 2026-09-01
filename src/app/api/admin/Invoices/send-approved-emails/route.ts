import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendInvoiceApprovalEmail } from '@/lib/invoice-email-service';

export const dynamic = 'force-dynamic';

/**
 * Dispatches email notifications for existing APPROVED invoices (e.g. 31st Aug / September 2026 entries)
 * with attached Tally PDF(s).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const role = ((payload?.role as string) || '').toUpperCase();

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPER-ADMIN' && role !== 'COMMUNITY_MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const billingMonth = (body.billingMonth || 'September 2026').trim();
    const specificInvoiceId = body.invoiceId ? Number(body.invoiceId) : null;

    const where: any = {
      status: 'APPROVED',
    };

    if (specificInvoiceId) {
      where.id = specificInvoiceId;
    } else if (billingMonth && billingMonth !== 'ALL') {
      const isSep = billingMonth.toUpperCase().includes('SEP');
      if (isSep) {
        where.OR = [
          { billingMonth: { contains: 'SEP' } },
          { billingMonth: { contains: 'September' } },
          { billingMonth: { contains: 'sep' } },
        ];
      } else {
        where.billingMonth = { contains: billingMonth };
      }
    }

    // Find matching approved invoices
    const approvedInvoices = await (prisma as any).invoiceRecord.findMany({
      where,
      include: {
        attachedInvoice: true,
      },
      orderBy: { id: 'asc' },
    });

    if (approvedInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No approved invoices found for ${billingMonth}`,
        count: 0,
        dispatched: [],
      });
    }

    const results: any[] = [];

    for (const inv of approvedInvoices) {
      const res = await sendInvoiceApprovalEmail(inv.id);
      results.push({
        invoiceId: inv.id,
        companyName: inv.companyName,
        billingMonth: inv.billingMonth,
        success: res.success,
        messageId: res.messageId || null,
        error: res.error || null,
      });
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Dispatched ${successCount} of ${results.length} approved invoice email(s) for ${billingMonth} to cm@sspacia.com.`,
      count: successCount,
      total: results.length,
      details: results,
    });
  } catch (error: any) {
    console.error('Send approved invoice emails error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch approved invoice emails' },
      { status: 500 }
    );
  }
}
