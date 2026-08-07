import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// DELETE /api/admin/products/[id]/images/[imageId] — Remove a product image
export const DELETE = withPermission('products', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id, imageId } = await params;
    const productId = parseInt(id, 10);
    const imgId     = parseInt(imageId, 10);

    if (isNaN(productId) || isNaN(imgId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check image belongs to product
    const image = await prisma.productImage.findFirst({
      where: { id: imgId, productId },
      select: { id: true, url: true },
    });

    if (!image) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imgId } });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'products',
          recordId:  productId,
          oldData:   JSON.stringify(image),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Image removed successfully' } });
  } catch (error) {
    console.error('[PRODUCT_IMAGE_REMOVE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
