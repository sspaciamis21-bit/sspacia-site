import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findOldInvoices } from '@/lib/old-invoices-db';

const DROPDOWN_PRODUCTS = [
  'Dedicated Cabin',
  'Executive Cabin',
  'Private Cabin',
  'Fixed Desk',
  'Flexi Desk',
  'Virtual Office',
  'Meeting Room',
  'Board Room',
  'Event Space',
  'Day Pass Desk',
  'Car Parking',
  'Documentation Charges'
];

const MONTHS = ['April 2026', 'May 2026', 'June 2026', 'July 2026', 'August 2026', 'September 2026'];

function normalizeProduct(rawName?: string | null, remarks?: string | null, companyName?: string | null): string {
  const r = (remarks || '').toLowerCase();
  const raw = (rawName || '').toLowerCase();
  const comp = (companyName || '').toLowerCase();

  if (r.includes('board room') || r.includes('boardroom')) return 'Board Room';
  if (r.includes('meeting room') || r.includes('conference')) return 'Meeting Room';
  if (r.includes('day pass') || r.includes('daypass')) return 'Day Pass Desk';
  if (r.includes('virtual office') || r.includes('vo renewal')) return 'Virtual Office';
  if (r.includes('event')) return 'Event Space';

  if (raw.includes('board room') || raw.includes('boardroom')) return 'Board Room';
  if (raw.includes('meeting room') || raw.includes('conference')) return 'Meeting Room';
  if (raw.includes('event space') || raw.includes('event')) return 'Event Space';
  if (raw.includes('day pass') || raw.includes('daypass')) return 'Day Pass Desk';
  if (raw.includes('executive cabin')) return 'Executive Cabin';
  if (raw.includes('private cabin')) return 'Private Cabin';
  if (raw.includes('dedicated cabin')) return 'Dedicated Cabin';
  if (raw.includes('flexi desk')) return 'Flexi Desk';
  if (raw.includes('fixed desk')) return 'Fixed Desk';
  if (raw.includes('virtual office') || raw.includes('virtual client')) return 'Virtual Office';
  if (raw.includes('parking')) return 'Car Parking';
  if (raw.includes('documentation') || raw.includes('franking') || raw.includes('notary')) return 'Documentation Charges';

  if (comp.includes('myhq') || comp.includes('my hq') || comp.includes('upflex') || comp.includes('go floater') || comp.includes('gofloater')) {
    return 'Day Pass Desk';
  }

  if (raw.includes('cabin')) return 'Dedicated Cabin';
  if (raw.includes('desk')) return 'Fixed Desk';

  return 'Dedicated Cabin';
}

function resolveCenter(clientId?: string | null, locationName?: string | null, createdBy?: any): string {
  if (locationName) {
    const loc = locationName.toLowerCase();
    if (loc.includes('mercado') || loc.includes('cgm')) return 'Mercado';
    if (loc.includes('premier') || loc.includes('sgp')) return 'Premier House';
    if (loc.includes('agarwal') || loc.includes('ac')) return 'Agarwal Complex';
  }
  if (clientId) {
    if (clientId.includes('CGM') || clientId.includes('-MC-')) return 'Mercado';
    if (clientId.includes('SGP') || clientId.includes('-PH-')) return 'Premier House';
    if (clientId.includes('AC') || clientId.includes('-AC-')) return 'Agarwal Complex';
  }
  if (createdBy?.assignedLocations?.[0]?.location?.name) {
    return createdBy.assignedLocations[0].location.name;
  }
  if (createdBy?.name) {
    const n = createdBy.name.toLowerCase();
    if (n.includes('mercado')) return 'Mercado';
    if (n.includes('premier')) return 'Premier House';
    if (n.includes('agarwal')) return 'Agarwal Complex';
  }
  return 'Mercado';
}

