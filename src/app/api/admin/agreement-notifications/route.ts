import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds } from '@/lib/auth/getNodeScopedUserIds';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let currentUserId: number | null = null;
    let userRole: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        currentUserId = Number(payload.id);
        userRole = payload.role ? String(payload.role).toUpperCase() : null;
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { email: true, role: { select: { name: true } } },
    });

    const isAccountant =
      currentUser?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
      currentUser?.role?.name?.toUpperCase() === 'ACCOUNTS' ||
      currentUser?.role?.name?.toUpperCase() === 'ACCOUNTANT';

    // Node-scoped user IDs filter for Community Managers / Admins
    const scopedUserIds = isAccountant ? null : await getNodeScopedUserIds(currentUserId);
    const where: any = {
      clientStatus: { in: ['Active', 'On Notice'] },
      OR: [
        { agreementEndDate: { not: null } },
        { lockinEndDate: { not: null } },
      ],
    };

    if (scopedUserIds !== null) {
      where.createdById = { in: scopedUserIds };
    }

    const clientEntries = await (prisma as any).clientMaster.findMany({
      where,
      select: {
        id: true,
        srNo: true,
        companyName: true,
        agreementStartDate: true,
        agreementEndDate: true,
        lockinEndDate: true,
        noticePeriodMonths: true,
        noticePeriodApplicable: true,
        clientStatus: true,
        cabinName: true,
        noOfSeats: true,
        totalAmount: true,
        contactPersons: {
          select: {
            id: true,
            name: true,
            designation: true,
            mobileNo: true,
            email: true,
          },
          orderBy: { sortOrder: 'asc' },
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
      },
      orderBy: { srNo: 'desc' },
    });

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const agreementNotifications: any[] = [];
    const lockinNotifications: any[] = [];

    for (const entry of clientEntries) {
      const locationName = entry.createdBy?.assignedLocations?.[0]?.location?.name || null;
      const baseInfo = {
        id: entry.id,
        srNo: entry.srNo,
        companyName: entry.companyName,
        agreementStartDate: entry.agreementStartDate,
        agreementEndDate: entry.agreementEndDate,
        lockinEndDate: entry.lockinEndDate,
        noticePeriodMonths: entry.noticePeriodMonths,
        noticePeriodApplicable: entry.noticePeriodApplicable,
        cabinName: entry.cabinName,
        noOfSeats: entry.noOfSeats,
        totalAmount: entry.totalAmount,
        contactPersons: entry.contactPersons || [],
        locationName,
      };

      // 1. AGREEMENT END DATE ALERTS: 2 months prior (<= 60 days) or recent expired (>= -180 days)
      if (entry.agreementEndDate) {
        const endDate = new Date(entry.agreementEndDate);
        const endDateMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        const diffTime = endDateMidnight - todayMidnight;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 60 && daysRemaining >= -180) {
          let statusTag: 'EXPIRED' | 'URGENT' | 'DUE_SOON';
          if (daysRemaining < 0) {
            statusTag = 'EXPIRED';
          } else if (daysRemaining <= 15) {
            statusTag = 'URGENT';
          } else {
            statusTag = 'DUE_SOON';
          }

          agreementNotifications.push({
            ...baseInfo,
            targetDate: entry.agreementEndDate,
            daysRemaining,
            isExpired: daysRemaining < 0,
            statusTag,
            type: 'AGREEMENT',
          });
        }
      }

      // 2. LOCK-IN END DATE ALERTS: up to 60 days prior or recent expired (>= -180 days)
      if (entry.lockinEndDate) {
        const lockinDate = new Date(entry.lockinEndDate);
        const lockinDateMidnight = new Date(lockinDate.getFullYear(), lockinDate.getMonth(), lockinDate.getDate()).getTime();
        const diffTime = lockinDateMidnight - todayMidnight;
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 60 && daysRemaining >= -180) {
          let statusTag: 'EXPIRED' | 'URGENT' | 'DUE_SOON';
          if (daysRemaining < 0) {
            statusTag = 'EXPIRED';
          } else if (daysRemaining <= 15) {
            statusTag = 'URGENT';
          } else {
            statusTag = 'DUE_SOON';
          }

          lockinNotifications.push({
            ...baseInfo,
            targetDate: entry.lockinEndDate,
            daysRemaining,
            isExpired: daysRemaining < 0,
            statusTag,
            type: 'LOCK_IN',
          });
        }
      }
    }

    // 3. ESCALATED SUPPORT TICKETS (>48 Hours SLA breached by CM) — Super Admin & Admin ONLY
    const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    let ticketEscalations: any[] = [];

    if (isSuperOrAdmin) {
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const ticketWhere: any = {
        createdAt: { lte: fortyEightHoursAgo },
        status: {
          name: { notIn: ['RESOLVED', 'CLOSED', 'Resolved', 'Closed'] },
        },
      };

      if (scopedUserIds !== null) {
        const currentUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { assignedLocations: { select: { locationId: true } } },
        });
        const myLocIds = currentUser?.assignedLocations.map((ul) => ul.locationId) || [];
        if (myLocIds.length > 0) {
          ticketWhere.locationId = { in: myLocIds };
        }
      }

      const overdueTickets = await prisma.supportTicket.findMany({
        where: ticketWhere,
        select: {
          id: true,
          ticketNumber: true,
          name: true,
          email: true,
          phone: true,
          organization: true,
          category: true,
          subCategory: true,
          description: true,
          createdAt: true,
          status: { select: { id: true, name: true, displayName: true } },
          locationRel: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' }, // oldest / most overdue first
      });

      ticketEscalations = overdueTickets.map((t) => {
        const hoursOpen = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
        return {
          id: t.id,
          ticketNumber: t.ticketNumber,
          companyName: t.organization || t.customer?.name || t.name,
          reporterName: t.name || t.customer?.name || 'Client',
          email: t.email || t.customer?.email || 'N/A',
          phone: t.phone || 'N/A',
          category: t.category || 'General Issue',
          subCategory: t.subCategory,
          description: t.description,
          createdAt: t.createdAt,
          hoursOpen,
          overdueHours: hoursOpen - 48,
          locationName: t.locationRel?.name || 'General Sector',
          statusName: t.status.displayName || t.status.name,
          type: 'TICKET_ESCALATION',
        };
      });
    }

    // 4. CONSUMED INVENTORY BUFFER ALERTS (Available <= Buffer Limit)
    let bufferAlerts: any[] = [];
    try {
      const { findManyConsumedItems } = await import('@/lib/consumedInventoryDb');
      let userLocationIds: number[] | undefined = undefined;
      if (scopedUserIds !== null) {
        const currentUserWithLocs = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { assignedLocations: { select: { locationId: true } } },
        });
        const myIds = currentUserWithLocs?.assignedLocations.map((ul) => ul.locationId) || [];
        if (myIds.length > 0) {
          userLocationIds = myIds;
        }
      }

      const allConsumed = await findManyConsumedItems({
        locationIds: userLocationIds,
      });

      const locations = await prisma.location.findMany({
        select: { id: true, name: true },
      });
      const locationMap = new Map<number, string>();
      locations.forEach((loc) => locationMap.set(loc.id, loc.name));

      const lowStockItems = allConsumed.filter((item: any) => Number(item.balanceQty) <= Number(item.bufferLimit));

      bufferAlerts = lowStockItems.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        locationId: item.locationId,
        locationName: item.locationId ? locationMap.get(item.locationId) || 'General' : 'General',
        availableQty: Number(item.availableQty || item.initialQty || 0),
        bufferLimit: Number(item.bufferLimit || 0),
        unitCost: Number(item.unitCost || 0),
        balanceQty: Number(item.balanceQty || 0),
        purchaseStatus: item.purchaseStatus || 'PENDING',
        reorderQuantity: Number(item.bufferLimit || 1) * 3,
        remarks: item.remarks,
        type: 'BUFFER_ALERT',
      }));
    } catch (invErr) {
      console.error('Failed to query consumed inventory buffer alerts:', invErr);
    }


    // 5. APPROVED INVOICE PAYMENT SETTLEMENT ALERTS
    let paymentAlerts: any[] = [];
    try {
      const approvedInvs = await (prisma as any).invoiceRecord.findMany({
        where: {
          status: 'APPROVED',
          ...(scopedUserIds !== null ? { createdById: { in: scopedUserIds } } : {}),
        },
        include: {
          clientMaster: { select: { companyName: true } },
          createdBy: { select: { assignedLocations: { select: { location: { select: { name: true } } } } } },
        },
        orderBy: { sentAt: 'desc' },
      });

      paymentAlerts = approvedInvs
        .filter((inv: any) => {
          const hasUTR = inv.utrNumber && String(inv.utrNumber).trim() !== '';
          const hasPayDate = Boolean(inv.payReceiveDate);
          const hasRecAmt = Number(inv.receiveAmount || 0) > 0;
          return !hasUTR && !hasPayDate && !hasRecAmt && inv.paymentStatus !== 'RECEIVED';
        })
        .map((inv: any) => ({
          id: inv.id,
          companyName: inv.companyName || inv.clientMaster?.companyName || 'Valued Client',
          billingMonth: inv.billingMonth || 'Current Month',
          totalAmount: Number(inv.totalAmount || inv.amount || 0),
          locationName: inv.createdBy?.assignedLocations?.[0]?.location?.name || 'Centre',
          status: 'PAYMENT_PENDING',
          title: `Approved Invoice Payment Pending: ${inv.companyName || inv.clientMaster?.companyName || 'Client'}`,
          message: `Tally invoice for ${inv.billingMonth || 'Current Month'} was approved. Please record payment receive details once payment arrives.`,
        }));
    } catch (payErr) {
      console.warn('Failed to query invoice payment alerts:', payErr);
    }

    let expenseApprovalAlerts: any[] = [];
    try {
      // Show pending expense approvals from last 2 days
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const pendingExpenses = await (prisma as any).expenseRecord.findMany({
        where: {
          approvalStatus: 'PENDING_APPROVAL',
          updatedAt: { gte: twoDaysAgo },
        },
        include: {
          location: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      expenseApprovalAlerts = pendingExpenses.map((exp: any) => ({
        id: exp.id,
        vendorName: exp.vendorName || 'Vendor Bill',
        locationName: exp.locationName || exp.location?.name || 'Centre',
        amount: Number(exp.amount || 0),
        category: exp.category || 'GENERAL EXPENSE',
        description: exp.description || '',
        createdAt: exp.updatedAt || exp.createdAt,
        type: 'EXPENSE_APPROVAL',
        title: `Expense Approval: ${exp.vendorName || exp.category} (₹${Number(exp.amount || 0).toLocaleString('en-IN')})`,
        message: `Accountant submitted an expense for ${exp.locationName || 'Centre'} requiring Super Admin approval.`,
      }));
    } catch (expErr) {
      console.warn('Failed to query expense approval alerts:', expErr);
    }

    // 6. EXPENSE PAYMENT DUE DATE ALERTS (7-day window to avoid late fee charges)
    let expenseDueDateAlerts: any[] = [];
    try {
      let allowedExpenseLocationIds: number[] | null = null;
      if (!isSuperOrAdmin && !isAccountant) {
        const userLocs = await prisma.userLocation.findMany({
          where: { userId: currentUserId },
          select: { locationId: true },
        });
        allowedExpenseLocationIds = userLocs.map((ul) => ul.locationId);
      }

      const unpaidExpenses = await (prisma as any).expenseRecord.findMany({
        where: {
          dueDate: { not: null },
          paymentStatus: { not: 'PAID' },
          ...(allowedExpenseLocationIds !== null ? { locationId: { in: allowedExpenseLocationIds } } : {}),
        },
        include: {
          location: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

      expenseDueDateAlerts = unpaidExpenses
        .map((exp: any) => {
          const due = new Date(exp.dueDate);
          const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
          const daysRemaining = Math.round((dueMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

          const day = String(due.getDate()).padStart(2, '0');
          const month = due.toLocaleString('en-US', { month: 'short' }).toUpperCase();
          const year = due.getFullYear();
          const formattedDueDate = `${day} ${month} ${year}`; // e.g. "20 OCT 2026"

          let statusTag: 'OVERDUE' | 'DUE_TODAY' | 'URGENT' | 'UPCOMING' = 'UPCOMING';
          if (daysRemaining < 0) statusTag = 'OVERDUE';
          else if (daysRemaining === 0) statusTag = 'DUE_TODAY';
          else if (daysRemaining <= 3) statusTag = 'URGENT';

          return {
            id: exp.id,
            receiptNo: exp.receiptNo,
            description: exp.description,
            vendorName: exp.vendorName || 'Vendor Bill',
            locationName: exp.locationName || exp.location?.name || 'Center',
            amount: Number(exp.amount || 0),
            category: exp.category || 'OPERATING EXPENSE',
            dueDate: exp.dueDate,
            dueDateStr: exp.dueDateStr || formattedDueDate,
            formattedDueDate,
            daysRemaining,
            statusTag,
            type: 'EXPENSE_DUE',
            title: `Expense Due: ${exp.vendorName || exp.category} (₹${Number(exp.amount || 0).toLocaleString('en-IN')})`,
            message: `Payment due on ${formattedDueDate} (${daysRemaining <= 0 ? (daysRemaining === 0 ? 'Due Today' : `${Math.abs(daysRemaining)}d overdue`) : `${daysRemaining}d left`}). Process before due date to avoid late fee charges.`,
          };
        })
        .filter((exp: any) => exp.daysRemaining <= 7);
    } catch (expDueErr) {
      console.warn('Failed to query expense due date alerts:', expDueErr);
    }

    // Sort arrays
    agreementNotifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
    lockinNotifications.sort((a, b) => a.daysRemaining - b.daysRemaining);
    expenseDueDateAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const summary = {
      agreementCount: agreementNotifications.length,
      lockinCount: lockinNotifications.length,
      ticketCount: isSuperOrAdmin ? ticketEscalations.length : 0,
      bufferAlertCount: bufferAlerts.length,
      paymentAlertCount: paymentAlerts.length,
      expenseApprovalCount: expenseApprovalAlerts.length,
      expenseDueAlertCount: expenseDueDateAlerts.length,
      totalCount:
        agreementNotifications.length +
        lockinNotifications.length +
        (isSuperOrAdmin ? ticketEscalations.length : 0) +
        bufferAlerts.length +
        paymentAlerts.length +
        expenseApprovalAlerts.length +
        expenseDueDateAlerts.length,
    };

    return NextResponse.json({
      success: true,
      summary,
      agreements: agreementNotifications,
      lockins: lockinNotifications,
      escalatedTickets: ticketEscalations,
      bufferAlerts,
      paymentAlerts,
      expenseApprovalAlerts,
      expenseDueDateAlerts,
    });
  } catch (error) {
    console.error('Agreement, Lock-in & Ticket notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agreement & ticket notifications' },
      { status: 500 }
    );
  }
}


