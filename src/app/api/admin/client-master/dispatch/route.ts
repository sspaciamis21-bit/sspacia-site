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
    const { sendType = 'MANUAL', clientMasterIds = [], locationId = null } = body;

    // ── Node-based Data Isolation & Super Admin Node Filter for Dispatching ──
    const scopedUserIds = await getNodeScopedUserIds(userId);

    const where: any = {
      clientStatus: 'Active',
    };

    // Filter by explicitly selected Client Master IDs if provided
    if (sendType === 'MANUAL' && Array.isArray(clientMasterIds) && clientMasterIds.length > 0) {
      where.id = { in: clientMasterIds.map(Number) };
    }

    // Super Admin Node Filter: if locationId is passed (e.g. Super Admin filtered by a center)
    if (locationId && locationId !== 'ALL') {
      const locationUserIds = await getUserIdsByLocation(parseInt(String(locationId), 10));
      if (locationUserIds) {
        where.createdById = { in: locationUserIds };
      }
    } else if (scopedUserIds !== null) {
      // Apply node scoping for non-admin Community Managers
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
        { error: 'No active clients found in the selected center to dispatch.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentBillingMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // ── Duplicate prevention for AUTOMATIC_MONTH_END ─────────────
    if (sendType === 'AUTOMATIC_MONTH_END') {
      const existingCount = await (prisma as any).invoiceRecord.count({
        where: {
          billingMonth: currentBillingMonth,
          sendType: 'AUTOMATIC_MONTH_END',
          ...(scopedUserIds !== null ? { createdById: { in: scopedUserIds } } : {}),
        },
      });

      if (existingCount > 0) {
        return NextResponse.json(
          { error: `Month-end dispatch already completed for ${currentBillingMonth} in this center (${existingCount} records exist).` },
          { status: 400 }
        );
      }
    }

    // ── Strict Single Invoice Record Per Client Master Entry ─────────────────
    const existingInvoices = await (prisma as any).invoiceRecord.findMany({
      where: {
        billingMonth: currentBillingMonth,
      },
      select: {
        clientMasterId: true,
        productGroupKey: true,
      },
    });

    const existingSet = new Set(existingInvoices.map((inv: any) => `${inv.clientMasterId}_${inv.productGroupKey || 'DEFAULT'}`));

    const invoiceCreates: any[] = [];
    let skippedDuplicatesCount = 0;

    for (const cm of clientsToDispatch) {
      if (cm.products && cm.products.length > 0) {
        const groupsMap = new Map<string, any[]>();
        for (const p of cm.products) {
          const pDuration = p.paymentDuration || 'MONTHLY';
          const pDueDay = p.paymentDueDay ?? cm.paymentDueDay ?? 'DEFAULT';
          const key = `${pDueDay}_${pDuration}`;
          if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
          }
          groupsMap.get(key)!.push(p);
        }

        for (const [groupKey, pList] of Array.from(groupsMap.entries())) {
          const dedupeKey = `${cm.id}_${groupKey}`;
          if (existingSet.has(dedupeKey)) {
            skippedDuplicatesCount++;
            continue;
          }

          existingSet.add(dedupeKey);
          const firstP = pList[0];

          const totalSeats = pList.reduce((sum: number, p: any) => sum + (Number(p.noOfSeats) || 0), 0);
          const subAmount = pList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const totalAmt = pList.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);
          const cabinSummary = pList.length > 1
            ? `${pList.length} Items (${pList.map((p: any) => p.cabinName).filter(Boolean).join(', ')})`
            : (pList[0].cabinName || cm.cabinName || 'N/A');

          invoiceCreates.push(
            (prisma as any).invoiceRecord.create({
              data: {
                clientMasterId: cm.id,
                srNo: cm.srNo,
                companyName: cm.companyName,
                cabinName: cabinSummary,
                noOfSeats: totalSeats,
                ratePerAgreement: firstP.ratePerAgreement || cm.ratePerAgreement || null,
                amount: subAmount,
                gstPercent: firstP.gstPercent || cm.gstPercent || 18,
                totalAmount: totalAmt,
                paymentDuration: firstP.paymentDuration || 'MONTHLY',
                paymentDueDay: firstP.paymentDueDay ?? cm.paymentDueDay ?? null,
                firstPaymentDate: firstP.firstPaymentDate ? new Date(firstP.firstPaymentDate) : null,
                productGroupKey: groupKey,
                itemsJson: JSON.stringify(pList.map((p: any) => ({
                  cabinName: p.cabinName,
                  noOfSeats: p.noOfSeats,
                  ratePerAgreement: p.ratePerAgreement,
                  amount: p.amount,
                  gstPercent: p.gstPercent,
                  totalAmount: p.totalAmount,
                  paymentDuration: p.paymentDuration,
                  paymentDueDay: p.paymentDueDay,
                  firstPaymentDate: p.firstPaymentDate,
                }))),
                gstNo: cm.gstNo,
                billingMonth: currentBillingMonth,
                sendType: sendType === 'AUTOMATIC_MONTH_END' ? 'AUTOMATIC_MONTH_END' : 'MANUAL',
                sentAt: now,
                status: 'PENDING_CM_REVIEW',
                createdById: cm.createdById,
              },
            })
          );
        }
      } else {
        const dedupeKey = `${cm.id}_DEFAULT`;
        if (existingSet.has(dedupeKey)) {
          skippedDuplicatesCount++;
          continue;
        }

        existingSet.add(dedupeKey);

        invoiceCreates.push(
          (prisma as any).invoiceRecord.create({
            data: {
              clientMasterId: cm.id,
              srNo: cm.srNo,
              companyName: cm.companyName,
              cabinName: cm.cabinName || 'N/A',
              noOfSeats: Number(cm.noOfSeats) || 0,
              ratePerAgreement: cm.ratePerAgreement || null,
              amount: Number(cm.amount) || 0,
              gstPercent: cm.gstPercent || 18,
              totalAmount: Number(cm.totalAmount) || 0,
              paymentDuration: 'MONTHLY',
              paymentDueDay: cm.paymentDueDay ?? null,
              productGroupKey: 'DEFAULT',
              gstNo: cm.gstNo,
              billingMonth: currentBillingMonth,
              sendType: sendType === 'AUTOMATIC_MONTH_END' ? 'AUTOMATIC_MONTH_END' : 'MANUAL',
              sentAt: now,
              status: 'PENDING_CM_REVIEW',
              createdById: cm.createdById,
            },
          })
        );
      }
    }

    if (invoiceCreates.length === 0) {
      return NextResponse.json(
        {
          error: `Selected client entry(ies) are already present in the Invoices section for ${currentBillingMonth}. Cannot re-dispatch.`,
        },
        { status: 400 }
      );
    }

    const createdInvoiceRecords = await (prisma as any).$transaction(invoiceCreates);

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched ${createdInvoiceRecords.length} entries to Invoices section${skippedDuplicatesCount > 0 ? ` (${skippedDuplicatesCount} already present skipped)` : ''}!`,
      count: createdInvoiceRecords.length,
      skippedDuplicatesCount,
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
