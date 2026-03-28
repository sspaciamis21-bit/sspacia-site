import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/locations - Return all active locations with city info
// Supports ?city=slug to filter by city slug
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const citySlug = searchParams.get('city');

    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        ...(citySlug ? { city: { slug: citySlug } } : {}),
      },
      include: {
        city: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: locations });
  } catch (error) {
    console.error('GET /api/locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
