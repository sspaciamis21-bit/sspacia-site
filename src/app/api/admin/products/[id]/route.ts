import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/products/[id] ────────────────────────────────────────────
export const GET = withPermission('products', 'read', async (
  _req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        isFeatured: true,
        capacity: true,
        quantity: true,
        sdr: true,
        adv: true,
        complementaryMeetingHours: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, name: true, slug: true } },
        type:     { select: { id: true, name: true, displayName: true } },
        category: { select: { id: true, name: true, displayName: true } },
        accessTime: { select: { id: true, name: true, displayName: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: { id: true, url: true, alt: true, isPrimary: true, sortOrder: true },
        },
        pricingPlans: {
          select: {
            id: true,
            price: true,
            oldPrice: true,
            discount: true,
            isActive: true,
            durationType: true,
          },
        },
        amenities: {
          select: {
            amenity: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('[PRODUCT_READ_ONE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/products/[id] ─────────────────────────────────────────
export const PATCH = withPermission('products', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // 2. Check existence
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    let sdrValue: number | undefined;
    let advValue: number | undefined;
    if (typeof body.sdrPlusAdv === 'string') {
      const parts = body.sdrPlusAdv.split('+').map((p) => parseInt(p.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        sdrValue = parts[0];
        advValue = parts[1];
      }
    }

    const meetingHours = body.complementaryMeetingRoom
      ? parseInt(String(body.complementaryMeetingRoom), 10)
      : undefined;

    const amenityIds: number[] | undefined = Array.isArray(body.amenityIds)
      ? (body.amenityIds as any[]).map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id))
      : undefined;

    // 3. Update + activity log
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          ...(body.name        !== undefined && { name:        String(body.name) }),
          ...(body.slug        !== undefined && { slug:        String(body.slug) }),
          ...(body.locationId  !== undefined && { location:   { connect: { id: Number(body.locationId) } } }),
          ...(body.type        !== undefined && { type:       { connect: { name: String(body.type) } } }),
          ...(body.category    !== undefined && { category:   { connect: { name: String(body.category) } } }),
          ...(body.description !== undefined && { description: String(body.description) }),
          ...(body.accessTime  !== undefined && { accessTime: { connect: { name: String(body.accessTime) } } }),
          ...(body.capacity    !== undefined && { capacity:    Number(body.capacity) }),
          ...(body.quantity    !== undefined && { quantity:    Number(body.quantity) }),
          ...(sdrValue         !== undefined && { sdr:         sdrValue }),
          ...(advValue         !== undefined && { adv:         advValue }),
          ...(meetingHours !== undefined && !isNaN(meetingHours) && { complementaryMeetingHours: meetingHours }),
          ...(body.isActive    !== undefined && { isActive:    Boolean(body.isActive) }),
          ...(body.isFeatured  !== undefined && { isFeatured:  Boolean(body.isFeatured) }),
          ...(body.sortOrder   !== undefined && { sortOrder:   Number(body.sortOrder) }),
          ...(amenityIds !== undefined && {
            amenities: {
              deleteMany: {},
              create: amenityIds.map((aId) => ({ amenityId: aId })),
            }
          }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          location: { select: { id: true, name: true } },
          updatedAt: true,
        },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'UPDATE',
          module:    'products',
          recordId:  productId,
          oldData:   JSON.stringify(existing),
          newData:   JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('[PRODUCT_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── DELETE /api/admin/products/[id] ─────────────────────────────────────────
// Soft delete (isActive: false)
export const DELETE = withPermission('products', 'delete', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // 2. Check existence
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 3. Soft delete + activity log
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { isActive: false },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'products',
          recordId:  productId,
          oldData:   JSON.stringify(existing),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Product deactivated successfully' } });
  } catch (error) {
    console.error('[PRODUCT_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
