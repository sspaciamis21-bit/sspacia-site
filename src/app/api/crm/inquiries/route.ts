import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper to authenticate CRM or Admin
async function authenticateCrmOrAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) {
    return { authorized: false, error: 'Unauthorized: No token provided', status: 401 };
  }

  const payload = await verifyToken(token);
  if (!payload?.id) {
    return { authorized: false, error: 'Unauthorized: Invalid token', status: 401 };
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.id) },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    return { authorized: false, error: 'Unauthorized: User inactive or not found', status: 401 };
  }

  const roleName = (user.role?.name || '').toUpperCase();
  const userName = (user.name || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase();

  const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN' || roleName === 'SUPER-ADMIN';
  const isCrm =
    roleName === 'CRM' ||
    roleName.includes('CRM') ||
    roleName.includes('RELATION') ||
    userName.includes('customer relation') ||
    userName.includes('crm') ||
    userEmail.includes('crm');

  if (!isSuperAdmin && !isCrm) {
    return {
      authorized: false,
      error: 'Forbidden: This section is exclusively accessible to Customer Relationship Managers (CRM)',
      status: 403,
    };
  }

  return { authorized: true, user, isSuperAdmin, isCrm };
}

// ─── GET: Fetch Inquiries with Multi-Filter, Search, KPI stats & Next SR No ───
export async function GET(request: Request) {
  try {
    const auth = await authenticateCrmOrAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const centre = searchParams.get('centre') || 'ALL';
    const geography = searchParams.get('geography') || 'ALL';
    const status = searchParams.get('status') || 'ALL';
    const assigned = searchParams.get('assigned') || 'ALL';
    const reference = searchParams.get('reference') || 'ALL';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { whatRequired: { contains: search } },
        { natureOfBusiness: { contains: search } },
      ];
    }

    if (centre && centre !== 'ALL') {
      where.centreRequired = centre;
    }

    if (geography && geography !== 'ALL') {
      where.companyGeography = geography;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (assigned && assigned !== 'ALL') {
      where.leadAssignedTo = assigned;
    }

    if (reference && reference !== 'ALL') {
      where.reference = reference;
    }

    if (startDate || endDate) {
      where.inquiryDate = {};
      if (startDate) {
        where.inquiryDate.gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        where.inquiryDate.lte = eDate;
      }
    }

    // Fetch inquiries
    const inquiries = await prisma.crmInquiry.findMany({
      where,
      orderBy: [
        { inquiryDate: 'desc' },
        { srNo: 'desc' },
      ],
    });

    // Compute KPI telemetry across all inquiries
    const allInquiries = await prisma.crmInquiry.findMany({
      select: {
        id: true,
        centreRequired: true,
        companyGeography: true,
        status: true,
        leadAssignedTo: true,
        inquiryDate: true,
        srNo: true,
      },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const kpis = {
      total: allInquiries.length,
      today: allInquiries.filter((inq) => new Date(inq.inquiryDate) >= todayStart).length,
      byCentre: {
        Mercado: allInquiries.filter((i) => i.centreRequired === 'Mercado').length,
        'Agarwal Complex': allInquiries.filter((i) => i.centreRequired === 'Agarwal Complex').length,
        'Premier House': allInquiries.filter((i) => i.centreRequired === 'Premier House').length,
      },
      byGeography: {
        Local: allInquiries.filter((i) => i.companyGeography === 'Local').length,
        National: allInquiries.filter((i) => i.companyGeography === 'National').length,
        MNC: allInquiries.filter((i) => i.companyGeography === 'MNC').length,
      },
      byStatus: allInquiries.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
      byAssigned: allInquiries.reduce((acc: Record<string, number>, item) => {
        acc[item.leadAssignedTo] = (acc[item.leadAssignedTo] || 0) + 1;
        return acc;
      }, {}),
    };

    // Calculate next available SR No
    const maxSrRecord = await prisma.crmInquiry.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    const nextSrNo = maxSrRecord ? maxSrRecord.srNo + 1 : 1;

    return NextResponse.json({
      success: true,
      inquiries,
      kpis,
      nextSrNo,
    });
  } catch (error) {
    console.error('[CRM Inquiries GET Error]:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve CRM inquiries' },
      { status: 500 }
    );
  }
}

// ─── POST: Create New Inquiry (Form Modal or Table Direct Row Entry) ─────────
export async function POST(request: Request) {
  try {
    const auth = await authenticateCrmOrAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      clientName,
      companyName,
      natureOfBusiness,
      companyGeography = 'Local',
      phone,
      email,
      companyAddress,
      centreRequired,
      whatRequired,
      noOfSeats = 0,
      budget,
      otherRequirements,
      reference,
      leadAssignedTo = 'Praveen Agarwal',
      remarks,
      inquiryDate,
      status = 'NEW',
    } = body;

    // ─── Validations ─────────────────────────────────────────────
    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: 'Client Name is required' }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone Number is required' }, { status: 400 });
    }

    const cleanedPhone = phone.replace(/[^0-9]/g, '');
    if (cleanedPhone.length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number (minimum 10 digits)' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email Address is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (e.g. name@company.com)' },
        { status: 400 }
      );
    }

    if (!centreRequired || !centreRequired.trim()) {
      return NextResponse.json({ error: 'Centre Required selection is mandatory' }, { status: 400 });
    }

    if (!whatRequired || !whatRequired.trim()) {
      return NextResponse.json({ error: 'What Required product/cabin selection is mandatory' }, { status: 400 });
    }

    // Next sequential SR No
    const maxSrRecord = await prisma.crmInquiry.findFirst({
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });
    const calculatedSrNo = maxSrRecord ? maxSrRecord.srNo + 1 : 1;

    // Parse seats: 0 if Virtual Office
    const isVirtualOffice = whatRequired.toLowerCase().includes('virtual');
    const finalSeats = isVirtualOffice ? 0 : (parseInt(String(noOfSeats), 10) || 0);

    const createdInquiry = await prisma.crmInquiry.create({
      data: {
        srNo: calculatedSrNo,
        inquiryDate: inquiryDate ? new Date(inquiryDate) : new Date(),
        clientName: clientName.trim(),
        companyName: companyName ? companyName.trim() : null,
        natureOfBusiness: natureOfBusiness ? natureOfBusiness.trim() : null,
        companyGeography: ['Local', 'National', 'MNC'].includes(companyGeography) ? companyGeography : 'Local',
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        companyAddress: companyAddress ? companyAddress.trim() : null,
        centreRequired: centreRequired.trim(),
        whatRequired: whatRequired.trim(),
        noOfSeats: finalSeats,
        budget: budget ? String(budget).trim() : null,
        otherRequirements: otherRequirements ? otherRequirements.trim() : null,
        reference: reference ? reference.trim() : null,
        leadAssignedTo: leadAssignedTo ? leadAssignedTo.trim() : 'Praveen Agarwal',
        remarks: remarks ? remarks.trim() : null,
        status: status || 'NEW',
        createdById: auth.user?.id || null,
        createdByName: auth.user?.name || 'CRM Team',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Inquiry #${createdInquiry.srNo} successfully logged`,
        data: createdInquiry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[CRM Inquiries POST Error]:', error);
    return NextResponse.json(
      { error: 'Failed to create inquiry' },
      { status: 500 }
    );
  }
}
