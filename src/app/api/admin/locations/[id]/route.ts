import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/locations/[id] ──────────────────────────────────────────
export const GET = withPermission('locations', 'read', async (
  _req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;
    const locationId = parseInt(id, 10);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        email: true,
        mapUrl: true,
        mapEmbed: true,
        isActive: true,
        sortOrder: true,
        city: { select: { id: true, name: true, slug: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('[LOCATION_READ_ONE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/locations/[id] ────────────────────────────────────────
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
    const locationId = parseInt(id, 10);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    // 2. Check existence
    const existing = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    // 3. Update + activity log
    const location = await prisma.$transaction(async (tx) => {
      const updated = await tx.location.update({
        where: { id: locationId },
        data: {
          ...(body.name      !== undefined && { name:      String(body.name) }),
          ...(body.slug      !== undefined && { slug:      String(body.slug) }),
          ...(body.cityId    !== undefined && { cityId:    parseInt(String(body.cityId), 10) }),
          ...(body.address   !== undefined && { address:   String(body.address) }),
          ...(body.mapUrl    !== undefined && { mapUrl:    String(body.mapUrl) }),
          ...(body.mapEmbed  !== undefined && { mapEmbed:  String(body.mapEmbed) }),
          ...(body.phone     !== undefined && { phone:     String(body.phone) }),
          ...(body.email     !== undefined && { email:     String(body.email) }),
          ...(body.isActive  !== undefined && { isActive:  Boolean(body.isActive) }),
          ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          sortOrder: true,
          city: { select: { id: true, name: true } },
          updatedAt: true,
        },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'UPDATE',
          module:    'locations',
          recordId:  locationId,
          oldData:   JSON.stringify(existing),
          newData:   JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('[LOCATION_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── DELETE /api/admin/locations/[id] ───────────────────────────────────────
// Soft delete (sets isActive: false)
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
    const locationId = parseInt(id, 10);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    // 2. Check existence
    const existing = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 3. Soft delete + activity log
    await prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id: locationId },
        data: { isActive: false },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'locations',
          recordId:  locationId,
          oldData:   JSON.stringify(existing),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Location deactivated successfully' } });
  } catch (error) {
    console.error('[LOCATION_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
