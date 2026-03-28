import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { DurationType } from '@prisma/client';

interface PricingPlanBody {
  durationType: DurationType;
  price: number;
  oldPrice?: number;
  discount?: number;
  isActive?: boolean;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// POST /api/admin/products/[id]/pricing - Add or update a pricing plan (upsert)
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

    const body: PricingPlanBody = await request.json();
    if (!body.durationType || body.price === undefined) {
      return NextResponse.json(
        { error: 'durationType and price are required' },
        { status: 400 }
      );
    }

    const plan = await prisma.pricingPlan.upsert({
      where: {
        productId_durationType: {
          productId,
          durationType: body.durationType,
        },
      },
      update: {
        price: body.price,
        oldPrice: body.oldPrice,
        discount: body.discount,
        isActive: body.isActive ?? true,
      },
      create: {
        productId,
        durationType: body.durationType,
        price: body.price,
        oldPrice: body.oldPrice,
        discount: body.discount,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/products/[id]/pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
