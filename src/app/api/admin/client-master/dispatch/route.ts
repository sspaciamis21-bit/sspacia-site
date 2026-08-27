import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds, getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      sendType = 'MANUAL', 
      clientMasterIds = [], 
      locationId = null,
      billingMonth = null,
      forceReDispatch = false,
    } = body;

    // ── Node-based Data Isolation & Super Admin Node Filter for Dispatching ──
    const scopedUserIds = await getNodeScopedUserIds(userId);

    const where: any = {
      clientStatus: 'Active',
    };

    // Filter by explicitly selected Client Master IDs if provided
    if (sendType === 'MANUAL' && Array.isArray(clientMasterIds) && clientMasterIds.length > 0) {
      where.id = { in: clientMasterIds.map(Number) };
    }

    // Super Admin Node Filter: if locationId is passed
    if (locationId && locationId !== 'ALL') {
      const locationUserIds = await getUserIdsByLocation(parseInt(String(locationId), 10));
      if (locationUserIds) {
        where.createdById = { in: locationUserIds };
      }
    } else if (scopedUserIds !== null) {
      where.createdById = { in: scopedUserIds };
    }

    const clientsToDispatch = await (prisma as any).clientMaster.findMany({
      where,
      include: {
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (clientsToDispatch.length === 0) {
      return NextResponse.json(
        { error: 'No active clients found in the selected filter to dispatch.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Determine target billing month: from body or calculate based on date
    // If today is after 20th of the month, default target is next month
    let targetBillingMonth: string;
    let targetMonthIndex = now.getMonth();
    let targetYear = now.getFullYear();

    if (billingMonth && typeof billingMonth === 'string' && billingMonth.trim() !== '') {
      targetBillingMonth = billingMonth.trim();
      const parts = targetBillingMonth.split(' ');
      if (parts.length === 2) {
        const mIdx = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const y = parseInt(parts[1], 10);
        if (mIdx !== -1) targetMonthIndex = mIdx;
        if (!isNaN(y)) targetYear = y;
      }
    } else {
      if (now.getDate() >= 20) {
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        targetBillingMonth = `${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
        targetMonthIndex = nextMonthDate.getMonth();
        targetYear = nextMonthDate.getFullYear();
      } else {
        targetBillingMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      }
    }

    // ── Check existing invoice records for this target billing month to prevent unwanted duplicates ──
    const existingInvoices = await (prisma as any).invoiceRecord.findMany({
      where: {
        billingMonth: targetBillingMonth,
      },
      select: {
        clientMasterId: true,
      },
    });

    const existingSet = new Set(existingInvoices.map((inv: any) => Number(inv.clientMasterId)));

    const invoiceCreates: any[] = [];
    let skippedDuplicatesCount = 0;

    for (const cm of clientsToDispatch) {
      if (!forceReDispatch && existingSet.has(cm.id)) {
        skippedDuplicatesCount++;
        continue;
      }
      existingSet.add(cm.id);

      const products = cm.products && cm.products.length > 0 ? cm.products : [];

      let totalSeats = 0;
      let subAmount = 0;
      let totalAmt = 0;
      let cabinSummary = cm.cabinName || 'Workspace';
      let primaryDueDay = cm.paymentDueDay || 5;

      if (products.length > 0) {
        totalSeats = products.reduce((sum: number, p: any) => sum + (Number(p.noOfSeats) || 0), 0);
        subAmount = Number(cm.amount) > 0 ? Number(cm.amount) : products.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        totalAmt = Number(cm.totalAmount) > 0 ? Number(cm.totalAmount) : products.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);
        primaryDueDay = products[0].paymentDueDay ?? cm.paymentDueDay ?? 5;

        const cleanNames = Array.from(new Set(products.map((p: any) => (p.cabinName || '').trim()).filter(Boolean)));
        if (cleanNames.length > 1) {
          cabinSummary = `${products.length} Products (${cleanNames.join(', ')})`;
        } else if (cleanNames.length === 1) {
          cabinSummary = cleanNames[0];
        }
      } else {
        totalSeats = Number(cm.noOfSeats) || 0;
        subAmount = Number(cm.amount) || 0;
        totalAmt = Number(cm.totalAmount) || 0;
      }

      const daysInTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
      const calculatedDueDate = new Date(targetYear, targetMonthIndex, Math.min(primaryDueDay, daysInTargetMonth));

      invoiceCreates.push(
        (prisma as any).invoiceRecord.create({
          data: {
            clientMasterId: cm.id,
            srNo: cm.srNo,
            companyName: cm.companyName,
            cabinName: cabinSummary,
            noOfSeats: totalSeats,
            ratePerAgreement: products[0]?.ratePerAgreement || cm.ratePerAgreement || null,
            amount: subAmount,
            gstPercent: products[0]?.gstPercent || cm.gstPercent || 18,
            totalAmount: totalAmt,
            paymentDuration: products[0]?.paymentDuration || 'MONTHLY',
            paymentDueDay: primaryDueDay,
            dueDate: calculatedDueDate,
            lateFeePerDay: 100.0,
            productGroupKey: 'MONTHLY_CONSOLIDATED',
            itemsJson: products.length > 0 ? JSON.stringify(products) : null,
            splitsJson: null,
            gstNo: cm.gstNo,
            billingMonth: targetBillingMonth,
            sendType: sendType === 'AUTOMATIC_MONTH_END' ? 'AUTOMATIC_MONTH_END' : 'MANUAL',
            sentAt: now,
            status: 'PENDING_CM_REVIEW',
            createdById: cm.createdById,
          },
        })
      );
    }

    if (invoiceCreates.length === 0) {
      return NextResponse.json(
        {
          error: `Selected clients already have invoice records generated for ${targetBillingMonth}.`,
          skippedDuplicatesCount,
          targetBillingMonth,
        },
        { status: 400 }
      );
    }

    const createdInvoiceRecords = await (prisma as any).$transaction(invoiceCreates);

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched ${createdInvoiceRecords.length} invoice entries for ${targetBillingMonth} to the Invoices section!`,
      count: createdInvoiceRecords.length,
      skippedDuplicatesCount,
      targetBillingMonth,
      batchDate: now.toISOString(),
      sendType,
      data: createdInvoiceRecords,
    });
  } catch (error) {
    console.error('Dispatch to invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch entries to Invoices section' },
      { status: 500 }
    );
  }
}
