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
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    // Build billing month string
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentBillingMonth = `${monthNames[currentMonthIndex]} ${currentYear}`;

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
        // Group products by due day & duration, separating initial mid-month prorated items
        const groupsMap = new Map<string, any[]>();

        for (const p of cm.products) {
          const pDuration = p.paymentDuration || 'MONTHLY';
          const pDueDay = p.paymentDueDay ?? cm.paymentDueDay ?? 5;

          const isProratedMidMonth = p.billingType === 'PRORATED' && (p.proratedStartDate || p.extraSeatsDate);
          let isInitialAdditionMonth = false;
          let isSubsequentMonth = false;

          if (isProratedMidMonth) {
            const addDate = new Date(p.proratedStartDate || p.extraSeatsDate);
            const addYear = addDate.getFullYear();
            const addMonth = addDate.getMonth();

            if (addYear === currentYear && addMonth === currentMonthIndex) {
              isInitialAdditionMonth = true;
            } else if (currentYear > addYear || (currentYear === addYear && currentMonthIndex > addMonth)) {
              isSubsequentMonth = true;
            }
          }

          let processedItem = { ...p };

          if (isInitialAdditionMonth) {
            // Initial month: generate standalone unique invoice for the mid-month extra seats
            const key = `PRORATED_${p.id || p.cabinName}_DUE_${pDueDay}`;
            if (!groupsMap.has(key)) groupsMap.set(key, []);
            groupsMap.get(key)!.push({
              ...processedItem,
              _isInitialProrated: true,
              _pDueDay: pDueDay,
              _pDuration: pDuration,
            });
          } else if (isSubsequentMonth) {
            // Subsequent months: convert extra seats to full regular monthly amount and combine with main product
            const seats = Number(p.noOfSeats) || 0;
            const rate = Number(p.ratePerAgreement) || 0;
            const gstPct = Number(p.gstPercent) || 18;
            const fullAmount = seats * rate;
            const fullTotal = Math.round(fullAmount + (fullAmount * gstPct) / 100);

            const addDate = new Date(p.proratedStartDate || p.extraSeatsDate);
            const formattedDate = addDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            processedItem = {
              ...p,
              amount: fullAmount,
              totalAmount: fullTotal,
              _isRolledOverExtra: true,
              _extraSeatsAddedDate: formattedDate,
              _extraSeatsCount: seats,
            };

            const key = `DUE_${pDueDay}_${pDuration}`;
            if (!groupsMap.has(key)) groupsMap.set(key, []);
            groupsMap.get(key)!.push({
              ...processedItem,
              _pDueDay: pDueDay,
              _pDuration: pDuration,
            });
          } else {
            // Standard regular product
            const key = `DUE_${pDueDay}_${pDuration}`;
            if (!groupsMap.has(key)) groupsMap.set(key, []);
            groupsMap.get(key)!.push({
              ...processedItem,
              _pDueDay: pDueDay,
              _pDuration: pDuration,
            });
          }
        }

        for (const [groupKey, pList] of Array.from(groupsMap.entries())) {
          const dedupeKey = `${cm.id}_${groupKey}`;
          if (existingSet.has(dedupeKey)) continue;

          // Check if due day matches today or if month-end dispatch
          const firstP = pList[0];
          const dueDay = firstP._pDueDay ?? cm.paymentDueDay ?? 5;

          // If due day is set and doesn't match today on lastDay check, allow dispatch on exact due day or month end
          if (dueDay && today !== dueDay && today !== lastDayOfMonth) {
            continue;
          }

          existingSet.add(dedupeKey);

          const totalSeats = pList.reduce((sum: number, p: any) => sum + (Number(p.noOfSeats) || 0), 0);
          const subAmount = pList.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const totalAmt = pList.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);

          let cabinSummary = '';
          if (firstP._isInitialProrated) {
            const addDate = new Date(firstP.proratedStartDate || firstP.extraSeatsDate);
            const formattedDate = addDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            const cleanBase = (firstP.cabinName || 'Workspace').replace(/\s*\(.*?\)/g, '').trim();
            cabinSummary = `${cleanBase} - Mid-Month Addition: ${firstP.noOfSeats} Extra Seats (Prorated ${formattedDate} - ${lastDayOfMonth} ${monthNames[currentMonthIndex]})`;
          } else {
            const rolledOverExtras = pList.filter((p: any) => p._isRolledOverExtra);
            const cleanNames = Array.from(new Set(pList.map((p: any) => (p.cabinName || '').replace(/\s*\(.*?\)/g, '').trim()).filter(Boolean)));
            const baseName = cleanNames.join(', ') || cm.cabinName || 'Workspace';

            if (rolledOverExtras.length > 0) {
              const notes = rolledOverExtras.map((rx: any) => `${rx._extraSeatsCount} extra seats added on ${rx._extraSeatsAddedDate}`).join(', ');
              cabinSummary = `${baseName} (${totalSeats} Seats - includes ${notes})`;
            } else if (pList.length > 1) {
              cabinSummary = `${pList.length} Items (${pList.map((p: any) => p.cabinName).filter(Boolean).join(', ')})`;
            } else {
              cabinSummary = pList[0].cabinName || cm.cabinName || 'N/A';
            }
          }

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
                paymentDuration: firstP._pDuration || 'MONTHLY',
                paymentDueDay: dueDay,
                firstPaymentDate: firstP.firstPaymentDate ? new Date(firstP.firstPaymentDate) : null,
                productGroupKey: groupKey,
                itemsJson: JSON.stringify(pList.map((p: any) => ({
                  cabinName: p._isInitialProrated
                    ? `${(p.cabinName || 'Workspace').replace(/\s*\(.*?\)/g, '').trim()} - Mid-Month Addition: ${p.noOfSeats} Extra Seats`
                    : (p._isRolledOverExtra
                        ? `${(p.cabinName || 'Workspace').replace(/\s*\(.*?\)/g, '').trim()} (${p._extraSeatsCount} Extra Seats added on ${p._extraSeatsAddedDate})`
                        : p.cabinName),
                  noOfSeats: p.noOfSeats,
                  ratePerAgreement: p.ratePerAgreement,
                  amount: p.amount,
                  gstPercent: p.gstPercent,
                  totalAmount: p.totalAmount,
                  paymentDuration: p.paymentDuration,
                  paymentDueDay: p._pDueDay,
                  firstPaymentDate: p.firstPaymentDate,
                  billingType: p._isInitialProrated ? 'PRORATED' : (p.billingType || 'REGULAR'),
                  note: p._isInitialProrated
                    ? `Initial mid-month added seats invoice (Prorated from ${new Date(p.proratedStartDate || p.extraSeatsDate).toLocaleDateString('en-IN')})`
                    : (p._isRolledOverExtra
                        ? `Regular monthly billing for ${p._extraSeatsCount} seats added on ${p._extraSeatsAddedDate}`
                        : undefined),
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

        const fallbackDueDay = cm.paymentDueDay ?? 5;

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
              paymentDueDay: fallbackDueDay,
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
