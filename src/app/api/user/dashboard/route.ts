import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrCreateSyncedCustomer } from '@/lib/customerSyncHelper';

// GET /api/user/dashboard — User personalized dashboard stats
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const customer = await getOrCreateSyncedCustomer(userId, payload.email as string);


    // Fetch user details for profile completion check
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            name: true,
            email: true,
            phone: true,
            companyName: true
        }
    });

    const isProfileComplete = !!(user?.companyName && user?.phone);

    // 1. Fetch relevant metrics if customer exists
    let totalBookings = 0;
    let pendingTickets = 0;
    let totalTickets = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentBookings: any[] = [];

    if (customer) {
      const results = await prisma.$transaction([
        // Count total bookings for this customer (via email link)
        prisma.booking.count({ where: { customerId: customer.id } }),

        // Count unresolved tickets for this customer
        prisma.supportTicket.count({
          where: {
            customerId: customer.id,
            status: { name: { notIn: ['CLOSED', 'RESOLVED'] } }
          }
        }),

        // Count all tickets for this customer
        prisma.supportTicket.count({ where: { customerId: customer.id } }),

        // Fetch last 5 bookings for summary
        prisma.booking.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            bookingNumber: true,
            grandTotal: true,
            startDate: true,
            product: { select: { name: true } },
            status: { select: { displayName: true } }
          }
        })
      ]);

      [totalBookings, pendingTickets, totalTickets, recentBookings] = results;
    }


    // 2. Fetch ClientMaster record if the user is a registered client
    let clientMasterRecord: any = null;
    let approvedInvoices: any[] = [];
    const searchEmail = user?.email || (payload.email as string);

    try {
      clientMasterRecord = await (prisma as any).clientMaster.findFirst({
        where: {
          clientStatus: { in: ['Active', 'On Notice'] },
          OR: [
            ...(userId ? [{ createdById: userId }] : []),
            ...(searchEmail ? [{ contactPersons: { some: { email: { equals: searchEmail } } } }] : []),
            ...(user?.companyName ? [{ companyName: { equals: user.companyName } }] : []),
          ],
        },
        orderBy: { id: 'desc' },
        include: {
          products: { orderBy: { sortOrder: 'asc' } },
          contactPersons: { orderBy: { sortOrder: 'asc' } },

          createdBy: {
            select: {
              assignedLocations: {
                select: { location: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });

      if (clientMasterRecord) {
        approvedInvoices = await (prisma as any).invoiceRecord.findMany({
          where: {
            clientMasterId: clientMasterRecord.id,
            status: { in: ['APPROVED', 'PENDING_CM_REVIEW', 'SENT_TO_ACCOUNTANT', 'INVOICE_ATTACHED'] },
          },
          include: {
            attachedInvoice: true,
          },
          orderBy: { id: 'desc' },
          take: 6,
        });
      }
    } catch (cmErr) {
      console.warn('[User Dashboard] ClientMaster lookup note:', cmErr);
    }

    const firstProduct = clientMasterRecord?.products?.[0];
    const derivedLocation = clientMasterRecord?.cabinName?.includes('Premier House')
      ? 'Premier House, SG Highway'
      : clientMasterRecord?.cabinName?.includes('Mercado')
      ? 'Mercado, CG Road'
      : clientMasterRecord?.cabinName?.includes('Agarwal')
      ? 'Agarwal Complex, CG Road'
      : (clientMasterRecord?.createdBy?.assignedLocations?.[0]?.location?.name || 'SSPACIA Centre');

    return NextResponse.json({
      data: {
        stats: {
          totalBookings,
          activePasses: isProfileComplete ? 1 : (clientMasterRecord ? 1 : 0),
          pendingTickets,
          totalTickets,
          totalSeats: clientMasterRecord?.noOfSeats || (clientMasterRecord?.products?.reduce((s: number, p: any) => s + (Number(p.noOfSeats) || 0), 0) || 0),
        },
        clientMaster: clientMasterRecord ? {
          id: clientMasterRecord.id,
          clientId: clientMasterRecord.clientId,
          clientType: clientMasterRecord.clientType,
          companyName: clientMasterRecord.companyName,
          cabinName: clientMasterRecord.cabinName,
          noOfSeats: clientMasterRecord.noOfSeats,
          ratePerAgreement: clientMasterRecord.ratePerAgreement || firstProduct?.ratePerAgreement || '0',
          amount: clientMasterRecord.amount || firstProduct?.amount || '0',
          gstPercent: clientMasterRecord.gstPercent || firstProduct?.gstPercent || '0',
          totalAmount: clientMasterRecord.totalAmount || firstProduct?.totalAmount || '0',
          paymentDuration: firstProduct?.paymentDuration || 'YEARLY',
          clientStatus: clientMasterRecord.clientStatus,
          agreementStartDate: clientMasterRecord.agreementStartDate,
          agreementEndDate: clientMasterRecord.agreementEndDate,
          locationName: derivedLocation,
          products: clientMasterRecord.products || [],
          contactPersons: clientMasterRecord.contactPersons || [],
        } : null,
        approvedInvoices: approvedInvoices.map((inv: any) => ({
          id: inv.id,
          billingMonth: inv.billingMonth,
          amount: inv.amount,
          gstPercent: inv.gstPercent,
          totalAmount: inv.totalAmount,
          dueDate: inv.dueDate,
          status: inv.status,
          splitsJson: inv.splitsJson,
          attachedPdfUrl: inv.attachedInvoice?.fileUrl || null,
          attachedPdfName: inv.attachedInvoice?.fileName || null,
        })),
        recentActivity: recentBookings
      }
    });
  } catch (error) {
    console.error('[USER_DASHBOARD_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
