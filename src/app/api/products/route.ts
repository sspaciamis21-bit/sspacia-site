import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ProductType, SpaceCategory } from '@prisma/client';

// GET /api/products - Return active products with pricing and images
// Supports query params:
//   ?location=agarwal-complex  (filter by location slug)
//   ?type=FLEX_DESK            (filter by ProductType)
//   ?category=WORKSPACE        (filter by SpaceCategory)
//   ?featured=true             (only featured products)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationSlug = searchParams.get('location');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(locationSlug ? { location: { slug: locationSlug } } : {}),
        ...(type && Object.values(ProductType).includes(type as ProductType)
          ? { type: type as ProductType }
          : {}),
        ...(category &&
        Object.values(SpaceCategory).includes(category as SpaceCategory)
          ? { category: category as SpaceCategory }
          : {}),
        ...(featured === 'true' ? { isFeatured: true } : {}),
      },
      include: {
        location: {
          select: { id: true, name: true, slug: true, address: true },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
