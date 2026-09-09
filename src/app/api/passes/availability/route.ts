import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/passes/availability
 * Query parameters:
 *  - productId (e.g. 1, 6, 11)
 *  - locationId (optional fallback to find flexi desk product)
 *  - startDate (ISO date string e.g. "2026-09-08")
 *  - endDate (ISO date string e.g. "2026-09-14")
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const productIdParam = searchParams.get('productId');
    const locationIdParam = searchParams.get('locationId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate') || startDateParam;

    if (!startDateParam) {
      return NextResponse.json({ error: 'startDate is required' }, { status: 400 });
    }

    let product: any = null;

    if (productIdParam) {
      product = await prisma.product.findUnique({
        where: { id: Number(productIdParam), isActive: true },
        include: {
          location: { select: { id: true, name: true, address: true } },
          units: { select: { id: true, name: true } },
          pricingPlans: {
            where: { isActive: true },
            include: { durationType: true },
          },
        },
      });
    } else if (locationIdParam) {
      product = await prisma.product.findFirst({
        where: {
          locationId: Number(locationIdParam),
          name: { contains: 'Flexi' },
          isActive: true,
        },
        include: {
          location: { select: { id: true, name: true, address: true } },
          units: { select: { id: true, name: true } },
          pricingPlans: {
            where: { isActive: true },
            include: { durationType: true },
          },
        },
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Flexi Desk space product not found' }, { status: 404 });
    }

    // Determine total capacity
    // Agarwal: 20, Mercado: 25, Premier House: 20
    const totalCapacity = product.units.length > 0 ? product.units.length : (product.capacity || 20);

    const rangeStart = new Date(startDateParam);
    rangeStart.setUTCHours(0, 0, 0, 0);

    const rangeEnd = new Date(endDateParam || startDateParam);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    // Query active overlapping bookings
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        productId: product.id,
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart },
        status: {
          name: { notIn: ['CANCELLED', 'FAILED', 'REJECTED'] },
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        seats: true,
      },
    });

    // Query active long-term corporate clients in ClientMaster occupying Flexi Desks
    const clientMasters = await (prisma as any).clientMaster.findMany({
      where: {
        clientStatus: { notIn: ['Terminated', 'Inactive'] },
        OR: [
          { cabinName: { contains: 'flexi', mode: 'insensitive' } },
          { products: { some: { cabinName: { contains: 'flexi', mode: 'insensitive' } } } },
        ],
      },
      include: {
        products: true,
        createdBy: {
          select: {
            assignedLocations: {
              select: {
                location: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Filter to clients occupying flexi desks at THIS product's location
    const locationFlexiClients: Array<{ seats: number; start: Date; end: Date }> = [];
    for (const c of clientMasters) {
      let locId = 2; // Default Mercado
      const loc = c.createdBy?.assignedLocations?.[0]?.location;
      if (loc?.id) {
        locId = loc.id;
      } else {
        const cid = (c.clientId || '').toUpperCase();
        const cabin = (c.cabinName || '').toUpperCase();
        if (cid.includes('SGP') || cid.includes('/PH/') || cabin.includes('PREMIER')) {
          locId = 3;
        } else if (cid.includes('CGA') || cid.includes('AGARWAL') || cid.includes('AGC') || cabin.includes('AGARWAL')) {
          locId = 1;
        }
      }

      if (locId === product.location.id) {
        let seats = 0;
        if (Array.isArray(c.products) && c.products.length > 0) {
          c.products.forEach((p: any) => {
            if ((p.cabinName || '').toLowerCase().includes('flexi')) {
              seats += Number(p.noOfSeats || 1);
            }
          });
        }
        if (seats === 0 && (c.cabinName || '').toLowerCase().includes('flexi')) {
          seats = Number(c.noOfSeats || 1);
        }

        if (seats > 0) {
          const cStart = c.agreementStartDate ? new Date(c.agreementStartDate) : new Date(2000, 0, 1);
          const cEnd = c.agreementEndDate ? new Date(c.agreementEndDate) : new Date(2099, 11, 31);
          locationFlexiClients.push({ seats, start: cStart, end: cEnd });
        }
      }
    }

    // Calculate peak occupancy across the days in the date range
    let peakBookedSeats = 0;
    const curDay = new Date(rangeStart);

    while (curDay <= rangeEnd) {
      const dayStart = new Date(curDay);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(curDay);
      dayEnd.setUTCHours(23, 59, 59, 999);

      let dayBooked = 0;
      // Online bookings / passes
      for (const b of overlappingBookings) {
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        if (bStart <= dayEnd && bEnd >= dayStart) {
          dayBooked += (b.seats || 1);
        }
      }

      // Existing Client Master active corporate flexi desk clients
      for (const cm of locationFlexiClients) {
        if (cm.start <= dayEnd && cm.end >= dayStart) {
          dayBooked += cm.seats;
        }
      }

      if (dayBooked > peakBookedSeats) {
        peakBookedSeats = dayBooked;
      }

      // Move to next day
      curDay.setUTCDate(curDay.getUTCDate() + 1);
    }

    const availableSeats = Math.max(0, totalCapacity - peakBookedSeats);

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        locationId: product.location.id,
        locationName: product.location.name,
        locationAddress: product.location.address || `${product.location.name}, Ahmedabad`,
        totalCapacity,
        bookedSeats: peakBookedSeats,
        availableSeats,
        isAvailable: availableSeats > 0,
        startDate: rangeStart.toISOString().split('T')[0],
        endDate: rangeEnd.toISOString().split('T')[0],
      },
    });
  } catch (error: any) {
    console.error('[PASS_AVAILABILITY_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check pass availability' },
      { status: 500 }
    );
  }
}
