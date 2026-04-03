import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// DELETE /api/admin/products/[id]/amenities/[amenityId] — Remove amenity from product
export const DELETE = withPermission('products', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id, amenityId } = await params;
    const productId = parseInt(id, 10);
    const aId       = parseInt(amenityId, 10);

    if (isNaN(productId) || isNaN(aId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check link exists
    const link = await prisma.productAmenity.findUnique({
      where: { productId_amenityId: { productId, amenityId: aId } },
      select: { productId: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.productAmenity.delete({
        where: { productId_amenityId: { productId, amenityId: aId } },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'products',
          recordId:  productId,
          oldData:   JSON.stringify({ amenityId: aId }),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Amenity removed from product' } });
  } catch (error) {
    console.error('[PRODUCT_AMENITY_REMOVE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
