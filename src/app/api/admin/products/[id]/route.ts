import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { ProductType, SpaceCategory, AccessTime } from '@prisma/client';

interface UpdateProductBody {
  name?: string;
  slug?: string;
  locationId?: number;
  type?: ProductType;
  category?: SpaceCategory;
  description?: string;
  accessTime?: AccessTime;
  capacity?: number;
  quantity?: number;
  sdrPlusAdv?: string;
  complementaryMeetingRoom?: string;
  isActive?: boolean;
  isFeatured?: boolean;
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

// PATCH /api/admin/products/[id] - Update product
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
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const body: UpdateProductBody = await request.json();

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.locationId !== undefined && { locationId: body.locationId }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.accessTime !== undefined && { accessTime: body.accessTime }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.sdrPlusAdv !== undefined && { sdrPlusAdv: body.sdrPlusAdv }),
        ...(body.complementaryMeetingRoom !== undefined && {
          complementaryMeetingRoom: body.complementaryMeetingRoom,
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
      include: {
        location: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('PATCH /api/admin/products/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products/[id] - Soft delete (set isActive: false)
export async function DELETE(
  _request: Request,
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

    await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });

    return NextResponse.json({ data: { message: 'Product deactivated successfully' } });
  } catch (error) {
    console.error('DELETE /api/admin/products/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
