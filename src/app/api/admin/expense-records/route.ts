import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

const ACCOUNTANT_EMAIL = 'ssinfrazone21@gmail.com';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: {
        role: true,
        assignedLocations: {
          include: { location: true },
        },
      },
    });

    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/expense-records
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const userEmail = user.email.toLowerCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      userEmail === ACCOUNTANT_EMAIL ||
      user.name.toLowerCase() === 'accounts';

    const url = new URL(request.url);
    const locationIdParam = url.searchParams.get('locationId');
    const monthParam = url.searchParams.get('month'); // e.g. "2026-04" or "ALL"
    const yearParam = url.searchParams.get('year'); // e.g. "2026" or "ALL"
    const dateParam = url.searchParams.get('date'); // e.g. "2026-04-12"
    const fromDateParam = url.searchParams.get('fromDate'); // e.g. "2026-04-01"
    const toDateParam = url.searchParams.get('toDate'); // e.g. "2026-04-30"
    const categoryParam = url.searchParams.get('category');
    const paymentStatusParam = url.searchParams.get('paymentStatus'); // "ALL" | "PAID" | "PENDING"
    const approvalStatusParam = url.searchParams.get('approvalStatus'); // "ALL" | "PENDING" | "APPROVED" | "REJECTED"
    const searchParam = url.searchParams.get('search')?.trim() || '';

    // Determine accessible location IDs
    let allowedLocationIds: number[] = [];
    if (isSuperAdmin || isAccountant) {
      const allLocs = await prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { sortOrder: 'asc' },
      });
      allowedLocationIds = allLocs.map((l) => l.id);
    } else {
      allowedLocationIds = user.assignedLocations.map((al) => al.locationId);
    }

    // Build filter
    const where: any = {};

    // Location filter
    if (locationIdParam && locationIdParam !== 'ALL') {
      const locId = parseInt(locationIdParam, 10);
      if (allowedLocationIds.includes(locId)) {
        where.locationId = locId;
      } else {
        where.locationId = -999; // Not authorized for this location
      }
    } else {
      where.locationId = { in: allowedLocationIds };
    }

    // Category filter
    if (categoryParam && categoryParam !== 'ALL') {
      where.category = categoryParam;
    }

    // Payment status filter
    if (paymentStatusParam && paymentStatusParam !== 'ALL') {
      where.paymentStatus = paymentStatusParam;
    }

    // Approval status filter
    if (approvalStatusParam && approvalStatusParam !== 'ALL') {
      where.approvalStatus = approvalStatusParam;
    }

    // Search filter
    if (searchParam) {
      where.OR = [
        { description: { contains: searchParam } },
        { category: { contains: searchParam } },
        { remarks: { contains: searchParam } },
        { receiptNo: { contains: searchParam } },
        { vendorName: { contains: searchParam } },
        { accountNo: { contains: searchParam } },
        { utrNumber: { contains: searchParam } },
        { locationName: { contains: searchParam } },
      ];
    }

    // Fetch all records for aggregate & month calculations
    const allRecords = await (prisma as any).expenseRecord.findMany({
      where,
      orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    // Extract available distinct months & distinct years
    const monthCounts: Record<string, { count: number; total: number; label: string }> = {};
    const yearCounts: Record<string, { count: number; total: number }> = {};
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    for (const rec of allRecords) {
      const d = rec.expenseDate ? new Date(rec.expenseDate) : new Date();
      const yr = String(d.getUTCFullYear());
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
      const key = `${yr}-${mo}`;
      const label = `${monthNames[d.getUTCMonth()]} ${yr}`;

      if (!monthCounts[key]) {
        monthCounts[key] = { count: 0, total: 0, label };
      }
      monthCounts[key].count++;
      monthCounts[key].total += rec.amount || 0;

      if (!yearCounts[yr]) {
        yearCounts[yr] = { count: 0, total: 0 };
      }
      yearCounts[yr].count++;
      yearCounts[yr].total += rec.amount || 0;
    }

    const availableMonths = Object.keys(monthCounts)
      .sort()
      .reverse()
      .map((key) => ({
        value: key,
        label: monthCounts[key].label,
        count: monthCounts[key].count,
        total: Math.round(monthCounts[key].total * 100) / 100,
      }));

    const availableYears = Object.keys(yearCounts)
      .sort()
      .reverse()
      .map((y) => ({
        value: y,
        label: `Year ${y}`,
        count: yearCounts[y].count,
        total: Math.round(yearCounts[y].total * 100) / 100,
      }));

    // If month/year/date/range filters are applied, filter the records
    let filteredRecords = allRecords;

    if (monthParam && monthParam !== 'ALL') {
      filteredRecords = filteredRecords.filter((rec: any) => {
        const d = rec.expenseDate ? new Date(rec.expenseDate) : new Date();
        const yr = d.getUTCFullYear();
        const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
        return `${yr}-${mo}` === monthParam;
      });
    }

    if (yearParam && yearParam !== 'ALL') {
      filteredRecords = filteredRecords.filter((rec: any) => {
        const d = rec.expenseDate ? new Date(rec.expenseDate) : new Date();
        return String(d.getUTCFullYear()) === yearParam;
      });
    }

    if (dateParam && dateParam.trim()) {
      filteredRecords = filteredRecords.filter((rec: any) => {
        if (!rec.expenseDate) return false;
        const d = new Date(rec.expenseDate).toISOString().split('T')[0];
        return d === dateParam.trim();
      });
    }

    if (fromDateParam && fromDateParam.trim()) {
      filteredRecords = filteredRecords.filter((rec: any) => {
        if (!rec.expenseDate) return false;
        const d = new Date(rec.expenseDate).toISOString().split('T')[0];
        return d >= fromDateParam.trim();
      });
    }

    if (toDateParam && toDateParam.trim()) {
      filteredRecords = filteredRecords.filter((rec: any) => {
        if (!rec.expenseDate) return false;
        const d = new Date(rec.expenseDate).toISOString().split('T')[0];
        return d <= toDateParam.trim();
      });
    }

    // Summary calculations
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    for (const r of filteredRecords) {
      const amt = r.amount || 0;
      totalAmount += amt;
      if (r.paymentStatus === 'PAID') {
        paidAmount += amt;
      } else {
        pendingAmount += amt;
      }
    }

    // Distinct categories across all records
    const categoriesSet = new Set<string>();
    for (const r of allRecords) {
      if (r.category) categoriesSet.add(r.category);
    }
    const categories = Array.from(categoriesSet).sort();

    // Locations list
    const locations = await prisma.location.findMany({
      where: { id: { in: allowedLocationIds } },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      records: filteredRecords,
      totalCount: filteredRecords.length,
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        totalRecords: filteredRecords.length,
      },
      availableMonths,
      availableYears,
      categories,
      locations,
      userRole: isSuperAdmin ? 'SUPER_ADMIN' : isAccountant ? 'ACCOUNTANT' : 'COMMUNITY_MANAGER',
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORDS_GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch expense records' },
      { status: 500 }
    );
  }
}

