import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// POST /api/admin/products/[id]/amenities - Assign amenity to product
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { amenityId } = await request.json();
    if (!amenityId) {
      return NextResponse.json({ error: 'amenityId is required' }, { status: 400 });
    }

    const productAmenity = await prisma.productAmenity.create({
      data: { productId, amenityId: Number(amenityId) },
      include: { amenity: true },
    });

    return NextResponse.json({ data: productAmenity }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/products/[id]/amenities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
