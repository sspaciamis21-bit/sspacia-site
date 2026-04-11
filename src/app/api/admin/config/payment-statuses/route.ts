import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

export const GET = withPermission('settings', 'read', async () => {
  try {
    const data = await prisma.paymentStatus.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[PAYMENT_STATUSES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withPermission('settings', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const { name, displayName, color, isFinal, isActive, sortOrder } = body;

    if (!name || !displayName) {
      return NextResponse.json({ error: 'Name and displayName are required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentStatus.create({
        data: {
          name,
          displayName,
          color,
          isFinal: !!isFinal,
          isActive: isActive !== false,
          sortOrder: sortOrder ? Number(sortOrder) : 0,
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
    console.error('[PAYMENT_STATUSES_CREATE]', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Status already exists' }, { status: 400 });
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
      const existing = await tx.paymentStatus.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.paymentStatus.update({
        where: { id },
        data: {
          name: body.name,
          displayName: body.displayName,
          color: body.color,
          isFinal: body.isFinal,
          isActive: body.isActive,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
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
    console.error('[PAYMENT_STATUSES_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
