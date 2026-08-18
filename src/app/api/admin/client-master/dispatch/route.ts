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
      targetDueDay = null, // e.g. 5, 10, 15, 20, or 'ALL'
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
    const currentBillingMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const currentMonthIndex = now.getMonth(); // 0 to 11
    const currentYear = now.getFullYear();

    // ── Strict Single Invoice Record Per (ClientMaster + DueDay + Frequency) ──
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
    let skippedOffCycleCount = 0;

    for (const cm of clientsToDispatch) {
      if (cm.products && cm.products.length > 0) {
        // Filter and group products by (dueDay + duration)
        const groupsMap = new Map<string, any[]>();

        for (const p of cm.products) {
          const pDuration = (p.paymentDuration || 'MONTHLY').toUpperCase();
          const pDueDay = p.paymentDueDay ?? cm.paymentDueDay ?? 5;

          // 1. Exact Due Day Filter Check (if targetDueDay specified)
          if (targetDueDay && targetDueDay !== 'ALL') {
            if (Number(pDueDay) !== Number(targetDueDay)) {
              continue; // Skip products not falling on this exact target due date
            }
          }

          // 2. Billing Cycle Validator (Yearly, Quarterly, Half-Yearly, Monthly)
          const startMonth = p.firstPaymentDate ? new Date(p.firstPaymentDate).getMonth() : (cm.agreementStartDate ? new Date(cm.agreementStartDate).getMonth() : 0);
          const monthOffset = (currentMonthIndex - startMonth + 12) % 12;

          let isDueInCurrentMonth = true;
          if (pDuration === 'QUARTERLY') {
            isDueInCurrentMonth = monthOffset % 3 === 0;
          } else if (pDuration === 'HALF_YEARLY') {
            isDueInCurrentMonth = monthOffset % 6 === 0;
          } else if (pDuration === 'YEARLY') {
            isDueInCurrentMonth = monthOffset % 12 === 0;
          }

          if (!isDueInCurrentMonth) {
            skippedOffCycleCount++;
            continue; // Skip products not due in this calendar month cycle
          }

          // Option B: Group strictly by Due Day so accountant gets 1 consolidated invoice for all items due on that day
          const key = `DUE_${pDueDay}`;
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
          const dueDayNum = Number(firstP.paymentDueDay ?? cm.paymentDueDay ?? 5);
          const daysInCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
          const calculatedDueDate = new Date(currentYear, currentMonthIndex, Math.min(dueDayNum, daysInCurrentMonth));

          const totalSeats = pList.reduce((sum: number, p: any) => sum + (Number(p.noOfSeats) || 0), 0);
          const subAmount = pList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const totalAmt = pList.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);
          const cabinSummary = pList.length > 1
            ? `${pList.length} Spaces (${pList.map((p: any) => p.cabinName).filter(Boolean).join(', ')})`
            : (pList[0].cabinName || cm.cabinName || 'N/A');

          // Determine duration label (single frequency vs combined frequencies)
          const uniqueDurations = Array.from(new Set(pList.map((p: any) => (p.paymentDuration || 'MONTHLY').toUpperCase())));
          const consolidatedDuration = uniqueDurations.length === 1 ? uniqueDurations[0] : 'COMBINED';

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
                paymentDuration: consolidatedDuration,
                paymentDueDay: dueDayNum,
                firstPaymentDate: firstP.firstPaymentDate ? new Date(firstP.firstPaymentDate) : null,
                dueDate: calculatedDueDate,
                lateFeePerDay: 100.0,
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
                  billingType: p.billingType || 'REGULAR',
                  agreementPdfUrl: p.agreementPdfUrl,
                  agreementPdfName: p.agreementPdfName,
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
        // Fallback for legacy single-cabin entries
        const dueDayNum = Number(cm.paymentDueDay ?? 5);
        if (targetDueDay && targetDueDay !== 'ALL' && Number(targetDueDay) !== dueDayNum) {
          continue;
        }

        const dedupeKey = `${cm.id}_DEFAULT`;
        if (existingSet.has(dedupeKey)) {
          skippedDuplicatesCount++;
          continue;
        }

        existingSet.add(dedupeKey);
        const daysInCurrentMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
        const calculatedDueDate = new Date(currentYear, currentMonthIndex, Math.min(dueDayNum, daysInCurrentMonth));

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
              paymentDueDay: dueDayNum,
              dueDate: calculatedDueDate,
              lateFeePerDay: 100.0,
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
          error: `No new invoice records were eligible for dispatch (already present in Invoices section or off-cycle).`,
        },
        { status: 400 }
      );
    }

    const createdInvoiceRecords = await (prisma as any).$transaction(invoiceCreates);

    return NextResponse.json({
      success: true,
      message: `Successfully dispatched ${createdInvoiceRecords.length} invoice entries to the Invoices section!`,
      count: createdInvoiceRecords.length,
      skippedDuplicatesCount,
      skippedOffCycleCount,
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
