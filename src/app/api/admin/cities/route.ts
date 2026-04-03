import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/cities ────────────────────────────────────────────────────
export const GET = withPermission('locations', 'read', async () => {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        sortOrder: true,
        _count: { select: { locations: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: cities });
  } catch (error) {
    console.error('[CITIES_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/cities ───────────────────────────────────────────────────
export const POST = withPermission('locations', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const slug = String(body.slug ?? '').trim();

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
    }

    // Duplicate check
    const existing = await prisma.city.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'A city with this slug already exists' }, { status: 400 });
    }

    const city = await prisma.$transaction(async (tx) => {
      const c = await tx.city.create({
        data: {
          name,
          slug,
          isActive:  body.isActive  !== false,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        },
        select: { id: true, name: true, slug: true, isActive: true, sortOrder: true },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'locations',
          recordId:  c.id,
          newData:   JSON.stringify(c),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return c;
    });

    return NextResponse.json({ data: city, message: 'Created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[CITIES_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
