import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/products/[id]/images — Add an image to a product
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
    const url = String(body.url ?? '').trim();
    if (!url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const image = await prisma.$transaction(async (tx) => {
      // If this is primary, clear existing primary flags first
      if (body.isPrimary === true) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }

      const img = await tx.productImage.create({
        data: {
          productId,
          url,
          alt:       body.alt       ? String(body.alt) : undefined,
          isPrimary: body.isPrimary === true,
          sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
        },
        select: { id: true, url: true, alt: true, isPrimary: true, sortOrder: true },
      });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'CREATE',
          module:    'products',
          recordId:  productId,
          newData:   JSON.stringify({ imageId: img.id, url }),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return img;
    });

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (error) {
    console.error('[PRODUCT_IMAGE_ADD]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
