import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/products/[id] — Return single product with full public details
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id, 10);

    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        accessTime: true,
        capacity: true,
        quantity: true,
        sdr: true,
        adv: true,
        complementaryMeetingHours: true,
        isFeatured: true,
        location: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            email: true,
            mapUrl: true,
            mapEmbed: true,
            city: { select: { id: true, name: true } },
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { url: true, alt: true },
            },
          },
        },
        type: { select: { id: true, name: true, displayName: true } },
        category: { select: { id: true, name: true, displayName: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: { id: true, url: true, alt: true, isPrimary: true, sortOrder: true },
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          select: { id: true, price: true, oldPrice: true, discount: true, durationType: true },
        },
        amenities: {
          select: {
            amenity: {
              select: { id: true, name: true, icon: true },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('[PUBLIC_PRODUCT_ID]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
