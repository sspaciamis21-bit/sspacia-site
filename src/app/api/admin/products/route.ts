import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { ProductType, SpaceCategory, AccessTime, DurationType } from '@prisma/client';

interface PricingPlanInput {
  durationType: DurationType;
  price: number;
  oldPrice?: number;
  discount?: number;
}

interface CreateProductBody {
  locationId: number;
  name: string;
  slug: string;
  type: ProductType;
  category: SpaceCategory;
  description?: string;
  accessTime?: AccessTime;
  capacity?: number;
  quantity?: number;
  sdrPlusAdv?: string;
  complementaryMeetingRoom?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  pricingPlans?: PricingPlanInput[];
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role as string) !== 'ADMIN') return null;
  return payload;
}

// GET /api/admin/products - List all products (including inactive) for admin
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: {
        location: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        pricingPlans: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          take: 1,
        },
        _count: {
          select: { amenities: true, images: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ data: products });
  } catch (error) {
    console.error('GET /api/admin/products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateProductBody = await request.json();
    const {
      locationId,
      name,
      slug,
      type,
      category,
      description,
      accessTime,
      capacity,
      quantity,
      sdrPlusAdv,
      complementaryMeetingRoom,
      isActive = true,
      isFeatured = false,
      sortOrder = 0,
      pricingPlans = [],
    } = body;

    if (!locationId || !name || !slug || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId, name, slug, type, category' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        locationId,
        name,
        slug,
        type,
        category,
        description,
        accessTime,
        capacity,
        quantity: quantity ?? 1,
        sdrPlusAdv,
        complementaryMeetingRoom,
        isActive,
        isFeatured,
        sortOrder,
        pricingPlans:
          pricingPlans.length > 0
            ? {
                create: pricingPlans.map((p) => ({
                  durationType: p.durationType,
                  price: p.price,
                  oldPrice: p.oldPrice,
                  discount: p.discount,
                })),
              }
            : undefined,
      },
      include: {
        location: { select: { id: true, name: true, slug: true } },
        pricingPlans: true,
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
