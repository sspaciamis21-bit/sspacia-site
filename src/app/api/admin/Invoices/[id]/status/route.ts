import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceApprovalEmail } from '@/lib/invoice-email-service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceRecordId = Number(id);

    const body = await request.json();
    const { status, remarks } = body;

    const validStatuses = [
      'PENDING_CM_REVIEW',
      'SENT_TO_ACCOUNTANT',
      'INVOICE_ATTACHED',
      'APPROVED',
      'REJECTED_WITH_REMARKS',
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status provided' }, { status: 400 });
    }

    const updated = await (prisma as any).invoiceRecord.update({
      where: { id: invoiceRecordId },
      data: {
        status,
        ...(remarks !== undefined ? { remarks: remarks ? String(remarks).trim() : null } : {}),
      },
      include: {
        clientMaster: true,
        createdBy: { select: { id: true, name: true, email: true } },
        attachedInvoice: true,
      },
    });

    // ── When CM approves invoice, trigger automated Tax Invoice email with attached PDF(s) to the Client ──
    if (status === 'APPROVED') {
      sendInvoiceApprovalEmail(invoiceRecordId).then((res) => {
        if (res.success) {
          console.log(`[Invoice Status] ✅ Tax Invoice email delivered to client for Invoice #${invoiceRecordId}`);
        } else {
          console.warn(`[Invoice Status] ⚠️ Tax Invoice email notice for Invoice #${invoiceRecordId}: ${res.error}`);
        }
      }).catch((err) => {
        console.error(`[Invoice Status] ❌ Async email error on Invoice #${invoiceRecordId}:`, err);
      });


      // Automated Notification for Accountant & Super Admin
      try {
        const compName = updated.companyName || updated.clientMaster?.companyName || 'Client';
        const billMonth = updated.billingMonth || 'Current Month';
        const notifMessage = `For ${billMonth}, uploaded Tally invoice for ${compName} was approved and entry generated in Invoice Payment Receive Management. Please enter payment receive details when payment arrives.`;

        const accountantEmails = ['ssinfrazone21@gmail.com', 'admin@sspacia.com'];
        for (const targetEmail of accountantEmails) {
          await (prisma as any).userNotification.create({
            data: {
              userEmail: targetEmail,
              title: `Tally Invoice Approved: ${compName} (${billMonth})`,
              message: notifMessage,
            },
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.warn('[Invoice Status Notification Error]:', notifErr);
      }
    }


    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update invoice record status error:', error);
    return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
  }
}

