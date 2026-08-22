import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { findOldInvoiceById, updateOldInvoice, deleteOldInvoice } from '@/lib/old-invoices-db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const item = await findOldInvoiceById(id);

    if (!item) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      companyName,
      invoiceNo,
      month,
      year,
      amount,
      remarks,
      invoiceUrl,
      fileName,
      fileSize,
      locationId,
      locationName,
      payReceiveDate,
      receiveAmount,
      paymentMode,
      utrNumber,
      utrDate,
      utrFileUrl,
      utrFileName,
      tdsDeducted,
      tdsAmount,
    } = body;

    const data: any = {};
    if (companyName !== undefined) data.companyName = companyName.trim();
    if (invoiceNo !== undefined) data.invoiceNo = invoiceNo ? invoiceNo.trim() : null;
    if (month !== undefined) data.month = month.trim();
    if (year !== undefined) data.year = year ? parseInt(String(year), 10) : null;
    if (amount !== undefined) {
      const parsedAmount = amount ? parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) : null;
      data.amount = parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount : null;
    }
    if (remarks !== undefined) data.remarks = remarks ? remarks.trim() : null;
    if (invoiceUrl !== undefined) data.invoiceUrl = invoiceUrl ? invoiceUrl.trim() : '';
    if (fileName !== undefined) data.fileName = fileName;
    if (fileSize !== undefined) data.fileSize = fileSize ? String(fileSize) : null;
    if (locationId !== undefined) data.locationId = locationId ? parseInt(String(locationId), 10) : null;
    if (locationName !== undefined) data.locationName = locationName;

    // Payment Received Details
    if (payReceiveDate !== undefined) data.payReceiveDate = payReceiveDate ? new Date(payReceiveDate) : null;
    if (receiveAmount !== undefined) {
      const parsedRec = receiveAmount ? parseFloat(String(receiveAmount).replace(/[^0-9.-]+/g, '')) : null;
      data.receiveAmount = parsedRec !== null && !isNaN(parsedRec) ? parsedRec : null;
    }
    if (paymentMode !== undefined) data.paymentMode = paymentMode ? paymentMode.trim() : null;
    if (utrNumber !== undefined) data.utrNumber = utrNumber ? utrNumber.trim() : null;
    if (utrDate !== undefined) data.utrDate = utrDate ? new Date(utrDate) : null;
    if (utrFileUrl !== undefined) data.utrFileUrl = utrFileUrl ? utrFileUrl.trim() : null;
    if (utrFileName !== undefined) data.utrFileName = utrFileName ? utrFileName.trim() : null;
    if (tdsDeducted !== undefined) data.tdsDeducted = tdsDeducted ? tdsDeducted.trim() : null;
    if (tdsAmount !== undefined) {
      const parsedTds = tdsAmount ? parseFloat(String(tdsAmount).replace(/[^0-9.-]+/g, '')) : null;
      data.tdsAmount = parsedTds !== null && !isNaN(parsedTds) ? parsedTds : null;
    }
    if (body.paymentsJson !== undefined) {
      data.paymentsJson = typeof body.paymentsJson === 'string' ? body.paymentsJson : JSON.stringify(body.paymentsJson);
    }

    const updated = await updateOldInvoice(id, data);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Old invoice record updated successfully!',
    });
  } catch (error: any) {
    console.error('Error updating old invoice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (String(payload?.role || '').toUpperCase() === 'ACCOUNTANT') {
        return NextResponse.json({ success: false, error: 'Accountants cannot delete invoices' }, { status: 403 });
      }
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await deleteOldInvoice(id);

    return NextResponse.json({
      success: true,
      message: 'Old invoice record deleted successfully!',
    });
  } catch (error: any) {
    console.error('Error deleting old invoice:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
