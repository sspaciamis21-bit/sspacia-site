import { NextResponse } from 'next/server';
import { findOldInvoiceById, updateOldInvoice } from '@/lib/old-invoices-db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action, // 'save' | 'unmerge'
      invoiceIds,
      companyName,
      month,
      payReceiveDate,
      receiveAmount,
      paymentMode,
      utrNumber,
      utrDate,
      utrFileUrl,
      utrFileName,
      tdsDeducted,
      tdsAmount,
      installments,
      remarks,
    } = body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one invoice must be selected.' },
        { status: 400 }
      );
    }

    const numericIds = invoiceIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id));

    // Handle Unmerge / Clear Payment
    if (action === 'unmerge') {
      for (const id of numericIds) {
        await updateOldInvoice(id, {
          paymentsJson: null,
          receiveAmount: null,
          payReceiveDate: null,
          paymentMode: null,
          utrNumber: null,
          utrDate: null,
          utrFileUrl: null,
          utrFileName: null,
          tdsDeducted: null,
          tdsAmount: null,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully unmerged and cleared payment details for ${numericIds.length} invoices.`,
      });
    }

    // Fetch existing records to verify and gather invoice details
    const invoiceRecords: any[] = [];
    for (const id of numericIds) {
      const rec = await findOldInvoiceById(id);
      if (rec) {
        invoiceRecords.push(rec);
      }
    }

    if (invoiceRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching invoice records found.' },
        { status: 404 }
      );
    }

    const totalInvoicesAmount = invoiceRecords.reduce((sum, inv) => {
      const amt = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      return sum + amt;
    }, 0);

    const parsedTotalReceive =
      receiveAmount !== undefined && receiveAmount !== null && receiveAmount !== ''
        ? parseFloat(String(receiveAmount).replace(/[^0-9.-]+/g, ''))
        : totalInvoicesAmount;

    const parsedTdsAmount =
      tdsAmount !== undefined && tdsAmount !== null && tdsAmount !== ''
        ? parseFloat(String(tdsAmount).replace(/[^0-9.-]+/g, ''))
        : null;

    // Structured merged payment metadata for paymentsJson
    const mergedPayload = {
      isMerged: true,
      mergedInvoiceIds: numericIds,
      mergedInvoiceCount: numericIds.length,
      mergedCompanyName: companyName || invoiceRecords[0]?.companyName || '',
      mergedMonth: month || invoiceRecords[0]?.month || '',
      mergedTotalInvoicesAmount: totalInvoicesAmount,
      mergedTotalReceiveAmount: parsedTotalReceive,
      mergedInvoices: invoiceRecords.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo || 'None',
        month: inv.month,
        remarks: inv.remarks || '',
        amount: inv.amount !== null && inv.amount !== undefined ? Number(inv.amount) : null,
      })),
      installments: Array.isArray(installments) && installments.length > 0 ? installments : [
        {
          id: `merged_part_1`,
          payReceiveDate: payReceiveDate || new Date().toISOString().split('T')[0],
          receiveAmount: String(parsedTotalReceive),
          paymentMode: paymentMode || 'NEFT',
          utrNumber: utrNumber || '',
          utrDate: utrDate || (payReceiveDate || new Date().toISOString().split('T')[0]),
          tdsDeducted: tdsDeducted === 'Yes' ? 'Yes' : 'No',
          tdsAmount: parsedTdsAmount ? String(parsedTdsAmount) : '',
          paymentDocUrl: utrFileUrl || '',
          paymentDocName: utrFileName || '',
          utrDocUrl: utrFileUrl || '',
          utrDocName: utrFileName || '',
          remarks: remarks || '',
        }
      ],
      remarks: remarks || '',
    };

    const paymentsJsonString = JSON.stringify(mergedPayload);

    // Apply merged payment data across all selected invoice records
    for (const inv of invoiceRecords) {
      // Proportional receiveAmount allocation per invoice (or equal allocation if total invoice amount is 0)
      let allocatedReceive = 0;
      const invAmount = parseFloat(String(inv.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      if (totalInvoicesAmount > 0 && invAmount > 0) {
        allocatedReceive = Math.round((invAmount / totalInvoicesAmount) * parsedTotalReceive * 100) / 100;
      } else {
        allocatedReceive = Math.round((parsedTotalReceive / invoiceRecords.length) * 100) / 100;
      }

      await updateOldInvoice(inv.id, {
        receiveAmount: allocatedReceive > 0 ? allocatedReceive : parsedTotalReceive,
        payReceiveDate: payReceiveDate ? new Date(payReceiveDate) : (inv.payReceiveDate || new Date()),
        paymentMode: paymentMode ? String(paymentMode).trim() : 'NEFT',
        utrNumber: utrNumber ? String(utrNumber).trim() : null,
        utrDate: utrDate ? new Date(utrDate) : (payReceiveDate ? new Date(payReceiveDate) : null),
        utrFileUrl: utrFileUrl ? String(utrFileUrl).trim() : null,
        utrFileName: utrFileName ? String(utrFileName).trim() : null,
        tdsDeducted: tdsDeducted === 'Yes' ? 'Yes' : 'No',
        tdsAmount: parsedTdsAmount,
        paymentsJson: paymentsJsonString,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged payment for ${invoiceRecords.length} invoices of ${mergedPayload.mergedCompanyName} (${mergedPayload.mergedMonth})!`,
      data: mergedPayload,
    });
  } catch (error: any) {
    console.error('Error in merged payment handler:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save merged payment details' },
      { status: 500 }
    );
  }
}
