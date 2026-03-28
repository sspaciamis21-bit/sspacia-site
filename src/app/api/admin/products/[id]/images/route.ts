import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

interface AddImageBody {
  url: string;
  alt?: string;
  isPrimary?: boolean;
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

// POST /api/admin/products/[id]/images - Add image to product
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

    const body: AddImageBody = await request.json();
    if (!body.url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // If this is set as primary, unset others first
    if (body.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        url: body.url,
        alt: body.alt,
        isPrimary: body.isPrimary ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/products/[id]/images error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