// POST /api/admin/expense-records — Create new expense entry
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roleName = user.role?.name?.toUpperCase() || '';
    const userEmail = user.email.toLowerCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN';
    const isAccountant =
      roleName === 'ACCOUNTANT' ||
      roleName === 'ACCOUNTS' ||
      userEmail === ACCOUNTANT_EMAIL ||
      user.name.toLowerCase() === 'accounts';

    const body = await request.json();
    const {
      locationId,
      expenseDate,
      expenseDateStr,
      category,
      description,
      amount,
      paymentMode,
      receiptNo,
      attachmentUrl,
      remarks,
      vendorId,
      vendorName,
      // Vendor bill & quantity/rate
      accountNo,
      quantity,
      unit,
      rate,
      invoiceUrl,
      paymentProofUrl,
      uploadedInBankPortal,
      approvalStatus: customApprovalStatus,
      // Accountant fields
      payReceiveDate,
      receiveAmount,
      accPaymentMode,
      utrNumber,
      utrDate,
      utrFileUrl,
      tdsDeducted,
      tdsAmount,
      paymentStatus: customPaymentStatus,
    } = body;

    if (!locationId) {
      return NextResponse.json({ error: 'Please select a Center' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Expense description is required' }, { status: 400 });
    }

    const loc = await prisma.location.findUnique({
      where: { id: Number(locationId) },
      select: { id: true, name: true },
    });

    if (!loc) {
      return NextResponse.json({ error: 'Invalid center selected' }, { status: 400 });
    }

    let finalUtrDate = utrDate ? String(utrDate).trim() : null;
    if (payReceiveDate && !finalUtrDate) {
      finalUtrDate = payReceiveDate;
    }

    const isSettled = Boolean(utrNumber || payReceiveDate || (receiveAmount && receiveAmount > 0));
    const calculatedStatus = customPaymentStatus || (isSettled ? 'PAID' : 'PENDING');
    const calculatedApprovalStatus = customApprovalStatus || (isSettled ? 'APPROVED' : 'PENDING');

    const createdRecord = await (prisma as any).expenseRecord.create({
      data: {
        ...(loc?.id ? { location: { connect: { id: loc.id } } } : {}),
        locationName: loc.name,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        expenseDateStr: expenseDateStr || null,
        category: category ? category.trim().toUpperCase() : 'GENERAL EXPENSE',
        description: description.trim(),
        amount: parseFloat(String(amount || 0)) || 0,
        paymentMode: paymentMode && String(paymentMode).trim() ? String(paymentMode).trim() : null,
        receiptNo: receiptNo ? receiptNo.trim() : null,
        attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : null,
        remarks: remarks ? remarks.trim() : null,
        vendorId: vendorId ? Number(vendorId) : null,
        vendorName: vendorName ? vendorName.trim() : null,

        // Vendor Bill fields
        accountNo: accountNo ? accountNo.trim() : null,
        quantity: quantity !== undefined && quantity !== null ? parseFloat(String(quantity)) : 1,
        unit: unit && String(unit).trim() ? String(unit).trim() : 'Nos',
        rate: rate !== undefined && rate !== null ? parseFloat(String(rate)) : null,
        invoiceUrl: invoiceUrl ? String(invoiceUrl).trim() : null,
        paymentProofUrl: paymentProofUrl || null,
        uploadedInBankPortal: Boolean(uploadedInBankPortal),
        approvalStatus: calculatedApprovalStatus,

        // Accountant details
        payReceiveDate: payReceiveDate || null,
        receiveAmount: receiveAmount ? parseFloat(String(receiveAmount)) : null,
        accPaymentMode: accPaymentMode || null,
        utrNumber: utrNumber ? utrNumber.trim() : null,
        utrDate: finalUtrDate,
        utrFileUrl: utrFileUrl || null,
        tdsDeducted: tdsDeducted || 'No',
        tdsAmount: tdsAmount ? parseFloat(String(tdsAmount)) : null,
        paymentStatus: calculatedStatus,

        ...(user?.id ? { createdBy: { connect: { id: user.id } } } : {}),
        createdByName: user.name,
        createdByRole: isSuperAdmin ? 'ADMIN' : isAccountant ? 'ACCOUNTANT' : 'COMMUNITY_MANAGER',
      },
    });

    return NextResponse.json({
      success: true,
      data: createdRecord,
      message: 'Expense entry created successfully',
    });
  } catch (error: any) {
    console.error('[EXPENSE_RECORDS_POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create expense record' },
      { status: 500 }
    );
  }
}
