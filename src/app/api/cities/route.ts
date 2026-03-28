import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/cities - Return all active cities with location count
export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { locations: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: cities });
  } catch (error) {
    console.error('GET /api/cities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
