import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/products — Return active products with pricing and images
// Query params:
//   ?location=slug     → filter by location slug
//   ?type=FLEX_DESK    → filter by ProductType name
//   ?category=WORKSPACE → filter by SpaceCategory name
//   ?featured=true     → only featured products
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
        ...(type ? { type: { name: type } } : {}),
        ...(category ? { category: { name: category } } : {}),
        ...(featured === 'true' ? { isFeatured: true } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        capacity: true,
        quantity: true,
        isFeatured: true,
        sortOrder: true,
        location: {
          select: { id: true, name: true, slug: true, address: true },
        },
        type: {
          select: { id: true, name: true, displayName: true },
        },
        category: {
          select: { id: true, name: true, displayName: true },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: { id: true, url: true, alt: true, isPrimary: true },
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          select: { id: true, price: true, oldPrice: true, discount: true, durationType: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('[PUBLIC_PRODUCTS_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
