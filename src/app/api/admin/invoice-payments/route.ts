import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds, getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';

export const dynamic = 'force-dynamic';

const normalizeBillingMonth = (monthStr: string | null | undefined): string => {
  if (!monthStr) return '';
  const trimmed = monthStr.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return trimmed;
  const m = parts[0].toLowerCase();
  const year = parts[1];
  const map: Record<string, string> = {
    jan: 'January', january: 'January',
    feb: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December',
  };
  const standardMonth = map[m] || (parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase());
  return `${standardMonth} ${year}`;
};

// GET /api/admin/invoice-payments — Fetch only APPROVED live invoices for payment settlement management
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let currentUserRole = '';
    let isSuperAdmin = false;
    let isAccountant = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        const role = String(payload.role || '').toUpperCase().replace(/[\s_-]/g, '');
        currentUserRole = role;

        const dbUser = await (prisma as any).user.findUnique({
          where: { id: currentUserId },
          select: {
            name: true,
            email: true,
            role: { select: { name: true } },
          },
        });

        if (dbUser) {
          const roleName = (dbUser.role?.name || '').toUpperCase().replace(/[\s_-]/g, '');
          isSuperAdmin = roleName === 'ADMIN' || roleName === 'SUPERADMIN';
          isAccountant =
            (dbUser.email || '').toLowerCase() === 'ssinfrazone21@gmail.com' ||
            (dbUser.name || '').toLowerCase() === 'accounts' ||
            roleName === 'ACCOUNTS' ||
            roleName === 'ACCOUNTANT';
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const billingMonth = searchParams.get('billingMonth');
    const locationId = searchParams.get('locationId');
    const paymentStatus = searchParams.get('paymentStatus'); // 'ALL' | 'PENDING' | 'RECEIVED' | 'PARTIAL'

    // Only APPROVED invoices should generate entries in Payment Management
    const where: any = {
      status: 'APPROVED',
    };

    // Node-based data isolation
    if (currentUserId && !isSuperAdmin && !isAccountant) {
      if (locationId && locationId !== 'ALL') {
        const locationUserIds = await getUserIdsByLocation(parseInt(locationId, 10));
        if (locationUserIds) {
          where.createdById = { in: locationUserIds };
        }
      } else {
        const scopedUserIds = await getNodeScopedUserIds(currentUserId);
        if (scopedUserIds !== null) {
          where.createdById = { in: scopedUserIds };
        }
      }
    } else if (locationId && locationId !== 'ALL') {
      const locationUserIds = await getUserIdsByLocation(parseInt(locationId, 10));
      if (locationUserIds) {
        where.createdById = { in: locationUserIds };
      }
    }

    const invoices = await (prisma as any).invoiceRecord.findMany({
      where,
      include: {
        clientMaster: {
          include: {
            contactPersons: { orderBy: { sortOrder: 'asc' } },
            products: { orderBy: { sortOrder: 'asc' } },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            assignedLocations: {
              select: {
                location: { select: { id: true, name: true } },
              },
            },
          },
        },
        attachedInvoice: true,
      },
      orderBy: [
        { paymentDueDay: 'asc' },
        { sentAt: 'desc' },
      ],
    });

    // Extract available billing months from approved invoices
    const monthSet = new Set<string>();
    invoices.forEach((inv: any) => {
      if (inv.billingMonth) {
        const norm = normalizeBillingMonth(inv.billingMonth);
        if (norm) monthSet.add(norm);
      }
    });

    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    monthSet.add(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    monthSet.add(`${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`);

    const availableBillingMonths = Array.from(monthSet).sort((a, b) => {
      const da = new Date(`1 ${a}`);
      const db = new Date(`1 ${b}`);
      return db.getTime() - da.getTime();
    });

    // Transform and enrich approved invoice records
    let transformed = invoices.map((inv: any) => {
      const locName =
        inv.createdBy?.assignedLocations?.[0]?.location?.name ||
        inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.name ||
        'Mercado';

      const locId =
        inv.createdBy?.assignedLocations?.[0]?.location?.id ||
        inv.clientMaster?.createdBy?.assignedLocations?.[0]?.location?.id ||
        null;

      const totalAmt = Number(inv.totalAmount || inv.amount || 0);
      const recAmt = Number(inv.receiveAmount || 0);

      // Determine computed payment status
      let compStatus = inv.paymentStatus || 'PENDING';
      if (!inv.paymentStatus || inv.paymentStatus === 'PENDING') {
        if (recAmt >= totalAmt && totalAmt > 0) {
          compStatus = 'RECEIVED';
        } else if (recAmt > 0 && recAmt < totalAmt) {
          compStatus = 'PARTIAL';
        } else if (inv.utrNumber && String(inv.utrNumber).trim() !== '') {
          compStatus = 'RECEIVED';
        }
      }

      // Check for attached PDF (direct or splits)
      let pdfUrl = inv.digitallySignedPdfUrl || inv.attachedInvoice?.fileUrl || null;
      let pdfName = inv.digitallySignedPdfName || inv.attachedInvoice?.fileName || null;

      let splitParts: any[] = [];
      if (inv.splitsJson) {
        try {
          splitParts = JSON.parse(inv.splitsJson);
        } catch {}
      }

      return {
        id: inv.id,
        srNo: inv.srNo,
        clientMasterId: inv.clientMasterId,
        companyName: inv.companyName || inv.clientMaster?.companyName || 'Valued Client',
        cabinName: inv.cabinName || inv.clientMaster?.cabinName || null,
        noOfSeats: inv.noOfSeats || inv.clientMaster?.noOfSeats || null,
        ratePerAgreement: Number(inv.ratePerAgreement || 0),
        amount: Number(inv.amount || 0),
        gstPercent: Number(inv.gstPercent || 18),
        totalAmount: totalAmt,
        gstNo: inv.gstNo || inv.clientMaster?.gstNo || null,
        billingMonth: normalizeBillingMonth(inv.billingMonth) || inv.billingMonth,
        status: inv.status,
        remarks: inv.remarks || null,
        dueDate: inv.dueDate,
        paymentDueDay: inv.paymentDueDay || inv.clientMaster?.paymentDueDay || 7,
        locationId: locId,
        locationName: locName,
        attachedPdfUrl: pdfUrl,
        attachedPdfName: pdfName,
        splitParts,
        hasSplits: splitParts.length > 1,
        // Payment Settlement Details
        payReceiveDate: inv.payReceiveDate,
        receiveAmount: recAmt,
        paymentMode: inv.paymentMode || null,
        utrNumber: inv.utrNumber || null,
        utrDate: inv.utrDate || null,
        utrFileUrl: inv.utrFileUrl || null,
        utrFileName: inv.utrFileName || null,
        tdsDeducted: inv.tdsDeducted || 'No',
        tdsAmount: Number(inv.tdsAmount || 0),
        paymentsJson: inv.paymentsJson || null,
        paymentStatus: compStatus,
        balanceAmount: Math.max(0, totalAmt - recAmt),
        clientContacts: inv.clientMaster?.contactPersons || [],
        createdBy: inv.createdBy,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      };
    });

    // Apply Client-Side filters
    if (billingMonth && billingMonth !== 'ALL') {
      const targetNorm = normalizeBillingMonth(billingMonth);
      transformed = transformed.filter((inv: any) => normalizeBillingMonth(inv.billingMonth) === targetNorm);
    }

    if (search) {
      const q = search.toLowerCase();
      transformed = transformed.filter(
        (inv: any) =>
          inv.companyName.toLowerCase().includes(q) ||
          (inv.cabinName && inv.cabinName.toLowerCase().includes(q)) ||
          (inv.gstNo && inv.gstNo.toLowerCase().includes(q)) ||
          (inv.locationName && inv.locationName.toLowerCase().includes(q)) ||
          (inv.utrNumber && inv.utrNumber.toLowerCase().includes(q)) ||
          (inv.remarks && inv.remarks.toLowerCase().includes(q))
      );
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      if (paymentStatus === 'BALANCE_PENDING') {
        transformed = transformed.filter((inv: any) => inv.balanceAmount > 0 || inv.paymentStatus !== 'RECEIVED');
      } else {
        transformed = transformed.filter((inv: any) => inv.paymentStatus === paymentStatus);
      }
    }


    // Summary Analytics
    const totalApprovedCount = transformed.length;
    const totalInvoicedSum = transformed.reduce((acc: number, inv: any) => acc + inv.totalAmount, 0);
    const totalPaymentReceivedSum = transformed.reduce((acc: number, inv: any) => acc + inv.receiveAmount, 0);
    const totalPaymentPendingSum = Math.max(0, totalInvoicedSum - totalPaymentReceivedSum);
    const paymentReceivedCount = transformed.filter((inv: any) => inv.paymentStatus === 'RECEIVED').length;
    const paymentPendingCount = transformed.filter((inv: any) => inv.paymentStatus === 'PENDING' || inv.paymentStatus === 'PARTIAL').length;

    return NextResponse.json({
      success: true,
      data: transformed,
      availableBillingMonths,
      summary: {
        totalApprovedCount,
        totalInvoicedSum,
        totalPaymentReceivedSum,
        totalPaymentPendingSum,
        paymentReceivedCount,
        paymentPendingCount,
      },
    });
  } catch (error) {
    console.error('[INVOICE_PAYMENTS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch invoice payments' }, { status: 500 });
  }
}
