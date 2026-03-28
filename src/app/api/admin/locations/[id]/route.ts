import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

interface UpdateLocationBody {
  name?: string;
  slug?: string;
  cityId?: number;
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

// PATCH /api/admin/locations/[id] - Update location
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const locationId = parseInt(id);
    if (isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const body: UpdateLocationBody = await request.json();

    const location = await prisma.location.update({
      where: { id: locationId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.cityId !== undefined && { cityId: Number(body.cityId) }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.mapUrl !== undefined && { mapUrl: body.mapUrl }),
        ...(body.mapEmbed !== undefined && { mapEmbed: body.mapEmbed }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
      include: { city: true },
    });

    return NextResponse.json({ data: location });
  } catch (error) {
    console.error('PATCH /api/admin/locations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
