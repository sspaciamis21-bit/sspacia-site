import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clients = await prisma.clientMaster.findMany({
      where: {
        clientStatus: {
          in: ['Active', 'active', 'On Notice', 'on notice'],
        },
      },
      include: {
        contactPersons: {
          orderBy: { sortOrder: 'asc' },
        },
        products: true,
        createdBy: {
          select: {
            name: true,
            assignedLocations: {
              select: {
                location: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const items = clients.map((client) => {
      const center =
        client.createdBy?.assignedLocations?.[0]?.location?.name ||
        client.createdBy?.name ||
        'Mercado';

      const seats = (client.products || []).reduce(
        (acc, p) => acc + (p.noOfSeats || 0),
        0
      );
      const cabinNames = (client.products || [])
        .map((p) => p.cabinName)
        .filter(Boolean)
        .join(', ');

      const monthlyRent = (client.products || []).reduce(
        (acc, p) => acc + Number(p.totalAmount || p.amount || 0),
        0
      );

      const firstProduct = client.products?.[0];
      const agreementEndDate = firstProduct?.agreementEndDate || client.agreementEndDate;
      const lockinEndDate = firstProduct?.lockinEndDate || client.lockinEndDate;
      const paymentDueDay = firstProduct?.paymentDueDay || client.paymentDueDay || 5;

      const formatDate = (d: Date | null | undefined) => {
        if (!d) return '';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return '';
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
      };

      return {
        companyName: client.companyName.trim(),
        center: center.trim(),
        cabinSeats: cabinNames ? `${cabinNames} (${seats} Seats)` : `${seats} Seats`,
        monthlyRent: Math.round(monthlyRent),
        agreementEndDate: formatDate(agreementEndDate),
        lockinEndDate: formatDate(lockinEndDate),
        paymentDueDay,
        status: client.clientStatus || 'Active',
        contacts: (client.contactPersons || []).map((cp) => ({
          name: (cp.name || '').trim(),
          designation: (cp.designation || '').trim(),
          mobileNo: (cp.mobileNo || '').trim(),
          email: (cp.email || '').trim(),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Error fetching SCOT client data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
