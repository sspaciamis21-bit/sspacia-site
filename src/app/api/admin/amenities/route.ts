import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

interface CreateAmenityBody {
  name: string;
  icon?: string;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// POST /api/admin/amenities - Create a new amenity
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateAmenityBody = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Amenity name is required' }, { status: 400 });
    }

    const amenity = await prisma.amenity.create({
      data: {
        name: body.name,
        icon: body.icon,
      },
    });

    return NextResponse.json({ data: amenity }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/amenities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/amenities - List all amenities
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const amenities = await prisma.amenity.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: amenities });
  } catch (error) {
    console.error('GET /api/admin/amenities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
