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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const vendorId = parseInt(id, 10);
    if (isNaN(vendorId)) {
      return NextResponse.json({ success: false, error: 'Invalid vendor ID' }, { status: 400 });
    }

    const vendor = await prisma.vendorMaster.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, vendor });
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const vendorId = parseInt(id, 10);
    if (isNaN(vendorId)) {
      return NextResponse.json({ success: false, error: 'Invalid vendor ID' }, { status: 400 });
    }

    const existing = await prisma.vendorMaster.findUnique({
      where: { id: vendorId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      vendorName,
      address,
      email,
      mobileNo,
      gstin,
      pan,
      serviceType,
      locationName,
      notes,
      isActive,
    } = body;

    if (vendorName !== undefined && !vendorName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vendor Name cannot be empty.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (vendorName !== undefined) updateData.vendorName = vendorName.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (mobileNo !== undefined) updateData.mobileNo = mobileNo?.trim() || null;
    if (gstin !== undefined) updateData.gstin = gstin?.trim() || null;
    if (pan !== undefined) updateData.pan = pan?.trim() || null;
    if (serviceType !== undefined) updateData.serviceType = serviceType?.trim() || null;
    if (locationName !== undefined) updateData.locationName = locationName?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.vendorMaster.update({
      where: { id: vendorId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      vendor: updated,
      message: `Vendor "${updated.vendorName}" updated successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthorizedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const vendorId = parseInt(id, 10);
    if (isNaN(vendorId)) {
      return NextResponse.json({ success: false, error: 'Invalid vendor ID' }, { status: 400 });
    }

    const existing = await prisma.vendorMaster.findUnique({
      where: { id: vendorId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    await prisma.vendorMaster.delete({
      where: { id: vendorId },
    });

    return NextResponse.json({
      success: true,
      message: `Vendor "${existing.vendorName}" deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
