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

// DELETE /api/admin/products/[id]/amenities/[amenityId] - Remove amenity from product
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; amenityId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, amenityId } = await params;
    const productId = parseInt(id);
    const aId = parseInt(amenityId);

    if (isNaN(productId) || isNaN(aId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.productAmenity.delete({
      where: {
        productId_amenityId: { productId, amenityId: aId },
      },
    });

    return NextResponse.json({ data: { message: 'Amenity removed from product' } });
  } catch (error) {
    console.error('DELETE /api/admin/products/[id]/amenities/[amenityId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
