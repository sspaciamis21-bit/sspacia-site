import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/locations — Return all active locations with city info
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
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        email: true,
        mapUrl: true,
        sortOrder: true,
        city: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: locations });
  } catch (error) {
    console.error('[PUBLIC_LOCATIONS_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
