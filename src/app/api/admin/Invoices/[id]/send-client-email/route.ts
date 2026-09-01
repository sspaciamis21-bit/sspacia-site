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

    const locName =
      invoice.createdBy?.assignedLocations?.[0]?.location?.name ||
      invoice.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
      'SSPACIA Centre';

    const contacts = invoice.clientMaster?.contactPersons || [];

    const rawDueDay = invoice.paymentDueDay || invoice.clientMaster?.paymentDueDay || 7;
    const dueDayNumber = Math.min(31, Math.max(1, Number(rawDueDay) || 7));

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
        attachedPdfName: invoice.attachedInvoice?.fileName || 'Attached Invoice PDF',
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
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoiceRecordId = Number(id);

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
