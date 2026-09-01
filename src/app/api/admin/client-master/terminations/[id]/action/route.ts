import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email-automation';
import { generateClosureDocumentHtml } from '@/lib/termination-closure-generator';
import { getTerminationById, updateTerminationFields } from '@/lib/termination-db';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    const roleName = (user?.role?.name || '').toLowerCase();
    const tokenRole = (payload?.role as string || '').toLowerCase();
    const isSuperAdmin =
      roleName === 'admin' ||
      roleName === 'super_admin' ||
      roleName === 'super admin' ||
      tokenRole === 'admin' ||
      tokenRole === 'super_admin' ||
      tokenRole === 'super-admin';
    const isAccountant =
      roleName === 'accounts' ||
      roleName === 'accountant' ||
      tokenRole === 'accounts' ||
      tokenRole === 'accountant';

    const { id } = await params;
    const termId = parseInt(id, 10);
    const body = await req.json();
    const { action, remarks, signedFileUrl, signedFileName, paymentMode, utrNumber, utrDate, utrFileUrl, clientEmail } = body;

    const termination = await getTerminationById(termId);

    if (!termination) {
      return NextResponse.json({ error: 'Termination record not found' }, { status: 404 });
    }

    const client = termination.clientMaster;

    // ─────────────────────────────────────────────────────────────
    // ACTION 1: SUPER ADMIN 1ST APPROVAL (My Approval 1)
    // ─────────────────────────────────────────────────────────────
    if (action === 'sa_approval_1') {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Only Super Admin can give initial approval' }, { status: 403 });
      }

      const updated = await updateTerminationFields(termId, {
        status: 'SA_APPROVED_1',
        saApproval1At: new Date(),
        saApproval1ById: userId,
        saApproval1Remarks: remarks || 'Approved by Super Admin. Proceed with Service Closure form.',
      });

      // Update ClientMaster status to reflect live stage
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: { clientStatus: 'Termination: SA 1st Approved' },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        message: 'Super Admin 1st Approval granted. Community Manager can now generate & dispatch the Closure Form.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 2: GENERATE & EMAIL CLOSURE FORM TO CLIENT
    // ─────────────────────────────────────────────────────────────
    if (action === 'send_closure_email') {
      const recipientEmail = clientEmail || client.contactPersons?.[0]?.email || '';

      // Build Closure Doc Data
      const closureHtml = generateClosureDocumentHtml({
        companyName: client.companyName,
        clientId: client.clientId || `SSPACIA/CM/${client.id}`,
        locationName: client.createdBy?.name?.includes('mercado')
          ? 'Mercado (CG Road)'
          : client.createdBy?.name?.includes('premier')
          ? 'Premier House (SG Highway)'
          : 'Agarwal Complex (CG Road)',
        cabinName: client.cabinName || 'Dedicated Cabin',
        noOfSeats: client.noOfSeats || 1,
        agreementStartDate: termination.agreementStartDate
          ? new Date(termination.agreementStartDate).toLocaleDateString('en-GB')
          : 'N/A',
        agreementEndDate: termination.agreementEndDate
          ? new Date(termination.agreementEndDate).toLocaleDateString('en-GB')
          : 'N/A',
        lockinEndDate: termination.lockinEndDate
          ? new Date(termination.lockinEndDate).toLocaleDateString('en-GB')
          : 'N/A',
        noticeReceivedDate: termination.noticeReceivedDate
          ? new Date(termination.noticeReceivedDate).toLocaleDateString('en-GB')
          : 'N/A',
        noticeApplicableEndDate: termination.noticeApplicableEndDate
          ? new Date(termination.noticeApplicableEndDate).toLocaleDateString('en-GB')
          : 'N/A',
        sorAmountHeld: Number(termination.sorAmountHeld || 0),
        duesHeld: Number(termination.duesHeld || 0),
        tdsPending: Number(termination.tdsPending || 0),
        sdrRefundAmount: Number(termination.sdrRefundAmount || 0),
        isSdrRefundApplicable: Boolean(termination.isSdrRefundApplicable),
        referenceNo: `SSPACIA-NOC-${client.id}-${new Date().getFullYear()}`,
        generatedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      });

      // Send Email to Client if recipient email exists
      if (recipientEmail) {
        try {
          await sendEmail({
            to: recipientEmail,
            subject: `Official Service Closure & NOC - ${client.companyName} | SSPACIA`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0;">
                <div style="background-color: #006064; color: white; padding: 15px; text-align: center;">
                  <h2 style="margin: 0;">SSPACIA COWORKING SPACES</h2>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">Service Closure & Exit Handover</p>
                </div>
                <div style="padding: 20px; font-size: 14px; color: #333; line-height: 1.6;">
                  <p>Dear <strong>${client.companyName} Team</strong>,</p>
                  <p>This is regarding the formal termination and exit clearance for your workspace at SSPACIA.</p>
                  <p>Management has reviewed your account and prepared the <strong>Service Closure & No-Objection Certificate (NOC)</strong>.</p>
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; margin: 15px 0;">
                    <p style="margin: 4px 0;"><strong>Security Deposit (SOR):</strong> ₹${Number(termination.sorAmountHeld || 0).toLocaleString('en-IN')}</p>
                    <p style="margin: 4px 0;"><strong>Pending Dues:</strong> ₹${Number(termination.duesHeld || 0).toLocaleString('en-IN')}</p>
                    <p style="margin: 4px 0; color: #006064; font-weight: bold;"><strong>Net SDR Refund Applicable:</strong> ₹${Number(termination.sdrRefundAmount || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <p>Please review and execute the attached Service Closure document and return a signed copy to your Community Manager for final settlement disbursement.</p>
                  <br/>
                  <p>Warm regards,<br/><strong>SSPACIA Community & Operations Team</strong></p>
                </div>
              </div>
            `,
          });
        } catch (mailErr) {
          console.warn('[Closure Mail Dispatch Error]:', mailErr);
        }
      }

      const updated = await updateTerminationFields(termId, {
        status: 'CLOSURE_FORM_SENT',
        closureFormSentAt: new Date(),
        closureFormSentToEmail: recipientEmail,
        closureFormGeneratedAt: new Date(),
      });

      // Update ClientMaster status to reflect live stage
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: { clientStatus: 'Termination: Closure Form Sent' },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        closureHtml,
        message: recipientEmail
          ? `Service Closure Form dispatched successfully to ${recipientEmail}.`
          : 'Service Closure Form generated successfully. Awaiting signed upload from client.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 3: UPLOAD SIGNED CLOSURE FORM (Received from Client)
    // ─────────────────────────────────────────────────────────────
    if (action === 'upload_signed_closure') {
      if (!signedFileUrl) {
        return NextResponse.json({ error: 'Signed closure PDF file URL is required' }, { status: 400 });
      }

      const updated = await updateTerminationFields(termId, {
        status: 'SIGNED_FORM_UPLOADED',
        signedClosurePdfUrl: signedFileUrl,
        signedClosurePdfName: signedFileName || 'Signed_Closure_Form.pdf',
        signedClosureUploadedAt: new Date(),
        signedClosureUploadedById: userId,
      });

      // Update ClientMaster status to reflect live stage
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: { clientStatus: 'Termination: Signed NOC Uploaded' },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        message: 'Signed Closure Form uploaded successfully. Awaiting Super Admin final approval.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 4: SUPER ADMIN 2ND APPROVAL (Final Sign-off)
    // ─────────────────────────────────────────────────────────────
    if (action === 'sa_approval_2') {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Only Super Admin can give final approval' }, { status: 403 });
      }

      const updated = await updateTerminationFields(termId, {
        status: 'IN_ACCOUNTS_QUEUE',
        saApproval2At: new Date(),
        saApproval2ById: userId,
        saApproval2Remarks: remarks || 'Final approval granted by Super Admin. Passed to Accounts for refund settlement.',
        sentToAccountsAt: new Date(),
      });

      // Update ClientMaster status to reflect live stage
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: { clientStatus: 'Termination: In Accounts Queue' },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        message: 'Super Admin Final Approval granted! File forwarded to Accountant queue for refund disbursement.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 5: ACCOUNTS SETTLEMENT & REFUND PAYMENT
    // ─────────────────────────────────────────────────────────────
    if (action === 'accounts_settlement') {
      if (!isSuperAdmin && !isAccountant) {
        return NextResponse.json({ error: 'Only Super Admin or Accountant can record settlement payment' }, { status: 403 });
      }

      const updated = await updateTerminationFields(termId, {
        status: 'COMPLETED_TERMINATED',
        refundPaymentMode: paymentMode || 'Bank Transfer',
        refundUtrNumber: utrNumber || 'N/A',
        refundUtrDate: utrDate ? new Date(utrDate) : new Date(),
        refundUtrFileUrl: utrFileUrl || null,
        completedAt: new Date(),
        accountsProcessedAt: new Date(),
        accountsProcessedById: userId,
      });

      // Finalize Client Status in ClientMaster
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: {
          clientStatus: 'Terminated',
        },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        message: 'Account settlement completed! Client has been officially marked Terminated.',
      });
    }

    // ─────────────────────────────────────────────────────────────
    // ACTION 6: REJECT TERMINATION (Super Admin Rejection)
    // ─────────────────────────────────────────────────────────────
    if (action === 'reject') {
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Only Super Admin can reject termination' }, { status: 403 });
      }

      const updated = await updateTerminationFields(termId, {
        status: 'REJECTED',
        remarks: remarks || 'Termination request rejected by Super Admin.',
      });

      // Restore client status to Active
      await prisma.clientMaster.update({
        where: { id: client.id },
        data: {
          clientStatus: 'Active',
        },
      });

      return NextResponse.json({
        success: true,
        termination: updated,
        message: 'Termination request rejected. Client status restored to Active.',
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Termination Action Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process termination action' },
      { status: 500 }
    );
  }
}
