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
 * GET /api/careers/positions
 * Returns job positions for public careers page and HR portal
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('all') === 'true';

    const user = await getAuthUser();
    const isHrOrAdmin =
      user?.role?.name === 'HR' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'SUPER_ADMIN';

    const where = showAll && isHrOrAdmin ? {} : { isActive: true };

    const positions = await (prisma as any).jobPosition.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    return NextResponse.json({ success: true, positions });
  } catch (error: any) {
    console.error('Error fetching job positions:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch positions' }, { status: 500 });
  }
}

/**
 * POST /api/careers/positions
 * Create a new job opening (HR / Admin only)
 */
export async function POST(req: Request) {
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
    const { title, openings, gender, description, location = 'CG Road, Ahmedabad', isActive = true, sortOrder = 0 } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Position Title is required' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Position Description is required' }, { status: 400 });
    }

    const newPosition = await (prisma as any).jobPosition.create({
      data: {

        title: title.trim(),
        openings: openings ? openings.trim() : '1 Opening',
        gender: gender ? gender.trim() : 'Male / Female',
        description: description.trim(),
        location: location.trim(),
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
      },
    });

    return NextResponse.json({ success: true, position: newPosition }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating job position:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create position' }, { status: 500 });
  }
}
