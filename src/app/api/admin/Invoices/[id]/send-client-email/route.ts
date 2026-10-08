import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendInvoiceApprovalEmail } from '@/lib/invoice-email-service';

/**
 * GET /api/admin/Invoices/[id]/send-client-email
 * Returns invoice details, all contact persons for selecting primary, and email preview
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceRecordId = Number(id);

    const invoice = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceRecordId },
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            createdBy: {
              select: {
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
            assignedLocations: {
              select: { location: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Invoice must be reviewed and approved by Community Manager before sending to client' },
        { status: 400 }
      );
    }

    const locName =
      invoice.createdBy?.assignedLocations?.[0]?.location?.name ||
      invoice.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
      'SSPACIA Centre';

    const contacts = invoice.clientMaster?.contactPersons || [];

    const rawDueDay = invoice.paymentDueDay || invoice.clientMaster?.paymentDueDay || 7;
    const dueDayNumber = Math.min(31, Math.max(1, Number(rawDueDay) || 7));

    let splits: any[] = [];
    if (invoice.splitsJson) {
      try {
        const parsed = typeof invoice.splitsJson === 'string' ? JSON.parse(invoice.splitsJson) : invoice.splitsJson;
        if (Array.isArray(parsed) && parsed.length > 1) {
          splits = parsed;
        }
      } catch (err) {
        console.warn(`[Invoice Email Preview] Error parsing splitsJson for #${invoiceRecordId}:`, err);
      }
    }

    const isSplitInvoice = splits.length > 1;
    const splitPdfs: { name: string; fileName: string; fileUrl?: string; totalAmount?: number }[] = [];

    if (isSplitInvoice) {
      splits.forEach((sp: any, idx: number) => {
        const fileUrl = sp.attachedInvoice?.fileUrl || (idx === 0 ? (invoice.digitallySignedPdfUrl || invoice.attachedInvoice?.fileUrl) : null);
        const fileName = sp.attachedInvoice?.fileName || (idx === 0 && invoice.attachedInvoice?.fileName ? invoice.attachedInvoice.fileName : `Invoice_${(invoice.companyName || 'Part').replace(/[^a-zA-Z0-9]/g, '_')}_Part${idx + 1}.pdf`);
        splitPdfs.push({
          name: sp.name || `Sub-Invoice #${idx + 1}`,
          fileName: fileName,
          fileUrl: fileUrl,
          totalAmount: sp.totalAmount,
        });
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invoice.id,
        companyName: invoice.companyName || invoice.clientMaster?.companyName,
        billingMonth: invoice.billingMonth,
        centreName: locName,
        dueDay: dueDayNumber,
        contactPersons: contacts,
        hasPdfAttached: !!invoice.attachedInvoice?.fileUrl || !!invoice.splitsJson,
        attachedPdfName: isSplitInvoice && splitPdfs.length > 0
          ? splitPdfs.map((s) => s.fileName).join(', ')
          : (invoice.attachedInvoice?.fileName || 'Attached Invoice PDF'),
        isSplitInvoice,
        splitPdfs,
      },
    });
  } catch (error: any) {
    console.error('Fetch invoice email preview error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch email preview' }, { status: 500 });
  }
}

/**
 * POST /api/admin/Invoices/[id]/send-client-email
 * Sends the tax invoice email to the designated primary person with CC to others + praveen@sspacia.com
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('auth-token')?.value ||
      cookieStore.get('token')?.value ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 401 });
    }

    const { id } = await params;
    const invoiceRecordId = Number(id);

    const existingInvoice = await (prisma as any).invoiceRecord.findUnique({
      where: { id: invoiceRecordId },
      select: { id: true, status: true },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existingInvoice.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Invoice must be reviewed and approved by Community Manager before sending to client' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { primaryContactPersonId, customPrimaryEmail, customPrimaryName, customCcEmails } = body;

    const result = await sendInvoiceApprovalEmail({
      invoiceRecordId,
      primaryContactPersonId: primaryContactPersonId ? Number(primaryContactPersonId) : undefined,
      customPrimaryEmail,
      customPrimaryName,
      customCcEmails,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to dispatch email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Tax invoice email sent successfully to ${result.recipient}! (CC: ${(result.cc || []).join(', ')})`,
      data: result,
    });
  } catch (error: any) {
    console.error('Send client invoice email error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to dispatch email' }, { status: 500 });
  }
}
