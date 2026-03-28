import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

interface CreateLocationBody {
  cityId: number;
  name: string;
  slug: string;
  address?: string;
  mapUrl?: string;
  mapEmbed?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  sortOrder?: number;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// GET /api/admin/locations - List all locations
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: { city: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const data = locations.map((loc) => ({
      id: loc.id,
      name: `${loc.name} (${loc.city.name})`,
      cityId: loc.cityId,
      slug: loc.slug,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/admin/locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/locations - Create a new location
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateLocationBody = await request.json();
    const { cityId, name, slug } = body;

    if (!cityId || !name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: cityId, name, slug' },
        { status: 400 }
      );
    }

    const location = await prisma.location.create({
      data: {
        cityId: Number(cityId),
        name,
        slug,
        address: body.address,
        mapUrl: body.mapUrl,
        mapEmbed: body.mapEmbed,
        phone: body.phone,
        email: body.email,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { city: true },
    });

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
