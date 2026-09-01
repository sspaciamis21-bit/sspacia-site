import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper: Safely parse numerical amounts (strictly ignores Excel formulas like =SUM(...) and non-numeric cell references)
function parseAmount(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      const num = val.toNumber();
      return isNaN(num) ? 0 : num;
    }
    if (typeof val.toString === 'function') {
      val = val.toString();
    }
  }
  if (typeof val !== 'string') return 0;
  const raw = val.trim();
  if (raw === '' || raw.startsWith('=')) return 0;
  const lower = raw.toLowerCase();
  if (
    lower.includes('sum') ||
    lower.includes('fx') ||
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('count') ||
    lower.includes('avg') ||
    lower.includes('average') ||
    lower.includes('yet not received') ||
    lower.includes('pending')
  ) {
    return 0;
  }
  const cleaned = raw.replace(/[₹$,\s]/g, '').replace(/^(rs|inr)\.?/i, '').trim();
  if (/^[-+]?[0-9]+(\.[0-9]+)?$/.test(cleaned)) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// Helper: Parse multi-format dates used in Center Expense Sheets
// Supported: "01 APR 2026", "1 AUG 2026", "10-08-2026", "16/04/2026", "2026-08-01", etc.
// Time set to noon (12:00:00) to prevent any UTC/IST timezone day-shift regressions.
function parseExpenseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim().toUpperCase();
  if (!clean) return null;

  const monthMap: Record<string, number> = {
    JAN: 0, JANU: 0, JANUARY: 0,
    FEB: 1, FEBR: 1, FEBRUARY: 1,
    MAR: 2, MARC: 2, MARCH: 2,
    APR: 3, APRI: 3, APRIL: 3,
    MAY: 4,
    JUN: 5, JUNE: 5,
    JUL: 6, JULY: 6,
    AUG: 7, AUGU: 7, AUGUST: 7,
    SEP: 8, SEPT: 8, SEPTEMBER: 8,
    OCT: 9, OCTO: 9, OCTOBER: 9,
    NOV: 10, NOVE: 10, NOVEMBER: 10,
    DEC: 11, DECE: 11, DECEMBER: 11,
  };

  // 1. Format: "2026-08-01" or "2026/08/01" (ISO YYYY-MM-DD)
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return new Date(y, m, d, 12, 0, 0);
  }

  // 2. Format: "01 APR 2026" or "1 AUG 2026" or "01-AUG-2026"
  const dmmmyyyy = clean.match(/^(\d{1,2})[\s\-]([A-Z]{3,9})[\s\-](\d{4})$/);
  if (dmmmyyyy) {
    const day = parseInt(dmmmyyyy[1], 10);
    const mStr = dmmmyyyy[2].slice(0, 3);
    const month = monthMap[mStr];
    const year = parseInt(dmmmyyyy[3], 10);
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // 3. Format: "10-08-2026" or "16/04/2026" (DD-MM-YYYY or DD/MM/YYYY)
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // 4. Fallback standard Date parsing
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime())
    ? null
    : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0);
}

// Helper: Format Date object to YYYY-MM-DD string using local date values (avoids UTC offset shifts)
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: Calculate month count between two dates
function getMonthsInRange(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth() + 1;
  return Math.max(1, years * 12 + months);
}

