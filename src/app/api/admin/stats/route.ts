import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';
import { findOldInvoices } from '@/lib/old-invoices-db';
import { getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';

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

// GET /api/admin/stats — 100% Real Database Analytics for Super Admin (Owner) Executive Dashboard
export const GET = withPermission('reports', 'read', async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const billingMonthParam = searchParams.get('billingMonth');
    const locationIdParam = searchParams.get('locationId');

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

    // ── 3. Client Master Executive CRM Aggregates & SDR Analytics ──
    let clientMasterStats = {
      totalClients: 0,
      activeAgreements: 0,
      onNoticeClients: 0,
      totalAllocatedSeats: 0,
      totalMonthlyAgreementValue: 0,
      dispatchedForSelectedMonth: 0,
      pendingDispatchForSelectedMonth: 0,
    };

    let sdrAnalytics = {
      totalSdr: 0,
      totalCompaniesCount: 0,
      centreWise: [] as Array<{
        id: number | null;
        name: string;
        totalSdr: number;
        clientCount: number;
        companies: Array<{
          id: number;
          companyName: string;
          clientId: string | null;
          cabinName: string | null;
          noOfSeats: number | null;
          sdrAmount: number;
          clientStatus: string | null;
        }>;
      }>,
      allCompanies: [] as Array<{
        id: number;
        companyName: string;
        clientId: string | null;
        cabinName: string | null;
        noOfSeats: number | null;
        sdrAmount: number;
        clientStatus: string | null;
        centreName: string;
        centreId: number | null;
      }>,
    };

    let availableBillingMonths: string[] = [];

    try {
      if ((prisma as any).clientMaster) {
        let cmWhere: any = {};
        if (locationIdParam && locationIdParam !== 'ALL') {
          const locUserIds = await getUserIdsByLocation(parseInt(locationIdParam, 10));
          if (locUserIds) cmWhere.createdById = { in: locUserIds };
        }

        const clientMasters = await (prisma as any).clientMaster.findMany({
          where: cmWhere,
          include: {
            products: true,
            createdBy: {
              select: {
                name: true,
                assignedLocations: {
                  select: {
                    location: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        });

        if (clientMasters && clientMasters.length > 0) {
          clientMasterStats.totalClients = clientMasters.length;
          clientMasterStats.activeAgreements = clientMasters.filter((c: any) => c.clientStatus !== 'Terminated' && c.clientStatus !== 'Inactive').length;
          clientMasterStats.onNoticeClients = clientMasters.filter((c: any) => c.clientStatus === 'On Notice' || (c.noticePeriodMonths && c.noticePeriodMonths > 0 && c.clientStatus !== 'Active')).length;
          let seatsSum = 0;
          let valueSum = 0;
          let totalSdrSum = 0;
          const centreSdrMap: Record<string, { id: number | null; name: string; totalSdr: number; companies: any[] }> = {};
          const allClientsList: any[] = [];

          clientMasters.forEach((c: any) => {
            let clientSeats = 0;
            let clientVal = 0;

            if (Array.isArray(c.products) && c.products.length > 0) {
              c.products.forEach((p: any) => {
                clientSeats += Number(p.noOfSeats || 0);
                clientVal += Number(p.totalAmount || p.amount || 0);
              });
            } else {
              clientSeats = Number(c.noOfSeats || 0);
              clientVal = Number(c.totalAmount || c.amount || 0);
            }

            seatsSum += clientSeats;
            valueSum += clientVal;

            // SDR aggregation
            const sdr = Number(c.sorAmount || c.sdrAmount || 0);
            totalSdrSum += sdr;

            const loc = c.createdBy?.assignedLocations?.[0]?.location;
            let locName = loc?.name;
            let locId = loc?.id || null;

            if (!locName) {
              const cid = (c.clientId || '').toUpperCase();
              const cabin = (c.cabinName || '').toUpperCase();
              if (cid.includes('SGP') || cid.includes('/PH/') || cabin.includes('PREMIER')) {
                locName = 'Premier House';
                locId = 3;
              } else if (cid.includes('CGA') || cid.includes('AGARWAL') || cid.includes('AGC') || cabin.includes('AGARWAL')) {
                locName = 'Agarwal Complex';
                locId = 1;
              } else {
                locName = 'Mercado';
                locId = 2;
              }
            }

            if (!centreSdrMap[locName]) {
              centreSdrMap[locName] = { id: locId, name: locName, totalSdr: 0, companies: [] };
            }
            centreSdrMap[locName].totalSdr += sdr;

            const compData = {
              id: c.id,
              companyName: c.companyName,
              clientId: c.clientId,
              cabinName: c.cabinName,
              noOfSeats: clientSeats || c.noOfSeats || 1,
              monthlyAmount: clientVal,
              sdrAmount: sdr,
              clientStatus: c.clientStatus || 'Active',
              centreName: locName,
              centreId: locId,
              agreementStartDate: c.agreementStartDate || c.createdAt,
              lockInPeriod: c.lockInPeriodMonths || c.lockInPeriod || 11,
              noticePeriodMonths: c.noticePeriodMonths || 1,
            };

            centreSdrMap[locName].companies.push(compData);
            allClientsList.push(compData);
            sdrAnalytics.allCompanies.push(compData);
          });

          clientMasterStats.totalAllocatedSeats = seatsSum;
          clientMasterStats.totalMonthlyAgreementValue = valueSum;
          (clientMasterStats as any).allClients = allClientsList;

          sdrAnalytics.totalSdr = totalSdrSum;
          sdrAnalytics.totalCompaniesCount = clientMasters.length;
          sdrAnalytics.centreWise = Object.values(centreSdrMap).map((c) => ({
            ...c,
            clientCount: c.companies.length,
          }));
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
      invoicesRaised: 0,
      paymentReceived: 0,
      balancePayment: 0,
      centreFinancials: [] as Array<{
        name: string;
        invoicesRaised: number;
        paymentReceived: number;
        balancePayment: number;
        collectionRate: number;
      }>,
    };

    try {
      if ((prisma as any).invoiceRecord) {
        const allInvoices = await (prisma as any).invoiceRecord.findMany({
          select: {
            status: true,
            totalAmount: true,
            amount: true,
            billingMonth: true,
            clientMasterId: true,
            createdById: true,
            createdBy: {
              select: {
                assignedLocations: {
                  select: { location: { select: { id: true, name: true } } },
                },
              },
            },
          },
        });

        // Collect all distinct normalized billing months
        const monthSet = new Set<string>();
        allInvoices.forEach((inv: any) => {
          if (inv.billingMonth) {
            const norm = normalizeBillingMonth(inv.billingMonth);
            if (norm) monthSet.add(norm);
          }
        });
        const now = new Date();
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthSet.add(`${monthNames[now.getMonth()]} ${now.getFullYear()}`);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        monthSet.add(`${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`);

        availableBillingMonths = Array.from(monthSet).sort((a, b) => {
          const da = new Date(`1 ${a}`);
          const db = new Date(`1 ${b}`);
          return db.getTime() - da.getTime();
        });

        // Compute month-wise breakdown for all months
        const monthWiseInvoices: Record<string, any> = {};
        allInvoices.forEach((inv: any) => {
          const m = normalizeBillingMonth(inv.billingMonth) || 'August 2026';
          if (!monthWiseInvoices[m]) {
            monthWiseInvoices[m] = {
              totalInvoices: 0,
              pendingCmReview: 0,
              sentToAccountant: 0,
              invoiceAttached: 0,
              approved: 0,
              rejected: 0,
              totalInvoicedAmount: 0,
              invoicesRaised: 0,
              paymentReceived: 0,
              balancePayment: 0,
            };
          }
          monthWiseInvoices[m].totalInvoices += 1;
          if (inv.status === 'PENDING_CM_REVIEW') monthWiseInvoices[m].pendingCmReview += 1;
          if (inv.status === 'SENT_TO_ACCOUNTANT') monthWiseInvoices[m].sentToAccountant += 1;
          if (inv.status === 'INVOICE_ATTACHED') monthWiseInvoices[m].invoiceAttached += 1;
          if (inv.status === 'APPROVED') monthWiseInvoices[m].approved += 1;
          if (inv.status === 'REJECTED_WITH_REMARKS') monthWiseInvoices[m].rejected += 1;

          const amt = Number(inv.totalAmount || inv.amount || 0);
          monthWiseInvoices[m].invoicesRaised += amt;
          monthWiseInvoices[m].totalInvoicedAmount += amt;
          if (inv.status === 'APPROVED' || inv.status === 'CONFIRMED' || inv.status === 'PAID') {
            monthWiseInvoices[m].paymentReceived += amt;
          }
          monthWiseInvoices[m].balancePayment = Math.max(0, monthWiseInvoices[m].invoicesRaised - monthWiseInvoices[m].paymentReceived);
        });
        (invoiceStats as any).monthWise = monthWiseInvoices;

        // Apply filters for invoiceStats
        let filteredInvs = allInvoices;
        if (locationIdParam && locationIdParam !== 'ALL') {
          const locUserIds = await getUserIdsByLocation(parseInt(locationIdParam, 10));
          if (locUserIds) {
            filteredInvs = filteredInvs.filter((i: any) => locUserIds.includes(i.createdById));
          }
        }

        if (billingMonthParam && billingMonthParam !== 'ALL') {
          const normTarget = normalizeBillingMonth(billingMonthParam);
          filteredInvs = filteredInvs.filter((i: any) => normalizeBillingMonth(i.billingMonth) === normTarget);
        }

        if (filteredInvs.length > 0) {
          invoiceStats.totalInvoices = filteredInvs.length;
          invoiceStats.pendingCmReview = filteredInvs.filter((i: any) => i.status === 'PENDING_CM_REVIEW').length;
          invoiceStats.sentToAccountant = filteredInvs.filter((i: any) => i.status === 'SENT_TO_ACCOUNTANT').length;
          invoiceStats.invoiceAttached = filteredInvs.filter((i: any) => i.status === 'INVOICE_ATTACHED').length;
          invoiceStats.approved = filteredInvs.filter((i: any) => i.status === 'APPROVED').length;
          invoiceStats.rejected = filteredInvs.filter((i: any) => i.status === 'REJECTED_WITH_REMARKS').length;
          
          let totalRaised = 0;
          let totalReceived = 0;
          const centreMap: Record<string, { raised: number; received: number; balance: number }> = {};

          filteredInvs.forEach((inv: any) => {
            const amt = Number(inv.totalAmount || inv.amount || 0);
            totalRaised += amt;
            const isApproved = inv.status === 'APPROVED' || inv.status === 'CONFIRMED' || inv.status === 'PAID';
            if (isApproved) totalReceived += amt;

            const locName = inv.createdBy?.assignedLocations?.[0]?.location?.name || 'Mercado';
            if (!centreMap[locName]) centreMap[locName] = { raised: 0, received: 0, balance: 0 };
            centreMap[locName].raised += amt;
            if (isApproved) centreMap[locName].received += amt;
            centreMap[locName].balance = centreMap[locName].raised - centreMap[locName].received;
          });

          invoiceStats.totalInvoicedAmount = totalRaised;
          invoiceStats.invoicesRaised = totalRaised;
          invoiceStats.paymentReceived = totalReceived;
          invoiceStats.balancePayment = Math.max(0, totalRaised - totalReceived);
          invoiceStats.centreFinancials = Object.entries(centreMap).map(([name, d]) => ({
            name,
            invoicesRaised: d.raised,
            paymentReceived: d.received,
            balancePayment: d.balance,
            collectionRate: d.raised > 0 ? Math.round((d.received / d.raised) * 100) : 100,
          }));
        }

        // Cross-check dispatched vs pending dispatch for the selected billing month
        if (billingMonthParam && billingMonthParam !== 'ALL') {
          const normTarget = normalizeBillingMonth(billingMonthParam);
          const dispatchedClientIds = new Set(
            allInvoices
              .filter((i: any) => normalizeBillingMonth(i.billingMonth) === normTarget && i.clientMasterId)
              .map((i: any) => i.clientMasterId)
          );
          clientMasterStats.dispatchedForSelectedMonth = dispatchedClientIds.size;
          clientMasterStats.pendingDispatchForSelectedMonth = Math.max(0, clientMasterStats.activeAgreements - dispatchedClientIds.size);
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

          const amt = Number(inv.grandTotal || inv.amount || 0);
          centreMap[locName].total += 1;

          const isReceived = inv.paymentStatus === 'RECEIVED' || inv.paymentStatus === 'PAID' || Boolean(inv.utrNumber);
          if (isReceived) {
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
      monthWise: {} as Record<string, any>,
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
          const monthWiseExp: Record<string, Record<string, { name: string; amount: number; count: number }>> = {};

          sheets.forEach((sheet: any) => {
            const locName = sheet.location?.name || 'Ahmedabad Centre';
            if (!centreMap[locName]) {
              centreMap[locName] = { name: locName, amount: 0, count: 0 };
            }
            const rawRows = typeof sheet.rows === 'string' ? JSON.parse(sheet.rows) : sheet.rows;
            const rows = Array.isArray(rawRows) ? rawRows : [];
            rows.forEach((r: any) => {
              const desc = (r.col_2 || r.col_3 || '').toString().toLowerCase();
              if (desc.includes('total') || desc.includes('subtotal') || desc.includes('fx')) return;

              const val = r.col_4 || r.col_3 || r.amount || r.acc_receive_amount;
              let amt = 0;
              if (typeof val === 'number') amt = isNaN(val) ? 0 : val;
              else if (typeof val === 'string') {
                const raw = val.trim();
                if (!raw.startsWith('=') && !raw.toLowerCase().includes('sum')) {
                  const cleaned = raw.replace(/[₹$,\s]/g, '').replace(/^(rs|inr)\.?/i, '').trim();
                  if (/^[-+]?[0-9]+(\.[0-9]+)?$/.test(cleaned)) {
                    const num = parseFloat(cleaned);
                    if (!isNaN(num)) amt = num;
                  }
                }
              }

              if (amt > 0) {
                totalExpSum += amt;
                totalCount += 1;
                centreMap[locName].amount += amt;
                centreMap[locName].count += 1;

                // Extract month
                let rowMonth = 'August 2026';
                const dateVal = String(r.col_1 || '').trim();
                if (dateVal) {
                  const d = new Date(dateVal);
                  if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) {
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    rowMonth = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                  } else {
                    const mMatch = dateVal.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                    if (mMatch) {
                      const mIdx = parseInt(mMatch[2], 10) - 1;
                      const mYear = parseInt(mMatch[3], 10);
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      if (mIdx >= 0 && mIdx < 12) rowMonth = `${monthNames[mIdx]} ${mYear}`;
                    }
                  }
                }

                if (!monthWiseExp[rowMonth]) monthWiseExp[rowMonth] = {};
                if (!monthWiseExp[rowMonth][locName]) monthWiseExp[rowMonth][locName] = { name: locName, amount: 0, count: 0 };
                monthWiseExp[rowMonth][locName].amount += amt;
                monthWiseExp[rowMonth][locName].count += 1;
              }
            });
          });

          expenseStats.totalExpensesLogged = totalCount;
          expenseStats.totalExpenseAmount = totalExpSum;
          expenseStats.centreExpenses = Object.values(centreMap);

          const formattedMonthWise: Record<string, any> = {};
          Object.entries(monthWiseExp).forEach(([m, cMap]) => {
            const list = Object.values(cMap);
            const sum = list.reduce((acc, c) => acc + c.amount, 0);
            const cnt = list.reduce((acc, c) => acc + c.count, 0);
            formattedMonthWise[m] = {
              totalExpensesLogged: cnt,
              totalExpenseAmount: sum,
              centreExpenses: list,
            };
          });
          expenseStats.monthWise = formattedMonthWise;
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
      const productWhere: any = { isActive: true };
      if (locationIdParam && locationIdParam !== 'ALL') {
        productWhere.locationId = parseInt(locationIdParam, 10);
      }

      productsList = await prisma.product.findMany({
        where: productWhere,
        select: {
          id: true,
          name: true,
          isActive: true,
          capacity: true,
          quantity: true,
          type: { select: { displayName: true, name: true } },
          category: { select: { displayName: true, name: true } },
          location: { select: { id: true, name: true } },
          pricingPlans: {
            select: {
              price: true,
              durationType: {
                select: { displayName: true, name: true, slug: true },
              },
            },
            take: 1,
          },
        },
        orderBy: { id: 'asc' },
      });

      if (productsList.length > 0) {
        let cab = 0, meet = 0, dsk = 0, evt = 0, capSum = 0;
        productsList.forEach((p) => {
          const typeName = (p.type?.displayName || p.type?.name || p.name || '').toUpperCase();
          const catName = (p.category?.displayName || p.category?.name || '').toUpperCase();
          const cap = Number(p.capacity || 1);
          const qty = Number(p.quantity || 1);
          capSum += cap * qty;

          if (typeName.includes('CABIN')) {
            cab += 1;
          } else if (typeName.includes('DESK')) {
            dsk += 1;
          } else if (typeName.includes('EVENT')) {
            evt += 1;
            meet += 1;
          } else if (typeName.includes('MEETING') || typeName.includes('BOARD') || catName.includes('GUEST')) {
            meet += 1;
          } else {
            cab += 1;
          }
        });

        const allWorkspaces = productsList.map((p) => {
          const typeName = p.type?.displayName || p.type?.name || 'Workspace';
          const catName = p.category?.displayName || p.category?.name || 'General';
          const price = p.pricingPlans?.[0]?.price || 0;
          const dur = p.pricingPlans?.[0]?.durationType;
          let durationStr = 'month';
          if (typeof dur === 'string') {
            durationStr = dur;
          } else if (dur && typeof dur === 'object') {
            const raw = (dur.displayName || dur.name || dur.slug || '').toLowerCase();
            if (raw.includes('hour')) durationStr = 'hour';
            else if (raw.includes('day')) durationStr = 'day';
            else if (raw.includes('week')) durationStr = 'week';
            else if (raw.includes('year')) durationStr = 'year';
            else durationStr = 'month';
          }

          return {
            id: p.id,
            name: p.name,
            type: typeName,
            category: catName,
            locationId: p.location?.id,
            locationName: p.location?.name || 'Centre',
            capacity: p.capacity || 1,
            quantity: p.quantity || 1,
            price: Number(price),
            durationType: durationStr,
            isActive: p.isActive,
          };
        });

        productTypeCounts = {
          cabins: cab,
          meetingRooms: meet,
          desks: dsk,
          eventSpaces: evt,
          totalCapacity: capSum,
          allWorkspaces: allWorkspaces as any,
        } as any;
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
        sdrAnalytics,
        invoices: invoiceStats,
        availableBillingMonths,
        selectedBillingMonth: billingMonthParam || 'ALL',
        selectedLocationId: locationIdParam || 'ALL',
        oldInvoices: oldInvoicesStats,
        expenses: expenseStats,
        announcements: announcementStats,
        promocodes: promoStats,
        leads: {
          total: contractLeadsCount,
          pending: pendingLeadsCount,
        },
        productsList: (productTypeCounts as any).allWorkspaces || [],
      },
    });
  } catch (error) {
    console.error('[STATS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
