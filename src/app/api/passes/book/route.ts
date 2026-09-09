import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

function generatePassBookingNumber(passType: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const typeCode = passType === 'WEEKLY' ? 'WEEK' : 'DAY';
  return `PASS-${typeCode}-${dateStr}-${rand}`;
}

function formatDateDisplay(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * POST /api/passes/book
 * Books a Daily or Weekly Flexi Desk Pass.
 */
export async function POST(req: NextRequest) {
  try {
    const authPayload = await requireAuth().catch(() => null);
    const body = await req.json();

    const {
      productId,
      passType, // "DAILY" | "WEEKLY"
      startDate,
      endDate,
      seats = 1,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      companyAddress,
      companyGst,
      requestAgreement = false,
      remarks,
      screenshotData,
    } = body;

    const numSeats = Math.max(1, parseInt(String(seats), 10) || 1);
    const normalizedPassType = String(passType).toUpperCase() === 'WEEKLY' ? 'WEEKLY' : 'DAILY';

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    // 1. Fetch Product, Location & Units
    const product = await prisma.product.findUnique({
      where: { id: Number(productId), isActive: true },
      include: {
        location: { select: { id: true, name: true, address: true } },
        units: { select: { id: true, name: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Selected Flexi Desk product not found' }, { status: 404 });
    }

    // 2. Compute date range
    const rangeStart = new Date(startDate);
    rangeStart.setUTCHours(0, 0, 0, 0);

    let rangeEnd = new Date(rangeStart);
    if (normalizedPassType === 'WEEKLY') {
      // 1 week has 7 days: Start Date + 6 days
      rangeEnd = new Date(rangeStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      rangeEnd.setUTCHours(23, 59, 59, 999);
    } else {
      // 1 Day
      rangeEnd.setUTCHours(23, 59, 59, 999);
    }

    // 3. Compute Fixed Pricing: ₹500 + GST (Daily) or ₹4000 + GST (Weekly)
    const basePricePerSeat = normalizedPassType === 'WEEKLY' ? 4000 : 500;
    const subtotal = basePricePerSeat * numSeats;
    const sgst = (subtotal * 9) / 100;
    const cgst = (subtotal * 9) / 100;
    const taxRate = 18;
    const taxAmount = sgst + cgst;
    const grandTotal = subtotal + taxAmount;

    // 4. Check seat availability for this date range
    const totalCapacity = product.units.length > 0 ? product.units.length : (product.capacity || 20);

    const overlappingBookings = await prisma.booking.findMany({
      where: {
        productId: product.id,
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart },
        status: {
          name: { notIn: ['CANCELLED', 'FAILED', 'REJECTED'] },
        },
      },
      select: { seats: true, startDate: true, endDate: true },
    });

    // Check active long-term corporate clients in ClientMaster occupying Flexi Desks
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

    // Check peak day occupancy
    let peakBooked = 0;
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const dStart = new Date(cur);
      dStart.setUTCHours(0, 0, 0, 0);
      const dEnd = new Date(cur);
      dEnd.setUTCHours(23, 59, 59, 999);

      let dayBooked = 0;
      // Online bookings / passes
      for (const b of overlappingBookings) {
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        if (bStart <= dEnd && bEnd >= dStart) {
          dayBooked += (b.seats || 1);
        }
      }

      // Existing Client Master active corporate flexi desk clients
      for (const cm of locationFlexiClients) {
        if (cm.start <= dEnd && cm.end >= dStart) {
          dayBooked += cm.seats;
        }
      }

      if (dayBooked > peakBooked) peakBooked = dayBooked;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const availableSeats = Math.max(0, totalCapacity - peakBooked);
    if (numSeats > availableSeats) {
      return NextResponse.json(
        {
          error: `Only ${availableSeats} seat${availableSeats === 1 ? '' : 's'} available for the selected dates. Please adjust your quantity.`,
          availableSeats,
        },
        { status: 409 }
      );
    }

    // 5. Lookup or create Customer
    const effectiveEmail = (customerEmail || authPayload?.email || '').trim().toLowerCase();
    const effectiveName = (customerName || authPayload?.name || effectiveEmail.split('@')[0] || 'Client').trim();
    const effectivePhone = (customerPhone || authPayload?.phone || '').trim();

    if (!effectiveEmail) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 });
    }

    let customer = await prisma.customer.findUnique({
      where: { email: effectiveEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: effectiveEmail,
          name: effectiveName,
          phone: effectivePhone || undefined,
          organization: companyName || undefined,
          billingAddress: companyAddress || undefined,
          gstNumber: companyGst || undefined,
        },
      });
    } else {
      // Update customer details if company info was provided
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: effectiveName || customer.name,
          phone: effectivePhone || customer.phone,
          organization: companyName || customer.organization,
          billingAddress: companyAddress || customer.billingAddress,
          gstNumber: companyGst || customer.gstNumber,
        },
      });
    }

    // 6. Get duration type ID
    const durationTypeName = normalizedPassType === 'WEEKLY' ? 'PER_WEEK' : 'PER_DAY';
    const durationType = await prisma.durationType.findFirst({
      where: { name: durationTypeName },
    });
    const durationTypeId = durationType?.id || (normalizedPassType === 'WEEKLY' ? 4 : 3);

    // 7. Get initial booking status (PENDING if ICICI QR / UTR submitted, else CONFIRMED)
    const pendingStatus = await prisma.bookingStatus.findFirst({ where: { name: 'PENDING' } });
    const confirmedStatus = await prisma.bookingStatus.findFirst({ where: { name: 'CONFIRMED' } });
    const statusId = remarks ? (pendingStatus?.id ?? 1) : (confirmedStatus?.id ?? 2);

    const bookingNumber = generatePassBookingNumber(normalizedPassType);

    // 8. Create Booking record
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId: customer.id,
        productId: product.id,
        durationTypeId,
        statusId,
        startDate: rangeStart,
        endDate: rangeEnd,
        durationUnits: 1,
        seats: numSeats,
        unitPrice: basePricePerSeat,
        totalAmount: subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        notes: `Flexi Desk ${normalizedPassType === 'WEEKLY' ? 'Weekly Pass' : 'Daily Pass'} (${numSeats} Seat${numSeats > 1 ? 's' : ''}) | Company: ${companyName || 'Individual'}${companyGst ? ` | GST: ${companyGst}` : ''}${remarks ? ` | UTR: ${remarks}` : ''}${requestAgreement ? ' | [Agreement Requested]' : ''}`,
      },
    });

    // 9. If payment remarks / screenshot submitted, record QrBooking
    if (remarks) {
      await (prisma as any).qrBooking.create({
        data: {
          bookingNumber: booking.bookingNumber,
          bookingId: booking.id,
          customerId: customer.id,
          customerName: effectiveName,
          customerEmail: effectiveEmail,
          customerPhone: effectivePhone || 'N/A',
          productId: product.id,
          productName: product.name,
          locationId: product.location.id,
          locationName: product.location.name,
          startDate: rangeStart,
          endDate: rangeEnd,
          durationUnits: 1,
          seats: numSeats,
          subtotal,
          taxAmount,
          grandTotal,
          remarks: remarks.trim(),
          screenshotData: screenshotData || null,
          status: 'PENDING',
        },
      });
    }

    // 10. If agreement requested, record ContractRequest
    if (requestAgreement) {
      try {
        await prisma.contractRequest.create({
          data: {
            customerId: customer.id,
            bookingId: booking.id,
            requestNote: `Short-Term Pass Agreement requested for ${normalizedPassType === 'WEEKLY' ? 'Weekly Pass' : 'Daily Pass'} (${numSeats} seats at ${product.location.name})`,
            status: 'PENDING',
          },
        });
      } catch (err) {
        console.warn('[CONTRACT_REQUEST_WARN]', err);
      }
    }

    // 11. Dispatch Email Notifications
    const formattedDateRange =
      normalizedPassType === 'WEEKLY'
        ? `${formatDateDisplay(rangeStart)} to ${formatDateDisplay(rangeEnd)} (7 Days)`
        : formatDateDisplay(rangeStart);

    const emailSubject = `New Flexi Desk ${normalizedPassType === 'WEEKLY' ? 'Weekly' : 'Daily'} Pass Booking: ${bookingNumber} - ${product.location.name}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background-color: #006064; padding: 24px 32px; text-align: left; border-bottom: 3px solid #1ab0bc;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
            SSPACIA PASS RESERVATION
          </h1>
          <p style="color: #80deea; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">
            Flexi Desk ${normalizedPassType === 'WEEKLY' ? 'Weekly Pass (7 Days)' : 'Daily Pass'} Confirmed
          </p>
        </div>

        <div style="padding: 28px 32px; color: #1e293b; line-height: 1.6;">

          <!-- Booking Summary Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Booking ID:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #006064; font-family: monospace; font-size: 14px;">${bookingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Pass Type:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${normalizedPassType === 'WEEKLY' ? 'Weekly Pass (7 Continuous Days)' : 'Daily Pass (1 Day Access)'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Centre / Location:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${product.location.name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Space & Seats:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #006064;">Flexi Desk — ${numSeats} Seat${numSeats > 1 ? 's' : ''}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Duration / Date:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${formattedDateRange}</td>
              </tr>
              ${
                remarks
                  ? `<tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Payment UTR:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0284c7; font-family: monospace;">${remarks}</td>
              </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px;">Agreement Request:</td>
                <td style="padding: 6px 0; font-weight: 600; color: ${requestAgreement ? '#059669' : '#64748b'};">${requestAgreement ? 'Requested (Short-Term 1-Page Agreement)' : 'Standard Booking'}</td>
              </tr>
            </table>
          </div>

          <!-- Client Details Section -->
          <h2 style="font-size: 14px; font-weight: 700; color: #006064; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px;">
            Client Details
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">Name:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${effectiveName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Email:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;"><a href="mailto:${effectiveEmail}" style="color: #006064; text-decoration: none;">${effectiveEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Phone:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${effectivePhone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Company Name:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${companyName || 'Individual / Personal'}</td>
            </tr>
            ${
              companyAddress
                ? `<tr>
              <td style="padding: 6px 0; color: #64748b;">Registered Office:</td>
              <td style="padding: 6px 0; color: #0f172a;">${companyAddress}</td>
            </tr>`
                : ''
            }
            ${
              companyGst
                ? `<tr>
              <td style="padding: 6px 0; color: #64748b;">GST Number:</td>
              <td style="padding: 6px 0; font-weight: 600; font-family: monospace; color: #0f172a;">${companyGst}</td>
            </tr>`
                : ''
            }
          </table>

          <!-- Financial Breakdown -->
          <h2 style="font-size: 14px; font-weight: 700; color: #006064; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px;">
            Pricing &amp; Tax Invoice Breakdown
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Rate per Seat:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">₹${basePricePerSeat.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Quantity:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">${numSeats} Seat${numSeats > 1 ? 's' : ''}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Base Subtotal:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">₹${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">SGST (9%):</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">₹${sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">CGST (9%):</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600;">₹${cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="border-top: 2px solid #006064;">
              <td style="padding: 10px 0; font-weight: 700; font-size: 15px; color: #006064;">Grand Total:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 700; font-size: 18px; color: #006064;">₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>

          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin-top: 24px; font-size: 12px; color: #065f46;">
            <strong>Pass Validity:</strong> Access is granted from ${formattedDateRange} at SSPACIA ${product.location.name}. Please present this booking number at the front reception.
          </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          SSPACIA Coworking Spaces • Ahmedabad, Gujarat • <a href="https://sspacia.in" style="color: #006064; text-decoration: none;">sspacia.in</a>
        </div>
      </div>
    `;

    // Send email to praveen.agarwal1@gmail.com with CC to sales@sspacia.com
    await sendEmail({
      to: 'praveen.agarwal1@gmail.com',
      cc: 'sales@sspacia.com',
      subject: emailSubject,
      html: emailHtml,
    }).catch((err) => console.error('[EMAIL_NOTIFICATION_FAILED]', err));

    // Also dispatch copy to customer if not identical
    if (effectiveEmail !== 'praveen.agarwal1@gmail.com' && effectiveEmail !== 'sales@sspacia.com') {
      await sendEmail({
        to: effectiveEmail,
        subject: `Your SSPACIA Flexi Desk Pass: ${bookingNumber}`,
        html: emailHtml,
      }).catch((err) => console.error('[CUSTOMER_EMAIL_FAILED]', err));
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        productName: product.name,
        locationName: product.location.name,
        passType: normalizedPassType,
        seats: numSeats,
        startDate: rangeStart.toISOString().split('T')[0],
        endDate: rangeEnd.toISOString().split('T')[0],
        grandTotal,
        status: remarks ? 'PENDING' : 'CONFIRMED',
      },
    });
  } catch (error: any) {
    console.error('[PASS_BOOKING_ERROR]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete pass booking' },
      { status: 500 }
    );
  }
}
