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
  'mercado': {
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

    // Enforce fixed 12-month tenure and ₹24,000 yearly rate (Address Usage Only, 0% GST)
    const centre = CENTRE_DETAILS[centreKey] || CENTRE_DETAILS['agarwal-complex'];
    const months = 12;

    // Compute dates (Strictly 1 Year)
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Get next Sr No
    const lastRecord = await (prisma as any).clientMaster.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    const nextSrNo = lastRecord ? lastRecord.srNo + 1 : 1;

    // Generate unique VO Client ID
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const clientId = `SSP-VO-${randomSuffix}`;

    const voCabinName = `Virtual Office - ${centre.name} (${centre.area})`;

    // Create Client Master record with clientType: 'VIRTUAL_OFFICE', fixed rate 24,000, 0% GST, YEARLY
    const newEntry = await (prisma as any).clientMaster.create({
      data: {
        srNo: nextSrNo,
        companyName: companyName.trim(),
        hoAddress: hoAddress ? hoAddress.trim() : centre.address,
        hoCity: hoCity || 'Ahmedabad',
        hoState: hoState || 'Gujarat',
        hoPinCode: hoPinCode || null,
        gstStatus: 'UNREGISTERED',
        gstNo: null,
        agreementStartDate: startDate,
        agreementEndDate: endDate,
        cabinName: voCabinName,
        noOfSeats: 0,
        ratePerAgreement: '24000',
        amount: '24000',
        gstPercent: '0',
        totalAmount: '24000',
        paymentDueDay: startDate.getDate(),
        clientStatus: 'Active',
        clientType: 'VIRTUAL_OFFICE',
        clientId: clientId,
        createdById: createdById,
        contactPersons: {
          create: [
            {
              name: contactName.trim(),
              designation: 'Authorized Representative',
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
              ratePerAgreement: '24000',
              amount: '24000',
              gstPercent: '0',
              totalAmount: '24000',
              paymentDuration: 'YEARLY',
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

    // Create initial InvoiceRecord for ₹24,000 (0% GST for Address Usage)
    const billingMonth = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    try {
      await (prisma as any).invoiceRecord.create({
        data: {
          clientMasterId: newEntry.id,
          srNo: nextSrNo,
          companyName: newEntry.companyName,
          cabinName: voCabinName,
          noOfSeats: 0,
          ratePerAgreement: 24000,
          amount: 24000,
          gstPercent: 0,
          totalAmount: 24000,
          paymentDuration: 'YEARLY',
          paymentDueDay: startDate.getDate(),
          dueDate: startDate,
          productGroupKey: 'VIRTUAL_OFFICE_ANNUAL',
          itemsJson: JSON.stringify([
            {
              description: `Virtual Office Annual Membership - ${centre.name} (${centre.area}) [Commercial Address & Mail Handling Only]`,
              amount: 24000,
              gstPercent: 0,
              totalAmount: 24000,
            },
          ]),
          billingMonth,
          status: 'APPROVED',
          createdById: createdById,
        },
      });
    } catch (invErr) {
      console.warn('Could not auto-create VO invoiceRecord:', invErr);
    }

    // Also update User profile if companyName is not yet populated
    try {
      await (prisma as any).user.update({
        where: { id: createdById },
        data: {
          companyName: companyName.trim(),
          phone: contactPhone.trim(),
        },
      });
    } catch {
      // Ignore if user cannot be updated
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newEntry.id,
        clientId: newEntry.clientId,
        companyName: newEntry.companyName,
        centre: `${centre.name} (${centre.area})`,
        address: centre.address,
        duration: '1 Year (Annual)',
        rate: 24000,
        gstPercent: 0,
        totalAmount: 24000,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        message: 'Virtual Office registration activated successfully! Welcome to SSPACIA.',
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
