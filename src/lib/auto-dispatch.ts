import prisma from '@/lib/prisma';
import { syncInvoiceWorkflowArrival } from '@/lib/invoiceWorkflowFmsSync';

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

    // Fetch all active clients with their products (exclude ONE_TIME clients from recurring monthly invoices)
    const clientsToDispatch = await (prisma as any).clientMaster.findMany({
      where: {
        clientStatus: 'Active',
        clientType: { not: 'ONE_TIME' },
      },
      include: {
        products: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (clientsToDispatch.length === 0) {
      return { dispatched: false, count: 0, message: 'No active clients found to dispatch' };
    }

    // Check existing invoices to avoid duplicate dispatch for the target billing months
    const existingInvoices = await (prisma as any).invoiceRecord.findMany({
      select: { clientMasterId: true, billingMonth: true },
    });
    const existingSet = new Set(existingInvoices.map((inv: any) => `${inv.clientMasterId}_${inv.billingMonth}`));

    const invoiceCreates: any[] = [];

    for (const cm of clientsToDispatch) {
      const isVO = cm.clientType === 'VIRTUAL_OFFICE';
      const products = cm.products && cm.products.length > 0 ? cm.products : [];
      const rawDuration = (products[0]?.paymentDuration || cm.paymentDuration || 'MONTHLY').toString().toUpperCase();
      const isYearlyVO = isVO && (rawDuration === 'YEARLY' || rawDuration === '12_MONTHS' || rawDuration === '12 MONTHS');

      let targetBillingMonthForClient = currentBillingMonth;
      let calculatedDueDate: Date;
      const primaryDueDay = products[0]?.paymentDueDay ?? cm.paymentDueDay ?? 5;

      if (isYearlyVO) {
        // Derive renewal month from agreementStartDate
        const agrDate = cm.agreementStartDate ? new Date(cm.agreementStartDate) : null;
        if (!agrDate || isNaN(agrDate.getTime())) {
          // If no agreement date is set, skip auto-generating to avoid incorrect month dispatch
          continue;
        }
        const renewalMonthIndex = agrDate.getMonth(); // 0 = Jan, 10 = Nov
        // Advance generation is 3 months prior to renewal (August for November)
        const advanceGenMonthIndex = (renewalMonthIndex - 3 + 12) % 12;

        // Auto-dispatch runs on month-end of currentMonthIndex. Check if this is the advance month:
        if (currentMonthIndex !== advanceGenMonthIndex) {
          // Not the renewal dispatch month for this Virtual Office client -> skip
          continue;
        }

        const renewalYear = currentMonthIndex > renewalMonthIndex ? currentYear + 1 : currentYear;
        targetBillingMonthForClient = `${monthNames[renewalMonthIndex]} ${renewalYear}`;

        const daysInRenewalMonth = new Date(renewalYear, renewalMonthIndex + 1, 0).getDate();
        calculatedDueDate = new Date(renewalYear, renewalMonthIndex, Math.min(primaryDueDay, daysInRenewalMonth));
      } else {
        // Standard clients: advance billing for upcoming month
        const daysInTargetMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
        calculatedDueDate = new Date(targetYear, targetMonthIndex, Math.min(primaryDueDay, daysInTargetMonth));
      }

      const dedupeKey = `${cm.id}_${targetBillingMonthForClient}`;
      if (existingSet.has(dedupeKey)) continue;
      existingSet.add(dedupeKey);

      let totalSeats = 0;
      let subAmount = 0;
      let totalAmt = 0;
      let cabinSummary = cm.cabinName || (isVO ? 'Virtual Office' : 'Workspace');

      if (products.length > 0) {
        totalSeats = products.reduce((sum: number, p: any) => sum + (Number(p.noOfSeats) || 0), 0);
        subAmount = Number(cm.amount) > 0 ? Number(cm.amount) : products.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        totalAmt = Number(cm.totalAmount) > 0 ? Number(cm.totalAmount) : products.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);

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
            paymentDuration: isYearlyVO ? 'YEARLY' : (products[0]?.paymentDuration || 'MONTHLY'),
            paymentDueDay: primaryDueDay,
            dueDate: calculatedDueDate,
            firstPaymentDate: products[0]?.firstPaymentDate ? new Date(products[0].firstPaymentDate) : null,
            productGroupKey: isYearlyVO ? 'YEARLY_VO' : 'MONTHLY_CONSOLIDATED',
            itemsJson: products.length > 0 ? JSON.stringify(products) : null,
            splitsJson: null,
            gstNo: cm.gstNo,
            billingMonth: targetBillingMonthForClient,
            bookingId: cm.bookingId || null,
            brokerName: cm.brokerName || null,
            brokerCommissionPercent: cm.brokerCommissionPercent || null,
            brokerCommissionAmount: cm.brokerCommissionAmount || null,
            billedTo: cm.invoiceToBeRaised || 'CLIENT',
            isExtendedHours: false,
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

    // ── Synchronize Step 1 to Invoice Workflow FMS (Invoice Arrival) ──
    for (const inv of createdRecords) {
      syncInvoiceWorkflowArrival(inv.id).catch((fmsErr) => {
        console.warn(`[Auto-Dispatch] Invoice Workflow FMS Arrival notice for #${inv.id}:`, fmsErr);
      });
    }

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
