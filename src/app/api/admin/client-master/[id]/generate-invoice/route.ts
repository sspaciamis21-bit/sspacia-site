import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { syncInvoiceWorkflowArrival } from '@/lib/invoiceWorkflowFmsSync';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientMasterId = Number(id);

    if (!clientMasterId || isNaN(clientMasterId)) {
      return NextResponse.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId = 1;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
      }
    }

    const client = await (prisma as any).clientMaster.findUnique({
      where: { id: clientMasterId },
      include: {
        products: { orderBy: { sortOrder: 'asc' } },
        contactPersons: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found in Client Master' }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // body may be empty if triggered without body
    }

    const {
      productId,
      sessionDate: bodyDate,
      startTime: bodyStart,
      endTime: bodyEnd,
      cabinName: bodyCabin,
      amount: bodyAmount,
      gstPercent: bodyGst,
      totalAmount: bodyTotal,
      bookingId: bodyBookingId,
      brokerName: bodyBrokerName,
      brokerCommissionPercent: bodyCommissionPct,
      brokerCommissionAmount: bodyCommissionAmt,
      billedTo: bodyBilledTo,
      hasExtendedHours,
      extendedStartTime,
      extendedEndTime,
      extendedAmount,
      extendedGstPercent,
      extendedTotalAmount,
      extendedClientName,
    } = body;

    let targetProduct: any = null;
    if (productId) {
      targetProduct = client.products.find((p: any) => p.id === Number(productId));
    } else if (client.products.length > 0) {
      targetProduct = client.products[0];
    }

    const cabinName = bodyCabin || targetProduct?.cabinName || client.cabinName || 'Meeting Room';
    const rawDate = bodyDate || targetProduct?.sessionDate || targetProduct?.agreementStartDate || new Date();
    const sessionDateObj = new Date(rawDate);
    const isValidDate = !isNaN(sessionDateObj.getTime());
    const validSessionDate = isValidDate ? sessionDateObj : new Date();

    const startTime = bodyStart || targetProduct?.startTime || '';
    const endTime = bodyEnd || targetProduct?.endTime || '';

    const amount = bodyAmount !== undefined && bodyAmount !== null && bodyAmount !== ''
      ? Number(bodyAmount)
      : Number(targetProduct?.amount ?? client.amount ?? 0);

    const gstPercent = bodyGst !== undefined && bodyGst !== null && bodyGst !== ''
      ? Number(bodyGst)
      : Number(targetProduct?.gstPercent ?? client.gstPercent ?? 18);

    const totalAmount = bodyTotal !== undefined && bodyTotal !== null && bodyTotal !== ''
      ? Number(bodyTotal)
      : Number(targetProduct?.totalAmount ?? client.totalAmount ?? Math.round(amount * (1 + gstPercent / 100)));

    const dateStr = validSessionDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const timeRangeStr = startTime && endTime ? ` (${startTime} - ${endTime})` : (startTime ? ` (${startTime})` : '');
    const cabinSummary = `${cabinName} • ${dateStr}${timeRangeStr}`;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const billingMonth = `${monthNames[validSessionDate.getMonth()]} ${validSessionDate.getFullYear()}`;

    const items = [
      {
        cabinName,
        sessionDate: validSessionDate.toISOString().split('T')[0],
        startTime: startTime || null,
        endTime: endTime || null,
        amount,
        gstPercent,
        totalAmount,
        noOfSeats: 1,
      },
    ];

    const resolvedBookingId = bodyBookingId || client.bookingId || null;
    const resolvedBrokerName = bodyBrokerName || client.brokerName || null;
    const resolvedCommPct = bodyCommissionPct !== undefined && bodyCommissionPct !== null && bodyCommissionPct !== ''
      ? Number(bodyCommissionPct)
      : client.brokerCommissionPercent;
    const resolvedCommAmt = bodyCommissionAmt !== undefined && bodyCommissionAmt !== null && bodyCommissionAmt !== ''
      ? Number(bodyCommissionAmt)
      : (client.brokerCommissionAmount || (resolvedCommPct ? (amount * resolvedCommPct) / 100 : null));
    const resolvedBilledTo = bodyBilledTo || (client.hasBrokerCommission ? 'BROKER' : (client.invoiceToBeRaised || 'CLIENT'));

    const newInvoice = await (prisma as any).invoiceRecord.create({
      data: {
        clientMasterId: client.id,
        srNo: client.srNo,
        companyName: client.companyName,
        cabinName: cabinSummary,
        noOfSeats: 1,
        ratePerAgreement: amount,
        amount,
        gstPercent,
        totalAmount,
        paymentDuration: 'ONE_TIME',
        paymentDueDay: validSessionDate.getDate(),
        dueDate: validSessionDate,
        productGroupKey: 'ONE_TIME_SESSION',
        itemsJson: JSON.stringify(items),
        gstNo: client.gstNo || null,
        billingMonth,
        bookingId: resolvedBookingId,
        brokerName: resolvedBrokerName,
        brokerCommissionPercent: resolvedCommPct,
        brokerCommissionAmount: resolvedCommAmt,
        billedTo: resolvedBilledTo,
        isExtendedHours: false,
        sendType: 'MANUAL',
        sentAt: new Date(),
        status: 'PENDING_CM_REVIEW',
        createdById: currentUserId,
      },
    });

    syncInvoiceWorkflowArrival(newInvoice.id).catch((fmsErr) => {
      console.warn('[Generate Invoice] Invoice Workflow FMS Arrival notice:', fmsErr);
    });

    let extendedInvoice: any = null;
    if (hasExtendedHours && extendedAmount) {
      const extAmt = Number(extendedAmount) || 0;
      const extGst = extendedGstPercent !== undefined && extendedGstPercent !== null && extendedGstPercent !== ''
        ? Number(extendedGstPercent)
        : 18;
      const extTot = extendedTotalAmount !== undefined && extendedTotalAmount !== null && extendedTotalAmount !== ''
        ? Number(extendedTotalAmount)
        : Math.round(extAmt * (1 + extGst / 100));

      const extTimeStr = extendedStartTime && extendedEndTime ? ` (${extendedStartTime} - ${extendedEndTime})` : (extendedStartTime ? ` (${extendedStartTime})` : '');
      const extSummary = `${cabinName} • ⚡ Extended Hours (${dateStr}${extTimeStr})`;

      const extItems = [
        {
          cabinName: `${cabinName} (Extended)`,
          sessionDate: validSessionDate.toISOString().split('T')[0],
          startTime: extendedStartTime || null,
          endTime: extendedEndTime || null,
          amount: extAmt,
          gstPercent: extGst,
          totalAmount: extTot,
          noOfSeats: 1,
          isExtendedHours: true,
        },
      ];

      extendedInvoice = await (prisma as any).invoiceRecord.create({
        data: {
          clientMasterId: client.id,
          srNo: client.srNo,
          companyName: extendedClientName?.trim() || client.companyName,
          cabinName: extSummary,
          noOfSeats: 1,
          ratePerAgreement: extAmt,
          amount: extAmt,
          gstPercent: extGst,
          totalAmount: extTot,
          paymentDuration: 'ONE_TIME',
          paymentDueDay: validSessionDate.getDate(),
          dueDate: validSessionDate,
          productGroupKey: 'EXTENDED_HOURS_SESSION',
          itemsJson: JSON.stringify(extItems),
          gstNo: client.gstNo || null,
          billingMonth,
          bookingId: resolvedBookingId,
          brokerName: null,
          brokerCommissionPercent: 0,
          brokerCommissionAmount: 0,
          billedTo: 'CLIENT',
          isExtendedHours: true,
          sendType: 'MANUAL',
          sentAt: new Date(),
          status: 'PENDING_CM_REVIEW',
          createdById: currentUserId,
        },
      });

      syncInvoiceWorkflowArrival(extendedInvoice.id).catch((fmsErr) => {
        console.warn('[Generate Invoice] Extended Invoice Workflow FMS Arrival notice:', fmsErr);
      });
    }

    return NextResponse.json({
      success: true,
      data: newInvoice,
      extendedInvoice,
      message: extendedInvoice
        ? `Generated 2 invoices: #${newInvoice.id} for Broker and #${extendedInvoice.id} for Extended Hours!`
        : `Invoice #${newInvoice.id} generated for ${client.companyName} (${dateStr})!`,
    }, { status: 201 });
  } catch (error) {
    console.error('Generate session invoice error:', error);
    return NextResponse.json({ error: 'Failed to generate session invoice' }, { status: 500 });
  }
}
