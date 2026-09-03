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
 * PUT /api/careers/positions/[id]
 * Update an existing job opening
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    const isHrOrAdmin =
      user?.role?.name === 'HR' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'SUPER_ADMIN';

    if (!user || !isHrOrAdmin) {
      return NextResponse.json({ error: 'Unauthorized. HR access required.' }, { status: 403 });
    }

    const { id } = await params;
    const positionId = Number(id);
    if (!positionId || isNaN(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 });
    }

    const body = await req.json();
    const { title, openings, gender, description, location, isActive, sortOrder } = body;

    const existing = await (prisma as any).jobPosition.findUnique({
      where: { id: positionId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const updated = await (prisma as any).jobPosition.update({
      where: { id: positionId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(openings !== undefined ? { openings: openings.trim() } : {}),
        ...(gender !== undefined ? { gender: gender.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(location !== undefined ? { location: location.trim() } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      },
    });

    return NextResponse.json({ success: true, position: updated });
  } catch (error: any) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update position' }, { status: 500 });
  }
}

/**
 * DELETE /api/careers/positions/[id]
 * Delete a job opening
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser();
    const isHrOrAdmin =
      user?.role?.name === 'HR' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'SUPER_ADMIN';

    if (!user || !isHrOrAdmin) {
      return NextResponse.json({ error: 'Unauthorized. HR access required.' }, { status: 403 });
    }

    const { id } = await params;
    const positionId = Number(id);
    if (!positionId || isNaN(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID' }, { status: 400 });
    }

    await (prisma as any).jobPosition.delete({
      where: { id: positionId },
    });


    return NextResponse.json({ success: true, message: 'Position deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting position:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete position' }, { status: 500 });
  }
}
