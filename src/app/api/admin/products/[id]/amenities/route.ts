import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/products/[id]/amenities — Assign an amenity to a product
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
    const amenityId = parseInt(String(body.amenityId ?? ''), 10);
    if (isNaN(amenityId)) {
      return NextResponse.json({ error: 'amenityId is required and must be a number' }, { status: 400 });
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const productAmenity = await prisma.$transaction(async (tx) => {
      const pa = await tx.productAmenity.create({
        data: { productId, amenityId },
        select: {
          amenity: { select: { id: true, name: true, icon: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'products',
          recordId:  productId,
          newData:   JSON.stringify({ amenityId }),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return pa;
    });

    return NextResponse.json({ data: productAmenity }, { status: 201 });
  } catch (error) {
    console.error('[PRODUCT_AMENITY_ADD]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
