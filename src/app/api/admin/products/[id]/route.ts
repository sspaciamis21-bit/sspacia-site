import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

// ─── GET /api/admin/products/[id] ────────────────────────────────────────────
export const GET = withPermission('products', 'read', async (
  _req: NextRequest,
  { params }: PermissionContext
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
        securityDepositMonths: true,
        complementaryMeetingHours: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, name: true, slug: true } },
        type:     { select: { id: true, name: true, displayName: true } },
        category: { select: { id: true, name: true, displayName: true } },
        accessTime: { select: { id: true, name: true, displayName: true } },
        units: { select: { id: true, name: true, code: true, capacity: true, description: true, isActive: true } },
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
            priceType: true,
            durationType: { select: { id: true, name: true, displayName: true } },
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
  { params, payload }: PermissionContext
) => {
  try {
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

    // Parse sdr/adv/securityDeposit
    const sdrValue = body.sdr !== undefined ? Number(body.sdr) : undefined;
    const advValue = body.adv !== undefined ? Number(body.adv) : undefined;
    const securityDepositMonths = body.securityDepositMonths !== undefined ? Number(body.securityDepositMonths) : undefined;

    // Legacy sdrPlusAdv support
    let finalSdr = sdrValue;
    let finalAdv = advValue;
    if (finalSdr === undefined && typeof body.sdrPlusAdv === 'string') {
      const parts = body.sdrPlusAdv.split('+').map((p) => parseInt(p.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        finalSdr = parts[0];
        finalAdv = parts[1];
      }
    }

    const meetingHours = (body.complementaryMeetingHours ?? body.complementaryMeetingRoom)
      ? parseInt(String(body.complementaryMeetingHours ?? body.complementaryMeetingRoom), 10)
      : undefined;

    const amenityIds: number[] | undefined = Array.isArray(body.amenityIds)
      ? (body.amenityIds as any[]).map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id))
      : undefined;

    interface PricingPlanInput { durationType: string; price: number; oldPrice?: number; discount?: number; priceType?: string }
    const pricingPlans: PricingPlanInput[] | undefined = Array.isArray(body.pricingPlans)
      ? (body.pricingPlans as PricingPlanInput[])
      : undefined;

    interface UnitInput { name: string; code?: string; capacity?: number; description?: string }
    const units: UnitInput[] | undefined = Array.isArray(body.units)
      ? (body.units as UnitInput[])
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
          ...(finalSdr         !== undefined && { sdr:         finalSdr }),
          ...(finalAdv         !== undefined && { adv:         finalAdv }),
          ...(securityDepositMonths !== undefined && { securityDepositMonths }),
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
          ...(pricingPlans !== undefined && {
            pricingPlans: {
              deleteMany: {},
              create: pricingPlans.map((p) => ({
                durationType: { connect: { name: p.durationType } },
                price:    p.price,
                oldPrice: p.oldPrice,
                discount: p.discount,
                priceType: (p.priceType as any) || 'PER_SEAT',
              })),
            }
          }),
          ...(units !== undefined && units.length > 0 && {
            units: {
              deleteMany: {},
              create: units.map((u) => ({
                name: u.name,
                code: u.code,
                capacity: u.capacity ? Number(u.capacity) : (body.capacity ? Number(body.capacity) : 1),
                description: u.description || '',
              })),
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

      // Synchronize unit capacities if product capacity changed and no specific units were provided
      if (body.capacity !== undefined && (units === undefined || units.length === 0)) {
        await tx.productUnit.updateMany({
          where: { productId },
          data: { capacity: Number(body.capacity) }
        });
      }

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
  { params, payload }: PermissionContext
) => {
  try {
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