// GET /api/admin/financials — Executive Financial Analytics (Super Admin Only)
export async function GET(req: NextRequest) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: { select: { name: true } },
      },
    });

    const roleName = (dbUser?.role?.name || '').toLowerCase();
    const isSuperAdmin =
      roleName === 'admin' ||
      roleName === 'super_admin' ||
      roleName === 'super-admin' ||
      roleName === 'super admin';

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Financial Intelligence is restricted to Super Admin.' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const locationParam = url.searchParams.get('locationId') || 'ALL';
    const periodType = url.searchParams.get('periodType') || 'month'; // 'month' | 'quarter' | 'fy' | 'custom'
    const monthParam = url.searchParams.get('month'); // e.g. "2026-08" or "8"
    const yearParam = parseInt(url.searchParams.get('year') || '2026', 10);
    const quarterParam = url.searchParams.get('quarter') || 'Q2'; // Q1, Q2, Q3, Q4
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    // ── 1. Determine Date Filter Range ──
    let startDate: Date;
    let endDate: Date;

    if (periodType === 'month') {
      let m = 7; // 0-indexed (default August)
      let y = yearParam;
      if (monthParam) {
        if (monthParam.includes('-')) {
          const [yr, mo] = monthParam.split('-');
          y = parseInt(yr, 10);
          m = parseInt(mo, 10) - 1;
        } else {
          m = parseInt(monthParam, 10) - 1;
        }
      }
      startDate = new Date(y, m, 1, 0, 0, 0);
      endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (periodType === 'quarter') {
      // Indian Financial Quarters:
      // Q1: Apr - Jun
      // Q2: Jul - Sep
      // Q3: Oct - Dec
      // Q4: Jan - Mar (next year)
      if (quarterParam === 'Q1') {
        startDate = new Date(yearParam, 3, 1, 0, 0, 0);
        endDate = new Date(yearParam, 5 + 1, 0, 23, 59, 59, 999);
      } else if (quarterParam === 'Q2') {
        startDate = new Date(yearParam, 6, 1, 0, 0, 0);
        endDate = new Date(yearParam, 8 + 1, 0, 23, 59, 59, 999);
      } else if (quarterParam === 'Q3') {
        startDate = new Date(yearParam, 9, 1, 0, 0, 0);
        endDate = new Date(yearParam, 11 + 1, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(yearParam + 1, 0, 1, 0, 0, 0);
        endDate = new Date(yearParam + 1, 2 + 1, 0, 23, 59, 59, 999);
      }
    } else if (periodType === 'fy') {
      // Indian Financial Year: April 1 to March 31
      startDate = new Date(yearParam, 3, 1, 0, 0, 0);
      endDate = new Date(yearParam + 1, 2 + 1, 0, 23, 59, 59, 999);
    } else if (periodType === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: August 2026
      startDate = new Date(2026, 7, 1, 0, 0, 0);
      endDate = new Date(2026, 7 + 1, 0, 23, 59, 59, 999);
    }

    const monthsCount = getMonthsInRange(startDate, endDate);

    // ── 2. Fetch All Centre Locations ──
    const locations = await prisma.location.findMany({
      select: { id: true, name: true, slug: true, area: true },
      orderBy: { id: 'asc' },
    });

    const targetLocationIds =
      locationParam === 'ALL'
        ? locations.map((l) => l.id)
        : [parseInt(locationParam, 10)].filter((id) => !isNaN(id));

    // ── 3. Query & Parse Operational Expenses from Center Expense Sheets ──
    const expenseSheets = await prisma.locationExpenseSheet.findMany({
      where: {
        ...(locationParam !== 'ALL' && targetLocationIds.length > 0
          ? { locationId: { in: targetLocationIds } }
          : {}),
      },
      select: {
        locationId: true,
        title: true,
        rows: true,
        columns: true,
      },
    });

    const expensesByLocation: Record<number, number> = {};
    const expenseCategoryMap: Record<string, number> = {};
    const itemizedExpenseList: any[] = [];

    locations.forEach((loc) => {
      expensesByLocation[loc.id] = 0;
    });

    expenseSheets.forEach((sheet) => {
      const locId = sheet.locationId;
      const rawRows = typeof sheet.rows === 'string' ? JSON.parse(sheet.rows) : sheet.rows;
      if (!Array.isArray(rawRows)) return;

      rawRows.forEach((row: any, rIdx: number) => {
        // Skip empty or summary rows
        const desc = (row.col_2 || row.col_3 || '').toString().toLowerCase();
        if (desc.includes('total') || desc.includes('subtotal') || desc.includes('fx')) return;

        // Extract and parse Amount
        const amt = parseAmount(row.col_4 || row.col_3 || row.acc_receive_amount);
        if (amt <= 0) return;

        // Parse Date
        const rowDateStr = (row.col_1 || row.acc_pay_receive_date || '').toString();
        const parsedDate = parseExpenseDate(rowDateStr);

        // Date Range Validation: row must have a valid date within chosen period
        if (!parsedDate || parsedDate < startDate || parsedDate > endDate) {
          return; // Row falls outside chosen period or has no date
        }

        // Add to location total
        expensesByLocation[locId] = (expensesByLocation[locId] || 0) + amt;

        // Category breakdown
        let cat = (row.col_3 || row.col_2 || 'General Operations').toString().trim().toUpperCase();
        if (cat.includes('UTILIT')) cat = 'Utilities (Power, Net, Water)';
        else if (cat.includes('MAINTAIN') || cat.includes('REPAIR')) cat = 'Maintenance & Repairs';
        else if (cat.includes('VOUCHER') || cat.includes('PANTRY') || cat.includes('GINGER') || cat.includes('MILK')) cat = 'Pantry & Daily Vouchers';
        else if (cat.includes('LEGAL') || cat.includes('NOTARY')) cat = 'Legal & Compliance';
        else if (cat.includes('RENT') || cat.includes('LEASE')) cat = 'Rent & Property Lease';
        else if (cat === '' || cat === 'TOTAL') cat = 'General Operations';

        expenseCategoryMap[cat] = (expenseCategoryMap[cat] || 0) + amt;

        const locName = locations.find((l) => l.id === locId)?.name || `Center #${locId}`;
        // Ensure globally unique ID for each expense row
        const uniqueRowId = `loc_${locId}_row_${row.id || rIdx}_${itemizedExpenseList.length}`;

        itemizedExpenseList.push({
          id: uniqueRowId,
          locationId: locId,
          locationName: locName,
          date: formatLocalDate(parsedDate),
          description: row.col_2 || row.col_3 || 'Operational Expense',
          category: cat,
          amount: amt,
          paymentMode: row.col_5 || row.acc_payment_mode || 'Cash/Online',
          receipt: row.col_6 || row.col_7 || row.col_1787121035549 || '',
        });
      });
    });

    // ── 4. Query & Aggregate Revenue Streams ──
    const revenueByLocation: Record<number, number> = {};
    const revenueCategoryMap: Record<string, number> = {
      'Client Agreements & Cabins': 0,
      'Guest Spaces & Meeting Rooms': 0,
      'QR Day Pass Check-ins': 0,
    };

    locations.forEach((loc) => {
      revenueByLocation[loc.id] = 0;
    });

    // A. Client Master Monthly Agreements
    const allClients = await prisma.clientMaster.findMany({
      where: {
        clientStatus: { not: 'Terminated' },
      },
      select: {
        id: true,
        companyName: true,
        clientId: true,
        cabinName: true,
        amount: true,
        totalAmount: true,
        agreementStartDate: true,
        agreementEndDate: true,
      },
    });

    let clientAgreementCount = 0;

    allClients.forEach((client) => {
      const cid = (client.clientId || '').toUpperCase();
      const cabin = (client.cabinName || '').toUpperCase();

      // Map Client to Centre
      let clientLocId = 2; // Default Mercado
      if (cid.includes('SGP') || cid.includes('/PH/') || cid.includes('PREMIER') || cabin.includes('PREMIER')) {
        clientLocId = 3; // Premier House
      } else if (cid.includes('CGA') || cid.includes('AGARWAL') || cid.includes('AGC') || cabin.includes('AGARWAL')) {
        clientLocId = 1; // Agarwal Complex
      } else {
        clientLocId = 2; // Mercado
      }

      // Check if location is in target filter
      if (locationParam !== 'ALL' && !targetLocationIds.includes(clientLocId)) {
        return;
      }

      // Check agreement active dates
      const start = client.agreementStartDate ? new Date(client.agreementStartDate) : null;
      const end = client.agreementEndDate ? new Date(client.agreementEndDate) : null;

      if (start && start > endDate) return;
      if (end && end < startDate) return;

      const monthlyVal = parseAmount(client.amount || client.totalAmount);
      if (monthlyVal > 0) {
        const totalVal = monthlyVal * monthsCount;
        revenueByLocation[clientLocId] = (revenueByLocation[clientLocId] || 0) + totalVal;
        revenueCategoryMap['Client Agreements & Cabins'] += totalVal;
        clientAgreementCount++;
      }
    });

    // B. Online Bookings (Meeting Rooms, Board Rooms, Event Spaces)
    const bookings = await prisma.booking.findMany({
      where: {
        ...(locationParam !== 'ALL' && targetLocationIds.length > 0
          ? { product: { locationId: { in: targetLocationIds } } }
          : {}),
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { createdAt: { gte: startDate, lte: endDate } },
        ],
      },
      select: {
        id: true,
        grandTotal: true,
        totalAmount: true,
        startDate: true,
        product: {
          select: {
            id: true,
            name: true,
            locationId: true,
            location: { select: { name: true } },
            category: { select: { name: true, displayName: true } },
          },
        },
        payments: {
          where: { status: { name: 'PAID' } },
          select: { amount: true },
        },
      },
    });

    bookings.forEach((b) => {
      const locId = b.product?.locationId || 1;
      const paidAmt = b.payments.reduce((acc, p) => acc + parseAmount(p.amount), 0);
      const amt = paidAmt > 0 ? paidAmt : parseAmount(b.grandTotal || b.totalAmount);
      if (amt > 0) {
        revenueByLocation[locId] = (revenueByLocation[locId] || 0) + amt;
        revenueCategoryMap['Guest Spaces & Meeting Rooms'] += amt;
      }
    });

    // C. QR Bookings (Day Passes & Walk-ins)
    const qrBookings = await prisma.qrBooking.findMany({
      where: {
        status: { in: ['APPROVED', 'CONFIRMED', 'PENDING'] },
        ...(locationParam !== 'ALL' && targetLocationIds.length > 0
          ? { locationId: { in: targetLocationIds } }
          : {}),
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        grandTotal: true,
        locationId: true,
        locationName: true,
        createdAt: true,
        productName: true,
      },
    });

    qrBookings.forEach((qr) => {
      const locId = qr.locationId || 1;
      const amt = parseAmount(qr.grandTotal);
      if (amt > 0) {
        revenueByLocation[locId] = (revenueByLocation[locId] || 0) + amt;
        revenueCategoryMap['QR Day Pass Check-ins'] += amt;
      }
    });

    // D. Invoices Telemetry (Invoices Raised, Payment Received, Balance Pending)
    // Build Client ID to Location ID mapping
    const clientLocationMap: Record<number, number> = {};
    allClients.forEach((client) => {
      const cid = (client.clientId || '').toUpperCase();
      const cabin = (client.cabinName || '').toUpperCase();
      let locId = 2; // Default Mercado
      if (cid.includes('SGP') || cid.includes('/PH/') || cid.includes('PREMIER') || cabin.includes('PREMIER')) {
        locId = 3; // Premier House
      } else if (cid.includes('CGA') || cid.includes('AGARWAL') || cid.includes('AGC') || cabin.includes('AGARWAL')) {
        locId = 1; // Agarwal Complex
      }
      clientLocationMap[client.id] = locId;
    });

    const itemizedInvoiceList: any[] = [];
    let invoicesRaised = 0;
    let paymentReceived = 0;
    let invoiceCount = 0;

    try {
      const allInvoices = await (prisma as any).invoiceRecord.findMany({
        select: {
          id: true,
          srNo: true,
          clientMasterId: true,
          companyName: true,
          cabinName: true,
          totalAmount: true,
          amount: true,
          gstPercent: true,
          status: true,
          billingMonth: true,
          dueDate: true,
          createdAt: true,
          sentAt: true,
        },
      });

      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const shortMonthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

      allInvoices.forEach((inv: any) => {
        const invLocId = clientLocationMap[inv.clientMasterId] || 2;
        if (locationParam !== 'ALL' && !targetLocationIds.includes(invLocId)) {
          return;
        }

        const bMonth = (inv.billingMonth || '').toLowerCase().trim();
        let matchesPeriod = false;

        if (periodType === 'month') {
          const mIdx = startDate.getMonth();
          const yVal = startDate.getFullYear();
          const targetFull = `${monthNames[mIdx]} ${yVal}`;
          const targetShort = `${shortMonthNames[mIdx]} ${yVal}`;
          const targetIso = `${yVal}-${String(mIdx + 1).padStart(2, '0')}`;

          if (
            bMonth.includes(targetFull) ||
            bMonth.includes(targetShort) ||
            bMonth.includes(targetIso) ||
            (bMonth.includes(shortMonthNames[mIdx]) && bMonth.includes(String(yVal)))
          ) {
            matchesPeriod = true;
          }
        } else if (periodType === 'quarter' || periodType === 'fy' || periodType === 'custom') {
          const invDate = inv.sentAt || inv.createdAt;
          if (invDate && new Date(invDate) >= startDate && new Date(invDate) <= endDate) {
            matchesPeriod = true;
          } else {
            let cur = new Date(startDate);
            while (cur <= endDate) {
              const curM = shortMonthNames[cur.getMonth()];
              const curY = cur.getFullYear();
              if (bMonth.includes(curM) && bMonth.includes(String(curY))) {
                matchesPeriod = true;
                break;
              }
              cur.setMonth(cur.getMonth() + 1);
            }
          }
        }

        if (matchesPeriod) {
          const totalAmt = parseAmount(inv.totalAmount || inv.amount || 0);
          const taxableAmt = parseAmount(inv.amount || totalAmt);
          invoicesRaised += totalAmt;
          invoiceCount++;
          const isApproved = inv.status === 'APPROVED' || inv.status === 'CONFIRMED' || inv.status === 'PAID';
          if (isApproved) {
            paymentReceived += totalAmt;
          }
          const locName = locations.find((l) => l.id === invLocId)?.name || `Centre #${invLocId}`;

          itemizedInvoiceList.push({
            id: inv.id,
            srNo: inv.srNo || inv.id,
            clientMasterId: inv.clientMasterId,
            companyName: inv.companyName || 'Client Company',
            cabinName: inv.cabinName || 'Workspace',
            locationId: invLocId,
            locationName: locName,
            taxableAmount: taxableAmt,
            gstPercent: parseAmount(inv.gstPercent || 18),
            totalAmount: totalAmt,
            status: inv.status || 'PENDING_CM_REVIEW',
            billingMonth: inv.billingMonth || 'August 2026',
            dueDate: inv.dueDate ? formatLocalDate(new Date(inv.dueDate)) : null,
            createdAt: inv.createdAt ? formatLocalDate(new Date(inv.createdAt)) : null,
            isApproved,
          });
        }
      });
    } catch (e) {
      console.warn('Invoice telemetry query warning:', e);
    }

    const balancePayment = Math.max(0, invoicesRaised - paymentReceived);

    // ── 5. Calculate Grand Totals & Gross Profit ──
    let totalRevenue = 0;
    let totalExpenses = 0;

    targetLocationIds.forEach((locId) => {
      totalRevenue += revenueByLocation[locId] || 0;
      totalExpenses += expensesByLocation[locId] || 0;
    });

    // Core Formula: Gross Profit = Revenue - Expenses
    const grossProfit = totalRevenue - totalExpenses;
    const grossProfitMargin =
      totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    // ── 6. Build Centre Comparison Matrix ──
    const centreComparison = locations
      .filter((loc) => locationParam === 'ALL' || targetLocationIds.includes(loc.id))
      .map((loc) => {
        const rev = revenueByLocation[loc.id] || 0;
        const exp = expensesByLocation[loc.id] || 0;
        const profit = rev - exp;
        const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0';

        return {
          locationId: loc.id,
          locationName: loc.name,
          area: loc.area || '',
          revenue: rev,
          expenses: exp,
          grossProfit: profit,
          grossMarginPercent: parseFloat(margin),
          isProfitable: profit >= 0,
        };
      });

    return NextResponse.json({
      success: true,
      period: {
        type: periodType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        monthsCount,
        year: yearParam,
        month: monthParam,
        quarter: quarterParam,
      },
      selectedLocationId: locationParam,
      kpi: {
        totalRevenue,
        invoicesRaised: invoicesRaised > 0 ? invoicesRaised : totalRevenue,
        paymentReceived,
        balancePayment,
        totalExpenses,
        grossProfit,
        grossProfitMargin: parseFloat(grossProfitMargin),
        isProfitable: grossProfit >= 0,
        transactionCount: invoiceCount > 0 ? invoiceCount : clientAgreementCount + bookings.length + qrBookings.length,
        expenseCount: itemizedExpenseList.length,
      },
      centreComparison,
      revenueBreakdown: Object.entries(revenueCategoryMap).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0.0',
      })),
      expenseBreakdown: Object.entries(expenseCategoryMap)
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0',
        })),
      recentExpenses: itemizedExpenseList.slice().reverse(),
      recentInvoices: itemizedInvoiceList,
    });
  } catch (error: any) {
    console.error('[API Financials Error]:', error);
    return NextResponse.json(
      { error: 'Internal server error processing financial calculations' },
      { status: 500 }
    );
  }
}