export async function GET() {
  try {
    const clients = await prisma.clientMaster.findMany({
      orderBy: { srNo: 'asc' },
      include: {
        products: true,
        createdBy: {
          include: {
            assignedLocations: {
              include: { location: true }
            }
          }
        }
      }
    });

    const clientMap = new Map<string, any>();
    clients.forEach(c => {
      const k1 = (c.companyName || '').trim().toLowerCase();
      const k2 = k1.replace(/[^a-z0-9]/g, '');
      if (k1) clientMap.set(k1, c);
      if (k2) clientMap.set(k2, c);
    });

    const liveInvoices = await prisma.invoiceRecord.findMany({
      orderBy: { id: 'asc' },
      include: {
        clientMaster: {
          include: {
            products: true,
            createdBy: {
              include: {
                assignedLocations: {
                  include: { location: true }
                }
              }
            }
          }
        }
      }
    });

    const oldInvoices = await findOldInvoices({ includeLiveMonths: true });

    // Invoice Detailed List
    const invoiceRows: any[] = [];

    oldInvoices.forEach((inv: any) => {
      const rawComp = (inv.companyName || '').trim().toLowerCase();
      const cleanComp = rawComp.replace(/[^a-z0-9]/g, '');
      const client = clientMap.get(rawComp) || clientMap.get(cleanComp);

      let prod = 'Dedicated Cabin';
      if (client) {
        if (client.products && client.products.length > 0) {
          prod = normalizeProduct(client.products[0].cabinName, inv.remarks, inv.companyName);
        } else {
          prod = normalizeProduct(client.cabinName, inv.remarks, inv.companyName);
        }
      } else {
        prod = normalizeProduct(null, inv.remarks, inv.companyName);
      }

      const center = resolveCenter(client?.clientId, inv.locationName, client?.createdBy);
      const invAmt = Number(inv.amount || inv.receiveAmount || 0);
      const recAmt = Number(inv.receiveAmount || 0);
      const balAmt = Math.max(0, invAmt - recAmt);
      const status = recAmt >= invAmt && invAmt > 0 ? 'COMPLETED' : recAmt > 0 ? 'PARTIAL' : 'PENDING';
      const payDate = inv.payReceiveDate ? String(inv.payReceiveDate).split('T')[0] : (inv.utrDate ? String(inv.utrDate).split('T')[0] : '-');

      invoiceRows.push({
        type: 'Old Invoice',
        month: inv.month || '-',
        invoiceNo: inv.invoiceNo || '-',
        companyName: inv.companyName || '-',
        center,
        product: prod,
        invoicedAmount: invAmt,
        receivedAmount: recAmt,
        balanceAmount: balAmt,
        status,
        payDate,
        mode: inv.paymentMode || '-',
        utr: inv.utrNumber || '-',
        remarks: inv.remarks || '-'
      });
    });

    liveInvoices.forEach(inv => {
      const center = resolveCenter(inv.clientMaster?.clientId, null, inv.clientMaster?.createdBy);
      let items: any[] = [];
      if (inv.itemsJson) {
        try {
          const parsed = JSON.parse(inv.itemsJson);
          if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
        } catch (e) {}
      }

      const totalInvAmt = Number(inv.totalAmount || inv.amount || 0);
      const totalRecAmt = Number(inv.receiveAmount || 0);
      const payDate = inv.payReceiveDate ? inv.payReceiveDate.toISOString().split('T')[0] : (inv.utrDate ? inv.utrDate.toISOString().split('T')[0] : '-');

      if (items.length > 0) {
        items.forEach((item, idx) => {
          const prod = normalizeProduct(item.cabinName || item.productName || item.name, null, inv.clientMaster?.companyName);
          const itemInvAmt = Number(item.totalAmount || item.amount || 0);
          const ratio = totalInvAmt > 0 ? itemInvAmt / totalInvAmt : 1 / items.length;
          const itemRecAmt = Math.round(totalRecAmt * ratio);
          const itemBalAmt = Math.max(0, itemInvAmt - itemRecAmt);
          const status = itemRecAmt >= itemInvAmt && itemInvAmt > 0 ? 'COMPLETED' : itemRecAmt > 0 ? 'PARTIAL' : 'PENDING';

          invoiceRows.push({
            type: 'Live Invoice',
            month: inv.billingMonth || '-',
            invoiceNo: inv.digitallySignedPdfName ? (items.length > 1 ? `${inv.digitallySignedPdfName}-${idx + 1}` : inv.digitallySignedPdfName) : `INV-${inv.id}-${idx + 1}`,
            companyName: inv.clientMaster?.companyName || 'Unknown Client',
            center,
            product: prod,
            invoicedAmount: itemInvAmt,
            receivedAmount: itemRecAmt,
            balanceAmount: itemBalAmt,
            status,
            payDate,
            mode: inv.paymentMode || '-',
            utr: inv.utrNumber || '-',
            remarks: item.cabinName ? `${item.cabinName} (${item.noOfSeats || 1} seats)` : (inv.remarks || '-')
          });
        });
      } else {
        let prodName = inv.cabinName || inv.clientMaster?.cabinName;
        if (!prodName && inv.clientMaster?.products?.length) {
          prodName = inv.clientMaster.products[0].cabinName;
        }
        const prod = normalizeProduct(prodName, null, inv.clientMaster?.companyName);
        const balAmt = Math.max(0, totalInvAmt - totalRecAmt);
        const status = totalRecAmt >= totalInvAmt && totalInvAmt > 0 ? 'COMPLETED' : totalRecAmt > 0 ? 'PARTIAL' : 'PENDING';

        invoiceRows.push({
          type: 'Live Invoice',
          month: inv.billingMonth || '-',
          invoiceNo: inv.digitallySignedPdfName || `INV-${inv.id}`,
          companyName: inv.clientMaster?.companyName || 'Unknown Client',
          center,
          product: prod,
          invoicedAmount: totalInvAmt,
          receivedAmount: totalRecAmt,
          balanceAmount: balAmt,
          status,
          payDate,
          mode: inv.paymentMode || '-',
          utr: inv.utrNumber || '-',
          remarks: inv.remarks || '-'
        });
      }
    });

    // SDR Rows
    const sdrRows = clients.map(c => {
      const center = resolveCenter(c.clientId, null, c.createdBy);
      let product = c.cabinName || 'Dedicated Cabin';
      if (c.products && c.products.length > 0) {
        product = c.products.map(p => p.cabinName).filter(Boolean).join(', ');
      }
      const agreed = Number(c.sdrAmount || 0);
      const recd = Number(c.sdrReceivedAmount || 0);
      const bal = Math.max(0, agreed - recd);
      const status = c.sdrPaymentStatus || (recd >= agreed && agreed > 0 ? 'COMPLETED' : recd > 0 ? 'PARTIAL' : 'PENDING');
      const payDate = c.sdrRecdDate ? c.sdrRecdDate.toISOString().split('T')[0] : '-';

      return {
        srNo: c.srNo,
        companyName: c.companyName,
        clientId: c.clientId || '-',
        center,
        product,
        seats: c.noOfSeats || 0,
        agreed,
        recd,
        bal,
        status,
        payDate,
        mode: c.sdrPaymentMode || '-',
        utr: c.sdrUtrNumber || '-',
        bank: c.sdrBankName || '-',
        remarks: c.sdrRemarks || '-'
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      products: DROPDOWN_PRODUCTS,
      months: MONTHS,
      invoiceCount: invoiceRows.length,
      sdrCount: sdrRows.length,
      invoiceRows,
      sdrRows
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
