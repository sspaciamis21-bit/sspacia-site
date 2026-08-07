/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';

// ─── GET /api/admin/products/[id]/units ──────────────────────────────────────
export const GET = withPermission('products', 'read', async (req: NextRequest, context: PermissionContext) => {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });

    const data = await prisma.productUnit.findMany({
      where: { productId },
      orderBy: [{ name: 'asc' }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[PRODUCT_UNITS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── POST /api/admin/products/[id]/units ─────────────────────────────────────
export const POST = withPermission('products', 'create', async (req: NextRequest, context: PermissionContext) => {
  try {
    const { id } = await context.params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) return NextResponse.json({ error: 'Invalid Product ID' }, { status: 400 });

    const body = await req.json();
    const { name, code, description, isActive } = body;

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const unit = await prisma.$transaction(async (tx) => {
      const u = await tx.productUnit.create({
        data: {
          productId,
          name,
          code,
          description,
          isActive: isActive !== false,
        },
      });

      // Update product quantity to match units count
      const count = await tx.productUnit.count({ where: { productId } });
      await tx.product.update({
        where: { id: productId },
        data: { quantity: count }
      });

      await tx.activityLog.create({
        data: {
          userId: Number(context.payload.id),
          action: 'CREATE',
          module: 'products',
          recordId: u.id,
          newData: JSON.stringify(u),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return u;
    });

    return NextResponse.json({ data: unit, message: 'Unit added successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('[PRODUCT_UNITS_CREATE]', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Unit with this name already exists for this product' }, { status: 400 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// ─── PATCH /api/admin/products/[id]/units ────────────────────────────────────
// Using individual unit ID in body or as a separate resource
// For now, let's keep it simple with body.id
export const PATCH = withPermission('products', 'update', async (req: NextRequest, context: PermissionContext) => {
  try {
    const body = await req.json();
    const id = parseInt(body.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid Unit ID' }, { status: 400 });

    const unit = await prisma.$transaction(async (tx) => {
      const existing = await tx.productUnit.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      const updated = await tx.productUnit.update({
        where: { id },
        data: {
          name: body.name,
          code: body.code,
          description: body.description,
          isActive: body.isActive,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: Number(context.payload.id),
          action: 'UPDATE',
          module: 'products',
          recordId: id,
          oldData: JSON.stringify(existing),
          newData: JSON.stringify(updated),
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });

      return updated;
    });

    return NextResponse.json({ data: unit });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    console.error('[PRODUCT_UNITS_UPDATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
