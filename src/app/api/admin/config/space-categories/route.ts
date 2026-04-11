import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

const slugify = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

export const GET = withPermission('settings', 'read', async () => {
  try {
    const data = await prisma.spaceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('[SPACE_CATEGORIES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withPermission('settings', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const { name, displayName, description, isActive, sortOrder } = body;

    if (!name || !displayName) {
      return NextResponse.json({ error: 'Name and displayName are required' }, { status: 400 });
    }

    const slug = body.slug || slugify(name);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.spaceCategory.create({
        data: {
          name,
          displayName,
          slug,
          description,
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
  } catch (error: unknown) {
    console.error('[SPACE_CATEGORIES_CREATE]', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'Space category already exists' }, { status: 400 });
    }
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
      const existing = await tx.spaceCategory.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.spaceCategory.update({
        where: { id },
        data: {
          name: body.name,
          displayName: body.displayName,
          slug: body.slug || (body.name ? slugify(body.name) : undefined),
          description: body.description,
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
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('[SPACE_CATEGORIES_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
