import prisma from '@/lib/prisma';

/**
 * Auto-dispatches all active ClientMaster entries to InvoiceRecords
 * on the last calendar day of the month. Creates 1 consolidated parent invoice per client.
 * Called automatically when anyone opens the Invoices page on month-end, or via daily cron.
 */
export async function autoDispatchIfLastDay(): Promise<{ dispatched: boolean; count: number; message: string }> {
  try {
    const now = new Date();
    const today = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

    // Only dispatch on the last calendar day of the month
    if (today !== lastDayOfMonth) {
      return {
        dispatched: false,
        count: 0,
        message: `Auto-dispatch only triggers on the last day of the month (${lastDayOfMonth}th). Today is day ${today}.`,
      };
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // In coworking advance billing, invoice generated on the last day of the month is for the UPCOMING billing month
    const nextMonthDate = new Date(currentYear, currentMonthIndex + 1, 1);
    const targetMonthIndex = nextMonthDate.getMonth();
    const targetYear = nextMonthDate.getFullYear();
    const currentBillingMonth = `${monthNames[targetMonthIndex]} ${targetYear}`;

    console.log(`[Auto-Dispatch] 🗓️ Last day of month detected (${today}/${currentMonthIndex + 1}/${currentYear}). Preparing invoices for: "${currentBillingMonth}"`);

    // Fetch all active clients with their products
    const clientsToDispatch = await (prisma as any).clientMaster.findMany({
      where: { clientStatus: 'Active' },
      include: {
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (clientsToDispatch.length === 0) {
      return { dispatched: false, count: 0, message: 'No active clients found to dispatch' };
    }

    // Check which clients already have an invoice for this upcoming billing month
    const existingInvoices = await (prisma as any).invoiceRecord.findMany({
      where: { billingMonth: currentBillingMonth },
      select: { clientMasterId: true },
    });
    const existingSet = new Set(existingInvoices.map((inv: any) => Number(inv.clientMasterId)));

    const invoiceCreates: any[] = [];

    for (const cm of clientsToDispatch) {
      if (existingSet.has(cm.id)) continue;
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

      // Due date set for the upcoming billing month (e.g. 5th of September)
      const dueDate = new Date(targetYear, targetMonthIndex, Math.min(primaryDueDay, 28));

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
            dueDate,
            firstPaymentDate: products[0]?.firstPaymentDate ? new Date(products[0].firstPaymentDate) : null,
            productGroupKey: 'MONTHLY_CONSOLIDATED',
            itemsJson: products.length > 0 ? JSON.stringify(products) : null,
            splitsJson: null,
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

    if (invoiceCreates.length === 0) {
      return { dispatched: false, count: 0, message: `All active clients already have invoice entries for ${currentBillingMonth}` };
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
