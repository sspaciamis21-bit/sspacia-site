import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/cities/[id] ───────────────────────────────────────────────
export const GET = withPermission('locations', 'read', async (
  _req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: 'Invalid city ID' }, { status: 400 });
    }

    const city = await prisma.city.findUnique({
      where: { id: cityId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { locations: true } },
      },
    });

    if (!city) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: city });
  } catch (error) {
    console.error('[CITY_READ_ONE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/cities/[id] ────────────────────────────────────────────
export const PATCH = withPermission('locations', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: 'Invalid city ID' }, { status: 400 });
    }

    const existing = await prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true, slug: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    const city = await prisma.$transaction(async (tx) => {
      const updated = await tx.city.update({
        where: { id: cityId },
        data: {
          ...(body.name      !== undefined && { name:      String(body.name) }),
          ...(body.slug      !== undefined && { slug:      String(body.slug) }),
          ...(body.isActive  !== undefined && { isActive:  Boolean(body.isActive) }),
          ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
        },
        select: { id: true, name: true, slug: true, isActive: true, updatedAt: true },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'UPDATE',
          module:    'locations',
          recordId:  cityId,
          oldData:   JSON.stringify(existing),
          newData:   JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: city });
  } catch (error) {
    console.error('[CITY_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── DELETE /api/admin/cities/[id] ───────────────────────────────────────────
export const DELETE = withPermission('locations', 'delete', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const cityId = parseInt(id, 10);
    if (isNaN(cityId)) {
      return NextResponse.json({ error: 'Invalid city ID' }, { status: 400 });
    }

    const existing = await prisma.city.findUnique({
      where: { id: cityId },
      select: { id: true, name: true, _count: { select: { locations: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing._count.locations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a city that still has active locations' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.city.update({ where: { id: cityId }, data: { isActive: false } });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'locations',
          recordId:  cityId,
          oldData:   JSON.stringify(existing),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'City deactivated successfully' } });
  } catch (error) {
    console.error('[CITY_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
