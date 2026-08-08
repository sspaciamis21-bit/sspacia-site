import prisma from '@/lib/prisma';

/**
 * Auto-dispatches all active ClientMaster entries to InvoiceRecords
 * on the last day of the month. Creates 1 single consolidated invoice per client.
 * Prioritizes products array sum so multi-product clients get exact grand totals.
 * 
 * Called automatically when anyone opens the Invoices page.
 */
export async function autoDispatchIfLastDay(): Promise<{ dispatched: boolean; count: number; message: string }> {
  try {
    const now = new Date();
    const today = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Build billing month string
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentBillingMonth = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Fetch all active clients with their products
    const clientsToDispatch = await (prisma as any).clientMaster.findMany({
      where: { clientStatus: 'Active' },
      include: {
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (clientsToDispatch.length === 0) {
      return { dispatched: false, count: 0, message: 'No active clients found' };
    }

    const existingInvoices = await (prisma as any).invoiceRecord.findMany({
      where: { billingMonth: currentBillingMonth },
      select: { clientMasterId: true, productGroupKey: true },
    });
    const existingSet = new Set(existingInvoices.map((inv: any) => `${inv.clientMasterId}_${inv.productGroupKey || 'DEFAULT'}`));

    const invoiceCreates: any[] = [];

    for (const cm of clientsToDispatch) {
      if (cm.products && cm.products.length > 0) {
        // Group products by (paymentDueDay + paymentDuration)
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
          if (existingSet.has(dedupeKey)) continue;

          // Check if due day matches today or if month-end dispatch
          const firstP = pList[0];
          const dueDay = firstP.paymentDueDay ?? cm.paymentDueDay;

          // If due day is set and doesn't match today on lastDay check, allow dispatch on exact due day or month end
          if (dueDay && today !== dueDay && today !== lastDayOfMonth) {
            continue;
          }

          existingSet.add(dedupeKey);

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
                sendType: 'AUTOMATIC_MONTH_END',
                sentAt: now,
                status: 'PENDING_CM_REVIEW',
                createdById: cm.createdById,
              },
            })
          );
        }
      } else {
        const dedupeKey = `${cm.id}_DEFAULT`;
        if (existingSet.has(dedupeKey)) continue;
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
              sendType: 'AUTOMATIC_MONTH_END',
              sentAt: now,
              status: 'PENDING_CM_REVIEW',
              createdById: cm.createdById,
            },
          })
        );
      }
    }

    if (invoiceCreates.length === 0) {
      return { dispatched: false, count: 0, message: 'No new invoice entries to create' };
    }

    const createdRecords = await (prisma as any).$transaction(invoiceCreates);

    return {
      dispatched: true,
      count: createdRecords.length,
      message: `Auto-dispatched ${createdRecords.length} entries for ${currentBillingMonth}`,
    };
  } catch (error) {
    console.error('[Auto-Dispatch] Error:', error);
    return { dispatched: false, count: 0, message: 'Auto-dispatch error' };
  }
}
