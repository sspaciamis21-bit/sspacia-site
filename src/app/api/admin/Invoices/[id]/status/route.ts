import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceApprovalEmail } from '@/lib/invoice-email-service';
import { syncLiveInvoicePlanned } from '@/lib/accountsFmsSync';
import {
  syncInvoiceWorkflowSentToAccountant,
  syncInvoiceWorkflowApprovedClient,
  syncInvoiceWorkflowPdfAttached,
} from '@/lib/invoiceWorkflowFmsSync';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceRecordId = Number(id);

    const body = await request.json();
    const { status, remarks, billedTo, isDigitalSignRequired, totalAmount, amount } = body;

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
        ...(billedTo !== undefined ? { billedTo: String(billedTo).trim() } : {}),
        ...(isDigitalSignRequired !== undefined ? { isDigitalSignRequired: Boolean(isDigitalSignRequired) } : {}),
        ...(totalAmount !== undefined && totalAmount !== null ? { totalAmount: String(totalAmount) } : {}),
        ...(amount !== undefined && amount !== null ? { amount: String(amount), ratePerAgreement: String(amount) } : {}),
      },
      include: {
        clientMaster: true,
        createdBy: { select: { id: true, name: true, email: true } },
        attachedInvoice: true,
      },
    });

    let emailDispatched = false;
    let emailRecipient: string | null = null;
    let emailError: string | null = null;

    // ── When CM approves invoice, trigger automated Tax Invoice email with attached PDF(s) to the Client ──
    if (status === 'APPROVED') {
      try {
        const mailRes = await sendInvoiceApprovalEmail(invoiceRecordId);
        if (mailRes.success) {
          emailDispatched = true;
          emailRecipient = mailRes.recipient || null;
          console.log(`[Invoice Status] ✅ Tax Invoice email delivered to client for Invoice #${invoiceRecordId} (${mailRes.recipient})`);
        } else {
          emailError = mailRes.error || 'Failed to dispatch email';
          console.warn(`[Invoice Status] ⚠️ Tax Invoice email notice for Invoice #${invoiceRecordId}: ${mailRes.error}`);
        }
      } catch (err: any) {
        emailError = err?.message || 'Error dispatching email';
        console.error(`[Invoice Status] ❌ Async email error on Invoice #${invoiceRecordId}:`, err);
      }

      // ── Synchronize to Google Sheets 'Accounts' Tab (Live Planned) ──
      syncLiveInvoicePlanned(invoiceRecordId).catch((fmsErr) => {
        console.warn('[Invoice Status] Accounts FMS Sync notice:', fmsErr);
      });

      // ── Synchronize Step 4 to Invoice Workflow FMS (CM Approves & Sends to Client) ──
      syncInvoiceWorkflowApprovedClient(invoiceRecordId).catch((fmsErr) => {
        console.warn('[Invoice Status] Invoice Workflow FMS Approved notice:', fmsErr);
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
    } else if (status === 'SENT_TO_ACCOUNTANT') {
      // ── Synchronize Step 2 & 3 to Invoice Workflow FMS (CM Sends to Accountant) ──
      syncInvoiceWorkflowSentToAccountant(invoiceRecordId).catch((fmsErr) => {
        console.warn('[Invoice Status] Invoice Workflow FMS Sent to Accountant notice:', fmsErr);
      });
    } else if (status === 'INVOICE_ATTACHED') {
      // ── Synchronize Step 3 & 4 to Invoice Workflow FMS (Accountant Attaches PDF) ──
      syncInvoiceWorkflowPdfAttached(invoiceRecordId).catch((fmsErr) => {
        console.warn('[Invoice Status] Invoice Workflow FMS PDF Attached notice:', fmsErr);
      });
    }


    return NextResponse.json({
      success: true,
      data: updated,
      emailDispatched,
      emailRecipient,
      emailError,
    });
  } catch (error) {
    console.error('Update invoice record status error:', error);
    return NextResponse.json({ error: 'Failed to update invoice status' }, { status: 500 });
  }
}

