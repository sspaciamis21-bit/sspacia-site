import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const CENTRE_DETAILS: Record<string, { name: string; address: string; area: string }> = {
  'agarwal-complex': {
    name: 'Agarwal Complex',
    address: 'Agarwal Complex, Chimanlal Girdharlal Rd, Navrangpura, Ahmedabad, Gujarat 380009',
    area: 'CG Road',
  },
  'mercardo': {
    name: 'Mercado',
    address: '6th Floor, Mercado, Chimanlal Girdharlal Rd, opp. Municipal Market, Vasant Vihar, Ellisbridge, Ahmedabad, Gujarat 380009',
    area: 'CG Road',
  },
  'premier-house': {
    name: 'Premier House',
    address: 'Premier House, Opp. Gurudwara, SG Highway, Ahmedabad, Gujarat 380054',
    area: 'SG Highway',
  },
};

export async function POST(request: Request) {
  try {
    // ── Authentication Check ──
    const authPayload = await requireAuth();
    if (!authPayload?.id) {
      return NextResponse.json(
        { error: 'Please sign in or create an account to book your Virtual Office.' },
        { status: 401 }
      );
    }
    const createdById = Number(authPayload.id);

    const body = await request.json();
    const {
      companyName,
      contactName,
      contactPhone,
      contactEmail,
      centreKey = 'agarwal-complex',
      duration = '12 Months',
      planMonths = 12,
      gstStatus = 'UNREGISTERED',
      gstNo,
      hoAddress,
      hoCity = 'Ahmedabad',
      hoState = 'Gujarat',
      hoPinCode,
      notes,
    } = body;

    // Validation
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'Company or Business Name is required' }, { status: 400 });
    }
    if (!contactName || !contactName.trim()) {
      return NextResponse.json({ error: 'Contact person name is required' }, { status: 400 });
    }
    if (!contactPhone || !contactPhone.trim()) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }
    if (!contactEmail || !contactEmail.trim()) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    const centre = CENTRE_DETAILS[centreKey] || CENTRE_DETAILS['agarwal-complex'];
    const months = Number(planMonths) > 0 ? Number(planMonths) : 12;

    // Compute dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    // Get next Sr No
    const lastRecord = await (prisma as any).clientMaster.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    const nextSrNo = lastRecord ? lastRecord.srNo + 1 : 1;

    // Generate unique VO Client ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const clientId = `SSP-VO-${randomSuffix}`;

    const durationLabel = months >= 12 ? 'YEARLY' : months >= 6 ? 'HALF_YEARLY' : 'MONTHLY';
    const voCabinName = `Virtual Office - ${centre.name} (${centre.area})`;

    // Create Client Master record with clientType: 'VIRTUAL_OFFICE'
    const newEntry = await (prisma as any).clientMaster.create({
      data: {
        srNo: nextSrNo,
        companyName: companyName.trim(),
        hoAddress: hoAddress ? hoAddress.trim() : centre.address,
        hoCity: hoCity || 'Ahmedabad',
        hoState: hoState || 'Gujarat',
        hoPinCode: hoPinCode || null,
        gstStatus: gstNo && gstNo.trim() ? 'REGISTERED' : gstStatus,
        gstNo: gstNo ? gstNo.trim().toUpperCase() : null,
        agreementStartDate: startDate,
        agreementEndDate: endDate,
        cabinName: voCabinName,
        noOfSeats: 0,
        ratePerAgreement: '0',
        amount: '0',
        gstPercent: '18',
        totalAmount: '0',
        paymentDueDay: startDate.getDate(),
        clientStatus: 'Active',
        clientType: 'VIRTUAL_OFFICE',
        clientId: clientId,
        createdById: createdById,
        contactPersons: {
          create: [
            {
              name: contactName.trim(),
              designation: 'Director / Authorized Signatory',
              mobileNo: contactPhone.trim(),
              email: contactEmail.trim().toLowerCase(),
              sortOrder: 0,
            },
          ],
        },
        products: {
          create: [
            {
              cabinName: voCabinName,
              noOfSeats: 0,
              ratePerAgreement: '0',
              amount: '0',
              gstPercent: '18',
              totalAmount: '0',
              paymentDuration: durationLabel,
              paymentDueDay: startDate.getDate(),
              firstPaymentDate: startDate,
              agreementStartDate: startDate,
              agreementEndDate: endDate,
              billingType: 'REGULAR',
              sortOrder: 0,
            },
          ],
        },
      },
      include: {
        contactPersons: true,
        products: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newEntry.id,
        clientId: newEntry.clientId,
        companyName: newEntry.companyName,
        centre: `${centre.name} (${centre.area})`,
        address: centre.address,
        duration: duration || `${months} Months`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        message: 'Virtual Office registration received successfully! Welcome to SSPACIA.',
      },
    });
  } catch (error: any) {
    console.error('Virtual office public order error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process virtual office order' },
      { status: 500 }
    );
  }
}
