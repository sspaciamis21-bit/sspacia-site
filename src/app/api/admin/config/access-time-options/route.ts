import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

export const GET = withPermission('settings', 'read', async () => {
  try {
    const data = await prisma.accessTimeOption.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[ACCESS_TIME_OPTIONS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withPermission('settings', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const { name, displayName, startTime, endTime, isActive } = body;

    if (!name || !displayName) {
      return NextResponse.json({ error: 'Name and displayName are required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.accessTimeOption.create({
        data: {
          name,
          displayName,
          startTime,
          endTime,
          isActive: isActive !== false,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),
          action: 'CREATE',
          module: 'settings',
          recordId: created.id,
          newData: JSON.stringify(created),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return created;
    });

    return NextResponse.json({ data: result, message: 'Created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('[ACCESS_TIME_OPTIONS_CREATE]', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Access time option already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PATCH = withPermission('settings', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.accessTimeOption.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.accessTimeOption.update({
        where: { id },
        data: {
          name: body.name,
          displayName: body.displayName,
          startTime: body.startTime,
          endTime: body.endTime,
          isActive: body.isActive,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: Number(payload.id),
          action: 'UPDATE',
          module: 'settings',
          recordId: id,
          oldData: JSON.stringify(existing),
          newData: JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[ACCESS_TIME_OPTIONS_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
