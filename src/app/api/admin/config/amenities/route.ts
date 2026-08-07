import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

const slugify = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

export const GET = withPermission('settings', 'read', async () => {
  try {
    const data = await prisma.amenity.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('[AMENITIES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withPermission('settings', 'update', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const body = await req.json();
    const { name, slug, icon, description, isActive, sortOrder } = body;

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const aSlug = slug || slugify(name);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.amenity.create({
        data: {
          name,
          slug: aSlug,
          icon,
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
  } catch (error: any) {
    console.error('[AMENITIES_CREATE]', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Slug/Name must be unique' }, { status: 400 });
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
      const existing = await tx.amenity.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.amenity.update({
        where: { id },
        data: {
          name: body.name,
          slug: body.slug || (body.name ? slugify(body.name) : undefined),
          icon: body.icon,
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
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (error.code === 'P2002') return NextResponse.json({ error: 'Slug/Name must be unique' }, { status: 400 });
    console.error('[AMENITIES_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withPermission('settings', 'update', async (req: NextRequest) => {
    try {
      const payload = await requireAuth();
      if (!payload?.id) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  
      const { searchParams } = new URL(req.url);
      const id = parseInt(searchParams.get('id') ?? '', 10);
      if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  
      await prisma.$transaction(async (tx) => {
        const existing = await tx.amenity.findUnique({ where: { id } });
        if (!existing) throw new Error('NOT_FOUND');
  
        await tx.amenity.delete({ where: { id } });
  
        await tx.activityLog.create({
          data: {
            userId: Number(payload.id),
            action: 'DELETE',
            module: 'settings',
            recordId: id,
            oldData: JSON.stringify(existing),
            ipAddress: req.headers.get('x-forwarded-for') ?? null,
          },
        });
      });
  
      return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      console.error('[AMENITIES_DELETE]', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
