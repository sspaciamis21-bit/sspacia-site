import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

// ─── GET /api/admin/products ──────────────────────────────────────────────────
// Lists products, scope-filtered by the caller's assigned locations.
export const GET = withPermission('products', 'view', async (req: NextRequest, { payload }: PermissionContext) => {
  try {
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
          sdr: true,
          adv: true,
          securityDepositMonths: true,
          complementaryMeetingHours: true,
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
            select: { 
              id: true, 
              price: true, 
              oldPrice: true, 
              discount: true, 
              durationType: { select: { id: true, name: true, displayName: true } } 
            },
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
export const POST = withPermission('products', 'create', async (req: NextRequest, { payload }: PermissionContext) => {
  try {

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

    // Parse sdr/adv/securityDeposit
    const sdrValue = body.sdr !== undefined ? Number(body.sdr) : undefined;
    const advValue = body.adv !== undefined ? Number(body.adv) : undefined;
    const securityDepositMonths = body.securityDepositMonths !== undefined ? Number(body.securityDepositMonths) : 3;

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

    const meetingHoursRaw = body.complementaryMeetingHours ?? body.complementaryMeetingRoom;
    const meetingHours = meetingHoursRaw !== undefined ? parseInt(String(meetingHoursRaw), 10) : undefined;

    interface PricingPlanInput { durationType: string; price: number; oldPrice?: number; discount?: number; priceType?: string }
    const pricingPlans: PricingPlanInput[] = Array.isArray(body.pricingPlans)
      ? (body.pricingPlans as PricingPlanInput[])
      : [];

    const units: any[] = Array.isArray(body.units) ? body.units : [];

    const amenityIds: number[] = Array.isArray(body.amenityIds)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          sdr:       finalSdr,
          adv:       finalAdv,
          securityDepositMonths,
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
                  priceType: (p.priceType as any) || 'PER_SEAT',
                })),
              }
            : undefined,
          units: {
            create: units.length > 0 
              ? units.map((u) => ({
                  name: u.name,
                  code: u.code,
                  capacity: u.capacity ? Number(u.capacity) : (body.capacity ? Number(body.capacity) : 1),
                  description: u.description || '',
                }))
              : [{
                  name: `${String(name)} Unit`,
                  code: `${String(slug)}-UNIT-1`,
                  capacity: body.capacity ? Number(body.capacity) : 1,
                  description: `Default unit for ${String(name)}`,
                }],
          },
          amenities: amenityIds.length > 0
            ? {
                create: amenityIds.map((aId) => ({ amenityId: aId })),
              }
            : undefined,
          images: Array.isArray(body.images) && body.images.length > 0
            ? {
                create: body.images.map((img: any, idx: number) => ({
                  url: typeof img === 'string' ? img : String(img.url),
                  alt: typeof img === 'object' && img.alt ? String(img.alt) : String(name),
                  isPrimary: typeof img === 'object' && img.isPrimary !== undefined ? Boolean(img.isPrimary) : idx === 0,
                  sortOrder: idx + 1,
                })),
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
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json({ data: product, message: 'Created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[PRODUCTS_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
