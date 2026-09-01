import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendInvoiceApprovalEmail } from '@/lib/invoice-email-service';

export async function POST(_request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find 1 Mercado client invoice record with attached invoice
    const mercadoLocation = await (prisma as any).location.findFirst({
      where: { name: { contains: 'Mercado' } },
    });

    let inv = await (prisma as any).invoiceRecord.findFirst({
      where: {
        attachedInvoice: { isNot: null },
        createdBy: {
          assignedLocations: {
            some: {
              location: { name: { contains: 'Mercado' } },
            },
          },
        },
      },
      include: {
        attachedInvoice: true,
        clientMaster: {
          include: {
            contactPersons: true,
          },
        },
      },
    });

    // Fallback if not found by location assignment: look for any attached invoice
    if (!inv) {
      inv = await (prisma as any).invoiceRecord.findFirst({
        where: { attachedInvoice: { isNot: null } },
        include: {
          attachedInvoice: true,
          clientMaster: {
            include: {
              contactPersons: true,
            },
          },
        },
      });
    }

    if (!inv) {
      return NextResponse.json({ error: 'No invoice with attached PDF found to test.' }, { status: 404 });
    }

    const testContactName = inv.clientMaster?.contactPersons?.[0]?.name || inv.companyName || 'Tushar';

    // Dispatch ONLY to t6565154@gmail.com (no real client emails in CC)
    const result = await sendInvoiceApprovalEmail({
      invoiceRecordId: inv.id,
      customPrimaryEmail: 't6565154@gmail.com',
      customPrimaryName: testContactName,
      customCcEmails: [],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to dispatch test email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to t6565154@gmail.com for "${inv.companyName}" (${inv.billingMonth})!`,
      data: {
        companyName: inv.companyName,
        billingMonth: inv.billingMonth,
        recipient: 't6565154@gmail.com',
        messageId: result.messageId,
      },
    });
  } catch (error: any) {
    console.error('Test Mercado email error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to send test email' }, { status: 500 });
  }
}
