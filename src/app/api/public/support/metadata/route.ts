import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/support/metadata — Locations + product types for the support ticket form
export async function GET() {
  try {
    const [locations, productTypes] = await Promise.all([
      prisma.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          city: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.productType.findMany({
        where: { isActive: true },
        select: { id: true, name: true, displayName: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({
      data: {
        locations: locations.map((loc) => ({
          id: loc.id,
          name: `${loc.name}, ${loc.city.name}`,
        })),
        productTypes: productTypes.map((pt) => ({
          id: pt.id,
          name: pt.displayName || pt.name,
        })),
      },
    });
  } catch (error) {
    console.error('[PUBLIC_SUPPORT_METADATA]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
