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
    const dateTargetParam = (url.searchParams.get('dateTarget') || 'EXPENSE_DATE').toUpperCase(); // 'EXPENSE_DATE' | 'PAYMENT_DATE' | 'BOTH_MATCH'
    const monthParam = url.searchParams.get('month'); // e.g. "2026-04" or "ALL"
    const yearParam = url.searchParams.get('year'); // e.g. "2026" or "ALL"
    const dateParam = url.searchParams.get('date'); // e.g. "2026-04-12"
    const fromDateParam = url.searchParams.get('fromDate'); // e.g. "2026-04-01"
    const toDateParam = url.searchParams.get('toDate'); // e.g. "2026-04-30"

    // Dedicated match params (selection of expense date AND payment date)
    const expenseDateParam = url.searchParams.get('expenseDate')?.trim() || '';
    const paymentDateParam = url.searchParams.get('paymentDate')?.trim() || '';
    const matchSameDayParam = url.searchParams.get('matchSameDay') === 'true';

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
      if (approvalStatusParam === 'PENDING') {
        where.approvalStatus = {
          in: ['PENDING_ACCOUNTANT_APPROVAL', 'PENDING_SUPER_ADMIN_APPROVAL', 'PENDING', 'PENDING_APPROVAL'],
        };
      } else if (approvalStatusParam === 'REJECTED') {
        where.approvalStatus = {
          in: ['REJECTED_BY_ACCOUNTANT', 'REJECTED_BY_SUPER_ADMIN', 'REJECTED'],
        };
      } else {
        where.approvalStatus = approvalStatusParam;
      }
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

    // Helper to safely parse dates to YYYY-MM-DD
    function parseToYMD(raw: any): string | null {
      if (!raw) return null;
      if (raw instanceof Date) {
        if (isNaN(raw.getTime())) return null;
        return raw.toISOString().split('T')[0];
      }
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s) return null;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
          return s.substring(0, 10);
        }
        const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (ddmmyyyy) {
          return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      }
      return null;
    }

    const getRecordExpenseYMD = (rec: any): string | null => parseToYMD(rec.expenseDate);
    const getRecordPaymentYMD = (rec: any): string | null => parseToYMD(rec.utrDate || rec.payReceiveDate);

    // Extract available distinct months & distinct years for both Expense Date and Payment Date
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const buildMonthYearCounts = (dateGetter: (rec: any) => string | null) => {
      const monthCounts: Record<string, { count: number; total: number; label: string }> = {};
      const yearCounts: Record<string, { count: number; total: number }> = {};

      for (const rec of allRecords) {
        const ymd = dateGetter(rec);
        if (!ymd) continue;
        const [yr, mo] = ymd.split('-');
        if (!yr || !mo) continue;
        const moIdx = parseInt(mo, 10) - 1;
        const key = `${yr}-${mo}`;
        const label = `${monthNames[moIdx] || mo} ${yr}`;

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

      return { availableMonths, availableYears };
    };

    const expenseMonthYear = buildMonthYearCounts(getRecordExpenseYMD);
    const paymentMonthYear = buildMonthYearCounts(getRecordPaymentYMD);

    const availableMonths = dateTargetParam === 'PAYMENT_DATE' ? paymentMonthYear.availableMonths : expenseMonthYear.availableMonths;
    const availableYears = dateTargetParam === 'PAYMENT_DATE' ? paymentMonthYear.availableYears : expenseMonthYear.availableYears;

    // Filter records according to date filter and target
    let filteredRecords = allRecords;

    if (dateTargetParam === 'BOTH_MATCH' || expenseDateParam || paymentDateParam || matchSameDayParam) {
      if (expenseDateParam) {
        filteredRecords = filteredRecords.filter((rec: any) => getRecordExpenseYMD(rec) === expenseDateParam);
      }
      if (paymentDateParam) {
        filteredRecords = filteredRecords.filter((rec: any) => getRecordPaymentYMD(rec) === paymentDateParam);
      }
      if (matchSameDayParam) {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const expYMD = getRecordExpenseYMD(rec);
          const payYMD = getRecordPaymentYMD(rec);
          return expYMD !== null && payYMD !== null && expYMD === payYMD;
        });
      }
    } else {
      const targetDateGetter = dateTargetParam === 'PAYMENT_DATE' ? getRecordPaymentYMD : getRecordExpenseYMD;

      if (monthParam && monthParam !== 'ALL') {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const ymd = targetDateGetter(rec);
          return ymd ? ymd.startsWith(monthParam) : false;
        });
      }

      if (yearParam && yearParam !== 'ALL') {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const ymd = targetDateGetter(rec);
          return ymd ? ymd.startsWith(yearParam) : false;
        });
      }

      if (dateParam && dateParam.trim()) {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const ymd = targetDateGetter(rec);
          return ymd ? ymd === dateParam.trim() : false;
        });
      }

      if (fromDateParam && fromDateParam.trim()) {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const ymd = targetDateGetter(rec);
          return ymd ? ymd >= fromDateParam.trim() : false;
        });
      }

      if (toDateParam && toDateParam.trim()) {
        filteredRecords = filteredRecords.filter((rec: any) => {
          const ymd = targetDateGetter(rec);
          return ymd ? ymd <= toDateParam.trim() : false;
        });
      }
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
      availableExpenseMonths: expenseMonthYear.availableMonths,
      availablePaymentMonths: paymentMonthYear.availableMonths,
      availableExpenseYears: expenseMonthYear.availableYears,
      availablePaymentYears: paymentMonthYear.availableYears,
      dateTarget: dateTargetParam,
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
      vendorInvoiceUrl,
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

    let calculatedApprovalStatus = 'PENDING_ACCOUNTANT_APPROVAL';
    let initialAccApprovalStatus = 'PENDING';
    let initialAdminApprovalStatus = 'PENDING';
    let initialApprovedById: number | null = null;
    let initialApprovedByName: string | null = null;
    let initialApprovedAt: Date | null = null;
    let accApprovedById: number | null = null;
    let accApprovedByName: string | null = null;
    let accApprovedAt: Date | null = null;

    if (isSuperAdmin) {
      calculatedApprovalStatus = customApprovalStatus || 'APPROVED';
      initialAccApprovalStatus = 'APPROVED';
      initialAdminApprovalStatus = 'APPROVED';
      initialApprovedById = user.id;
      initialApprovedByName = user.name;
      initialApprovedAt = new Date();
    } else if (isAccountant) {
      // Accountant enters expense -> straight to Super Admin for approval
      calculatedApprovalStatus = 'PENDING_SUPER_ADMIN_APPROVAL';
      initialAccApprovalStatus = 'APPROVED';
      accApprovedById = user.id;
      accApprovedByName = user.name;
      accApprovedAt = new Date();
      initialAdminApprovalStatus = 'PENDING';
    } else {
      // CM enters expense -> starts at Accountant validation
      calculatedApprovalStatus = 'PENDING_ACCOUNTANT_APPROVAL';
      initialAccApprovalStatus = 'PENDING';
      initialAdminApprovalStatus = 'PENDING';
    }

    const isSettled = isSuperAdmin && Boolean(utrNumber || payReceiveDate || (receiveAmount && receiveAmount > 0));
    const calculatedStatus = customPaymentStatus || (isSettled ? 'PAID' : 'PENDING');

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
        vendorInvoiceUrl: vendorInvoiceUrl ? String(vendorInvoiceUrl).trim() : null,
        paymentProofUrl: paymentProofUrl || null,
        uploadedInBankPortal: Boolean(uploadedInBankPortal),

        // Multi-tier Approval fields
        approvalStatus: calculatedApprovalStatus,
        accountantApprovalStatus: initialAccApprovalStatus,
        accountantApprovedById: accApprovedById,
        accountantApprovedByName: accApprovedByName,
        accountantApprovedAt: accApprovedAt,
        superAdminApprovalStatus: initialAdminApprovalStatus,
        approvedById: initialApprovedById,
        approvedByName: initialApprovedByName,
        approvedAt: initialApprovedAt,

        // Accountant details (only settable if superadmin or already approved)
        payReceiveDate: isSuperAdmin ? (payReceiveDate || null) : null,
        receiveAmount: isSuperAdmin && receiveAmount ? parseFloat(String(receiveAmount)) : null,
        accPaymentMode: isSuperAdmin ? (accPaymentMode || null) : null,
        utrNumber: isSuperAdmin && utrNumber ? utrNumber.trim() : null,
        utrDate: isSuperAdmin ? finalUtrDate : null,
        utrFileUrl: isSuperAdmin ? (utrFileUrl || null) : null,
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
