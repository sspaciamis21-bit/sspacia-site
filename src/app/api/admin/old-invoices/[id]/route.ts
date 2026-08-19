import { NextResponse } from 'next/server';
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
    if (invoiceUrl !== undefined) data.invoiceUrl = invoiceUrl.trim();
    if (fileName !== undefined) data.fileName = fileName;
    if (fileSize !== undefined) data.fileSize = fileSize ? String(fileSize) : null;
    if (locationId !== undefined) data.locationId = locationId ? parseInt(String(locationId), 10) : null;
    if (locationName !== undefined) data.locationName = locationName;

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
