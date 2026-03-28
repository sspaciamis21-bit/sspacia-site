import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/locations/[slug] - Return single location with images and products
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const location = await prisma.location.findUnique({
      where: { slug },
      include: {
        city: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        products: {
          where: { isActive: true },
          include: {
            images: {
              where: { isPrimary: true },
              take: 1,
            },
            pricingPlans: {
              where: { isActive: true },
              orderBy: { price: 'asc' },
              take: 1,
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('GET /api/locations/[slug] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
