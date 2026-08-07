import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/locations/[slug] — Return single location with images and products
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const location = await prisma.location.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        email: true,
        mapUrl: true,
        mapEmbed: true,
        city: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            capacity: true,
            quantity: true,
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
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('[PUBLIC_LOCATION_SLUG]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
