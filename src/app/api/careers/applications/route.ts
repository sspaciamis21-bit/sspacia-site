import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

async function getAuthUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload?.id) return null;
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: { role: true },
    });
    return user;
  } catch {
    return null;
  }
}

/**
 * GET /api/careers/applications
 * Returns candidate applications (HR / Admin only)
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    const isHrOrAdmin =
      user?.role?.name === 'HR' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'SUPER_ADMIN';

    if (!user || !isHrOrAdmin) {
      return NextResponse.json({ error: 'Unauthorized. HR access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const position = searchParams.get('position');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (position && position !== 'ALL') {
      where.appliedPosition = position;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { mobileNo: { contains: q } },
        { qualification: { contains: q } },
        { experience: { contains: q } },
        { appliedPosition: { contains: q } },
      ];
    }

    const applications = await (prisma as any).careerApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        jobPosition: {
          select: { id: true, title: true, openings: true, gender: true },
        },
      },
    });

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch applications' }, { status: 500 });
  }
}

/**
 * PUT /api/careers/applications
 * Update status or notes of a candidate application
 */
export async function PUT(req: Request) {
  try {
    const user = await getAuthUser();
    const isHrOrAdmin =
      user?.role?.name === 'HR' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'SUPER_ADMIN';

    if (!user || !isHrOrAdmin) {
      return NextResponse.json({ error: 'Unauthorized. HR access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    const updated = await (prisma as any).careerApplication.update({
      where: { id: Number(id) },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });


    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error('Error updating application:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update application' }, { status: 500 });
  }
}
