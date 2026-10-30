import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

// ─── PUT: Update Inquiry details, status, or notes ────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCrmOrAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: idStr } = await params;
    const inquiryId = parseInt(idStr, 10);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: 'Invalid inquiry ID' }, { status: 400 });
    }

    const existing = await prisma.crmInquiry.findUnique({
      where: { id: inquiryId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Inquiry record not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.clientName !== undefined) updateData.clientName = String(body.clientName).trim();
    if (body.companyName !== undefined) updateData.companyName = body.companyName ? String(body.companyName).trim() : null;
    if (body.natureOfBusiness !== undefined) updateData.natureOfBusiness = body.natureOfBusiness ? String(body.natureOfBusiness).trim() : null;
    if (body.companyGeography !== undefined) updateData.companyGeography = body.companyGeography;
    if (body.phone !== undefined) updateData.phone = String(body.phone).trim();
    if (body.email !== undefined) updateData.email = String(body.email).trim().toLowerCase();
    if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress ? String(body.companyAddress).trim() : null;
    if (body.centreRequired !== undefined) updateData.centreRequired = String(body.centreRequired).trim();
    if (body.whatRequired !== undefined) {
      updateData.whatRequired = String(body.whatRequired).trim();
      if (updateData.whatRequired.toLowerCase().includes('virtual')) {
        updateData.noOfSeats = 0;
      }
    }
    if (body.noOfSeats !== undefined && !updateData.whatRequired?.toLowerCase().includes('virtual')) {
      updateData.noOfSeats = parseInt(String(body.noOfSeats), 10) || 0;
    }
    if (body.budget !== undefined) updateData.budget = body.budget ? String(body.budget).trim() : null;
    if (body.otherRequirements !== undefined) updateData.otherRequirements = body.otherRequirements ? String(body.otherRequirements).trim() : null;
    if (body.reference !== undefined) updateData.reference = body.reference ? String(body.reference).trim() : null;
    if (body.leadAssignedTo !== undefined) updateData.leadAssignedTo = String(body.leadAssignedTo).trim();
    if (body.remarks !== undefined) updateData.remarks = body.remarks ? String(body.remarks).trim() : null;
    if (body.status !== undefined) updateData.status = String(body.status).trim();
    if (body.inquiryDate !== undefined && body.inquiryDate) updateData.inquiryDate = new Date(body.inquiryDate);

    const updated = await prisma.crmInquiry.update({
      where: { id: inquiryId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Inquiry #${updated.srNo} updated successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('[CRM Inquiry PUT Error]:', error);
    return NextResponse.json({ error: 'Failed to update inquiry' }, { status: 500 });
  }
}

// ─── DELETE: Delete Inquiry ───────────────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateCrmOrAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: idStr } = await params;
    const inquiryId = parseInt(idStr, 10);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ error: 'Invalid inquiry ID' }, { status: 400 });
    }

    await prisma.crmInquiry.delete({
      where: { id: inquiryId },
    });

    return NextResponse.json({
      success: true,
      message: 'Inquiry record removed',
    });
  } catch (error) {
    console.error('[CRM Inquiry DELETE Error]:', error);
    return NextResponse.json({ error: 'Failed to delete inquiry' }, { status: 500 });
  }
}
