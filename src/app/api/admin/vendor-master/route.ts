import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getAuthorizedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    const role = (payload.role as string || '').toUpperCase();
    const email = (payload.email as string || '').toLowerCase();
    const isAccountant =
      email === 'ssinfrazone21@gmail.com' ||
      role === 'ACCOUNTS' ||
      role === 'ACCOUNTANT';
    const isSuperAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPER-ADMIN';
    const isCM = role === 'COMMUNITY_MANAGER' || role === 'MANAGER';

    if (!isSuperAdmin && !isCM && !isAccountant) {
      return null;
    }

    return {
      id: Number(payload.id),
      name: (payload.name as string) || (payload.email as string) || 'User',
      email,
      role,
      isSuperAdmin,
      isCM,
      isAccountant,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || 'ALL'; // ALL | ACTIVE | INACTIVE
    const serviceType = searchParams.get('serviceType')?.trim() || 'ALL';

    const where: any = {};

    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    if (serviceType && serviceType !== 'ALL') {
      where.serviceType = serviceType;
    }

    if (search) {
      where.OR = [
        { vendorName: { contains: search } },
        { mobileNo: { contains: search } },
        { email: { contains: search } },
        { address: { contains: search } },
        { gstin: { contains: search } },
        { pan: { contains: search } },
        { serviceType: { contains: search } },
        { locationName: { contains: search } },
      ];
    }

    const [vendors, locations] = await Promise.all([
      prisma.vendorMaster.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.location.findMany({
        select: {
          id: true,
          name: true,
          city: { select: { name: true } },
        },
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const formattedLocations = locations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      cityName: loc.city?.name || null,
    }));

    return NextResponse.json({
      success: true,
      vendors,
      locations: formattedLocations,
      total: vendors.length,
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vendor records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vendorName,
      address,
      email,
      mobileNo,
      accountNo,
      ifscCode,
      bankName,
      gstin,
      pan,
      serviceType,
      locationName,
      notes,
      isActive,
    } = body;

    if (!vendorName || !vendorName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vendor Name is required.' },
        { status: 400 }
      );
    }

    if (!mobileNo || !mobileNo.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mobile Number is mandatory.' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email Address is mandatory.' },
        { status: 400 }
      );
    }

    const created = await (prisma as any).vendorMaster.create({
      data: {
        vendorName: vendorName.trim(),
        address: address?.trim() || null,
        email: email.trim(),
        mobileNo: mobileNo.trim(),
        accountNo: accountNo?.trim() || null,
        ifscCode: ifscCode?.trim() || null,
        bankName: bankName?.trim() || null,
        gstin: gstin?.trim() || null,
        pan: pan?.trim() || null,
        serviceType: serviceType?.trim() || null,
        locationName: locationName?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdById: user.id,
        createdByName: user.name,
      },
    });

    return NextResponse.json({
      success: true,
      vendor: created,
      message: `Vendor "${created.vendorName}" added successfully.`,
    });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create vendor record' },
      { status: 500 }
    );
  }
}
