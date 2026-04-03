import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/products/[id]/pricing — Upsert a pricing plan for a product
export const POST = withPermission('products', 'update', async (
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

    const body = await req.json() as Record<string, unknown>;
    const durationType = String(body.durationType ?? '').trim();
    const price        = Number(body.price);

    if (!durationType || isNaN(price)) {
      return NextResponse.json(
        { error: 'durationType and price are required' },
        { status: 400 }
      );
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Resolve duration type ID by name
    const dt = await prisma.durationType.findUnique({
      where: { name: durationType },
      select: { id: true },
    });

    if (!dt) {
      return NextResponse.json({ error: `Duration type "${durationType}" not found` }, { status: 400 });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const p = await tx.pricingPlan.upsert({
        where: { productId_durationTypeId: { productId, durationTypeId: dt.id } },
        update: {
          price,
          oldPrice:  body.oldPrice  !== undefined ? Number(body.oldPrice)  : undefined,
          discount:  body.discount  !== undefined ? Number(body.discount)  : undefined,
          isActive:  body.isActive  !== undefined ? Boolean(body.isActive) : true,
        },
        create: {
          productId,
          durationTypeId: dt.id,
          price,
          oldPrice:  body.oldPrice  !== undefined ? Number(body.oldPrice)  : undefined,
          discount:  body.discount  !== undefined ? Number(body.discount)  : undefined,
          isActive:  body.isActive  !== undefined ? Boolean(body.isActive) : true,
        },
        select: { id: true, price: true, durationTypeId: true, isActive: true, durationType: true },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'products',
          recordId:  productId,
          newData:   JSON.stringify(p),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return p;
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error('[PRODUCT_PRICING_UPSERT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
