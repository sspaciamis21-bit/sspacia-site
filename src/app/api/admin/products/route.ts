import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// ─── GET /api/admin/products ──────────────────────────────────────────────────
// Lists products, scope-filtered by the caller's assigned locations.
export const GET = withPermission('products', 'read', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const { searchParams } = req.nextUrl;

    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip  = (page - 1) * limit;

    // Scope products to assigned locations if any
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { assignedLocations: { select: { locationId: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const assignedIds = user.assignedLocations.map((al) => al.locationId);
    const locationFilter = assignedIds.length > 0 ? { locationId: { in: assignedIds } } : {};

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where: locationFilter }),
      prisma.product.findMany({
        where: locationFilter,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          isFeatured: true,
          capacity: true,
          quantity: true,
          sortOrder: true,
          createdAt: true,
          location: { select: { id: true, name: true, slug: true } },
          type:     { select: { id: true, name: true, displayName: true } },
          category: { select: { id: true, name: true, displayName: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
          pricingPlans: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            take: 1,
            select: { price: true, durationType: true },
          },
          _count: { select: { amenities: true, images: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[PRODUCTS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/products ─────────────────────────────────────────────────
export const POST = withPermission('products', 'create', async (req: NextRequest) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const { locationId, name, slug, type, category } = body;

    // 1. Validate required fields
    if (!locationId || !name || !slug || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId, name, slug, type, category' },
        { status: 400 }
      );
    }

    const locId = parseInt(String(locationId), 10);
    if (isNaN(locId)) {
      return NextResponse.json({ error: 'Invalid locationId' }, { status: 400 });
    }

    // 2. Duplicate slug check
    const existing = await prisma.product.findUnique({
      where: { locationId_slug: { locationId: locId, slug: String(slug) } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A product with this slug already exists in this location' },
        { status: 400 }
      );
    }

    // Parse sdrPlusAdv
    let sdrValue: number | undefined;
    let advValue: number | undefined;
    const sdrPlusAdv = body.sdrPlusAdv;
    if (typeof sdrPlusAdv === 'string') {
      const parts = sdrPlusAdv.split('+').map((p) => parseInt(p.trim(), 10));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        sdrValue = parts[0];
        advValue = parts[1];
      }
    }

    const meetingHoursRaw = body.complementaryMeetingRoom;
    const meetingHours = meetingHoursRaw ? parseInt(String(meetingHoursRaw), 10) : undefined;

    interface PricingPlanInput { durationType: string; price: number; oldPrice?: number; discount?: number }
    const pricingPlans: PricingPlanInput[] = Array.isArray(body.pricingPlans)
      ? (body.pricingPlans as PricingPlanInput[])
      : [];

    const amenityIds: number[] = Array.isArray(body.amenityIds)
      ? (body.amenityIds as any[]).map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id))
      : [];

    // 3. Create + activity log
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          location:  { connect: { id: locId } },
          name:      String(name),
          slug:      String(slug),
          type:      { connect: { name: String(type) } },
          category:  { connect: { name: String(category) } },
          description: body.description !== undefined ? String(body.description) : undefined,
          accessTime: body.accessTime
            ? { connect: { name: String(body.accessTime) } }
            : undefined,
          capacity:  body.capacity   ? Number(body.capacity)  : undefined,
          quantity:  body.quantity   ? Number(body.quantity)  : 1,
          sdr:       sdrValue,
          adv:       advValue,
          complementaryMeetingHours:
            meetingHours !== undefined && !isNaN(meetingHours) ? meetingHours : undefined,
          isActive:   body.isActive  !== false,
          isFeatured: body.isFeatured === true,
          sortOrder:  body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
          pricingPlans: pricingPlans.length > 0
            ? {
                create: pricingPlans.map((p) => ({
                  durationType: { connect: { name: p.durationType } },
                  price:    p.price,
                  oldPrice: p.oldPrice,
                  discount: p.discount,
                })),
              }
            : undefined,
          amenities: amenityIds.length > 0
            ? {
                create: amenityIds.map((aId) => ({ amenityId: aId })),
              }
            : undefined,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          location: { select: { id: true, name: true } },
          pricingPlans: { select: { id: true, price: true, durationType: true } },
          createdAt: true,
        },
      });

      // 4. Activity log
      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'products',
          recordId:  p.id,
          newData:   JSON.stringify(p),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return p;
    });

    return NextResponse.json({ data: product, message: 'Created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[PRODUCTS_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
