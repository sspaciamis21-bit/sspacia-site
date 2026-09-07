import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

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
    const billingMonth = `One-Time: ${dateStr}`;

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
        sendType: 'MANUAL',
        sentAt: new Date(),
        status: 'PENDING_CM_REVIEW',
        createdById: currentUserId,
      },
    });

    return NextResponse.json({
      success: true,
      data: newInvoice,
      message: `Invoice #${newInvoice.id} generated for ${client.companyName} (${dateStr})!`,
    }, { status: 201 });
  } catch (error) {
    console.error('Generate session invoice error:', error);
    return NextResponse.json({ error: 'Failed to generate session invoice' }, { status: 500 });
  }
}
