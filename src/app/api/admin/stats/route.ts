import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';
import { findOldInvoices } from '@/lib/old-invoices-db';

// GET /api/admin/stats — 100% Real Database Analytics for Super Admin (Owner) Executive Dashboard
export const GET = withPermission('reports', 'read', async () => {
  try {
    const [
      totalLocations,
      totalProducts,
      totalBookings,
      totalRevenue,
      pendingTickets,
      totalUsers,
      totalAmenities,
      totalRoles,
      recentBookings,
    ] = await prisma.$transaction([
      prisma.location.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: { name: 'PAID' } },
      }),
      prisma.supportTicket.count({
        where: { status: { name: { notIn: ['CLOSED', 'RESOLVED'] } } },
      }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.amenity.count(),
      prisma.role.count({ where: { isActive: true } }),
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          bookingNumber: true,
          grandTotal: true,
          createdAt: true,
          customer: { select: { name: true, email: true } },
          product: { select: { name: true } },
          status: { select: { name: true, displayName: true, color: true } },
        },
      }),
    ]);

    // ── 1. Operating Locations Breakdown ─────────────────────────
    let locationsList: any[] = [];
    try {
      locationsList = await prisma.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          city: { select: { name: true } },
          _count: { select: { products: true } },
        },
        orderBy: { sortOrder: 'asc' },
      });
    } catch (e) {
      console.warn('[STATS_LOCATIONS_ERROR]', e);
    }

    // ── 2. Users & Roles Breakdown ───────────────────────────────
    let userStats = {
      total: totalUsers,
      superAdmins: 0,
      communityManagers: 0,
      accountants: 0,
      members: 0,
    };
    let rolesList: any[] = [];
    try {
      rolesList = await prisma.role.findMany({
        select: { id: true, name: true, displayName: true, _count: { select: { users: true } } },
      });

      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { role: { select: { name: true } } },
      });
      if (users.length > 0) {
        userStats.total = users.length;
        userStats.superAdmins = users.filter((u) => u.role?.name === 'SUPER_ADMIN').length;
        userStats.communityManagers = users.filter((u) => u.role?.name === 'COMMUNITY_MANAGER').length;
        userStats.accountants = users.filter((u) => u.role?.name === 'ACCOUNTS' || u.role?.name === 'ACCOUNTANT').length;
        userStats.members = users.filter((u) => !['SUPER_ADMIN', 'COMMUNITY_MANAGER', 'ACCOUNTS', 'ACCOUNTANT'].includes(u.role?.name || '')).length;
      }
    } catch (e) {
      console.warn('[STATS_USERS_ERROR]', e);
    }

    // ── 3. Client Master Executive CRM Aggregates ────────────────
    let clientMasterStats = {
      totalClients: 0,
      activeAgreements: 0,
      onNoticeClients: 0,
      totalAllocatedSeats: 0,
      totalMonthlyAgreementValue: 0,
    };

    try {
      if ((prisma as any).clientMaster) {
        const clientMasters = await (prisma as any).clientMaster.findMany({
          include: {
            products: true,
          },
        });

        if (clientMasters && clientMasters.length > 0) {
          clientMasterStats.totalClients = clientMasters.length;
          clientMasterStats.activeAgreements = clientMasters.filter((c: any) => c.clientStatus !== 'Terminated' && c.clientStatus !== 'Inactive').length;
          clientMasterStats.onNoticeClients = clientMasters.filter((c: any) => c.clientStatus === 'On Notice' || (c.noticePeriodMonths && c.noticePeriodMonths > 0 && c.clientStatus !== 'Active')).length;

          let seatsSum = 0;
          let valueSum = 0;

          clientMasters.forEach((c: any) => {
            if (Array.isArray(c.products) && c.products.length > 0) {
              c.products.forEach((p: any) => {
                seatsSum += Number(p.noOfSeats || 0);
                valueSum += Number(p.totalAmount || p.amount || 0);
              });
            } else {
              seatsSum += Number(c.noOfSeats || 0);
              valueSum += Number(c.totalAmount || c.amount || 0);
            }
          });

          clientMasterStats.totalAllocatedSeats = seatsSum;
          clientMasterStats.totalMonthlyAgreementValue = valueSum;
        }
      }
    } catch (e) {
      console.warn('[STATS_CLIENT_MASTER_ERROR]', e);
    }

    // ── 4. Current Invoices & GST Billing Pipeline Funnel ─────────
    let invoiceStats = {
      totalInvoices: 0,
      pendingCmReview: 0,
      sentToAccountant: 0,
      invoiceAttached: 0,
      approved: 0,
      rejected: 0,
      totalInvoicedAmount: 0,
    };

    try {
      if ((prisma as any).invoiceRecord) {
        const invoices = await (prisma as any).invoiceRecord.findMany({
          select: { status: true, totalAmount: true },
        });

        if (invoices.length > 0) {
          invoiceStats.totalInvoices = invoices.length;
          invoiceStats.pendingCmReview = invoices.filter((i: any) => i.status === 'PENDING_CM_REVIEW').length;
          invoiceStats.sentToAccountant = invoices.filter((i: any) => i.status === 'SENT_TO_ACCOUNTANT').length;
          invoiceStats.invoiceAttached = invoices.filter((i: any) => i.status === 'INVOICE_ATTACHED').length;
          invoiceStats.approved = invoices.filter((i: any) => i.status === 'APPROVED').length;
          invoiceStats.rejected = invoices.filter((i: any) => i.status === 'REJECTED_WITH_REMARKS').length;
          invoiceStats.totalInvoicedAmount = invoices.reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
        }
      }
    } catch (e) {
      console.warn('[STATS_INVOICES_ERROR]', e);
    }

    // ── 5. Old Invoices Archive (100% Real OldInvoiceHistory DB Table) ──
    let oldInvoicesStats = {
      totalUploaded: 0,
      totalAmount: 0,
      totalPaymentReceived: 0,
      totalPaymentPending: 0,
      centreWise: [] as Array<{
        name: string;
        total: number;
        paymentReceived: number;
        paymentPending: number;
        amount: number;
      }>,
    };

    try {
      const oldInvoices = await findOldInvoices({});
      if (Array.isArray(oldInvoices) && oldInvoices.length > 0) {
        oldInvoicesStats.totalUploaded = oldInvoices.length;

        const centreMap: Record<string, { name: string; total: number; paymentReceived: number; paymentPending: number; amount: number }> = {
          'Mercado Location': { name: 'Mercado Location', total: 0, paymentReceived: 0, paymentPending: 0, amount: 0 },
          'Agarwal Complex': { name: 'Agarwal Complex', total: 0, paymentReceived: 0, paymentPending: 0, amount: 0 },
          'Premier House': { name: 'Premier House', total: 0, paymentReceived: 0, paymentPending: 0, amount: 0 },
        };

        oldInvoices.forEach((inv: any) => {
          let locName = inv.locationName;
          if (!locName || !centreMap[locName]) {
            const comp = (inv.companyName || '').toLowerCase();
            if (comp.includes('premier') || comp.includes('ph')) locName = 'Premier House';
            else if (comp.includes('agarwal') || comp.includes('ag')) locName = 'Agarwal Complex';
            else locName = 'Mercado Location';
          }

          if (!centreMap[locName]) {
            centreMap[locName] = { name: locName, total: 0, paymentReceived: 0, paymentPending: 0, amount: 0 };
          }

          // Check if accountant updated payment details against CM uploaded invoice
          const hasPayment = Boolean(
            inv.payReceiveDate ||
            (inv.receiveAmount && Number(inv.receiveAmount) > 0) ||
            (inv.utrNumber && String(inv.utrNumber).trim() !== '') ||
            (inv.paymentsJson && inv.paymentsJson !== '[]')
          );

          const amt = Number(inv.amount || inv.receiveAmount || 0);

          centreMap[locName].total += 1;
          if (hasPayment) {
            centreMap[locName].paymentReceived += 1;
            oldInvoicesStats.totalPaymentReceived += 1;
          } else {
            centreMap[locName].paymentPending += 1;
            oldInvoicesStats.totalPaymentPending += 1;
          }

          centreMap[locName].amount += amt;
          oldInvoicesStats.totalAmount += amt;
        });

        oldInvoicesStats.centreWise = Object.values(centreMap);
      }
    } catch (e) {
      console.warn('[STATS_OLD_INVOICES_ERROR]', e);
    }

    // ── 6. Centre Operating Expenses (Real Database Sheets) ───────
    let expenseStats = {
      totalExpensesLogged: 0,
      totalExpenseAmount: 0,
      centreExpenses: [] as any[],
    };

    try {
      if ((prisma as any).locationExpenseSheet) {
        const sheets = await (prisma as any).locationExpenseSheet.findMany({
          include: { location: { select: { id: true, name: true } } },
        });

        if (sheets.length > 0) {
          let totalExpSum = 0;
          let totalCount = 0;
          const centreMap: Record<string, { name: string; amount: number; count: number }> = {};

          sheets.forEach((sheet: any) => {
            const locName = sheet.location?.name || 'Ahmedabad Centre';
            if (!centreMap[locName]) {
              centreMap[locName] = { name: locName, amount: 0, count: 0 };
            }
            const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
            rows.forEach((r: any) => {
              const amt = Number(r.col_4 || r.amount || 0);
              if (!isNaN(amt) && amt > 0) {
                totalExpSum += amt;
                totalCount += 1;
                centreMap[locName].amount += amt;
                centreMap[locName].count += 1;
              }
            });
          });

          expenseStats.totalExpensesLogged = totalCount;
          expenseStats.totalExpenseAmount = totalExpSum;
          expenseStats.centreExpenses = Object.values(centreMap);
        }
      }
    } catch (e) {
      console.warn('[STATS_EXPENSES_ERROR]', e);
    }

    // ── 7. Announcements & Marquee Notices (100% Real DB Count) ──
    let announcementStats = {
      total: 0,
      active: 0,
    };
    try {
      if ((prisma as any).announcementLabel) {
        const annList = await (prisma as any).announcementLabel.findMany();
        announcementStats.total = annList.length;
        announcementStats.active = annList.filter((a: any) => a.isActive !== false).length;
      }
    } catch (e) {
      console.warn('[STATS_ANNOUNCEMENT_ERROR]', e);
    }

    // ── 8. Checkout Promo Codes & Discounts (100% Real DB Count) ─
    let promoStats = {
      total: 0,
      active: 0,
      redeemedCount: 0,
    };
    try {
      if ((prisma as any).promoCode) {
        const promos = await (prisma as any).promoCode.findMany();
        promoStats.total = promos.length;
        promoStats.active = promos.filter((p: any) => p.isActive !== false).length;
        promoStats.redeemedCount = promos.reduce((sum: number, p: any) => sum + (Number(p.usedCount || p.usageCount || 0)), 0);
      } else {
        const rawPromos: any = await prisma.$queryRawUnsafe('SELECT * FROM `PromoCode` LIMIT 50').catch(() => []);
        if (Array.isArray(rawPromos)) {
          promoStats.total = rawPromos.length;
          promoStats.active = rawPromos.filter((p: any) => p.isActive).length;
          promoStats.redeemedCount = rawPromos.reduce((sum: number, p: any) => sum + (Number(p.usedCount || 0)), 0);
        }
      }
    } catch (e) {
      console.warn('[STATS_PROMO_ERROR]', e);
    }

    // ── 9. Contract Requests & Booking Leads ──────────────────────
    let contractLeadsCount = 0;
    let pendingLeadsCount = 0;
    try {
      if ((prisma as any).contractRequest) {
        contractLeadsCount = await (prisma as any).contractRequest.count();
        pendingLeadsCount = await (prisma as any).contractRequest.count({ where: { status: 'PENDING' } });
      }
    } catch (e) {
      console.warn('[STATS_LEADS_ERROR]', e);
    }

    // ── 10. Product Inventory Breakdown & Seating Capacity ────────
    let productsList: any[] = [];
    let productTypeCounts = {
      cabins: 0,
      meetingRooms: 0,
      desks: 0,
      eventSpaces: 0,
      totalCapacity: 0,
    };

    try {
      productsList = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          isActive: true,
          capacity: true,
          quantity: true,
          type: { select: { displayName: true, name: true } },
          category: { select: { displayName: true, name: true } },
          location: { select: { id: true, name: true } },
          pricingPlans: { select: { price: true, durationType: true }, take: 1 },
        },
        orderBy: { id: 'desc' },
      });

      if (productsList.length > 0) {
        let cab = 0, meet = 0, dsk = 0, evt = 0, capSum = 0;
        productsList.forEach((p) => {
          const typeName = (p.type?.name || p.type?.displayName || '').toUpperCase();
          const cap = Number(p.capacity || 1);
          const qty = Number(p.quantity || 1);
          capSum += cap * qty;

          if (typeName.includes('CABIN')) cab += 1;
          else if (typeName.includes('MEETING') || typeName.includes('BOARD')) meet += 1;
          else if (typeName.includes('DESK')) dsk += 1;
          else if (typeName.includes('EVENT')) evt += 1;
        });

        productTypeCounts = {
          cabins: cab,
          meetingRooms: meet,
          desks: dsk,
          eventSpaces: evt,
          totalCapacity: capSum,
        };
      }
    } catch (e) {
      console.warn('[STATS_PRODUCTS_ERROR]', e);
    }

    return NextResponse.json({
      data: {
        totalLocations,
        totalProducts: productsList.length > 0 ? productsList.length : totalProducts,
        totalBookings,
        totalRevenue: totalRevenue._sum.amount ?? 0,
        pendingTickets,
        totalUsers,
        totalAmenities,
        totalRoles: totalRoles || rolesList.length,
        roles: rolesList,
        recentBookings,
        locations: locationsList,
        users: userStats,
        productSummary: productTypeCounts,
        clientMaster: clientMasterStats,
        invoices: invoiceStats,
        oldInvoices: oldInvoicesStats,
        expenses: expenseStats,
        announcements: announcementStats,
        promocodes: promoStats,
        leads: {
          total: contractLeadsCount,
          pending: pendingLeadsCount,
        },
        productsList: productsList.slice(0, 8),
      },
    });
  } catch (error) {
    console.error('[STATS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
