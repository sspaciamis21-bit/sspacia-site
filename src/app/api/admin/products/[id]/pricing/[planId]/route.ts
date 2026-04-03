import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { withPermission } from '@/lib/auth/withPermission';
import { requireAuth } from '@/lib/auth';

// DELETE /api/admin/products/[id]/pricing/[planId] — Remove a pricing plan
export const DELETE = withPermission('products', 'update', async (
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) => {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { id, planId } = await params;
    const productId = parseInt(id, 10);
    const pId       = parseInt(planId, 10);

    if (isNaN(productId) || isNaN(pId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Check plan belongs to product
    const plan = await prisma.pricingPlan.findFirst({
      where: { id: pId, productId },
      select: { id: true, durationType: true, price: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pricingPlan.delete({ where: { id: pId } });

      await tx.activityLog.create({
        data: {
          userId:    Number(payload.id),
          action:    'DELETE',
          module:    'products',
          recordId:  productId,
          oldData:   JSON.stringify(plan),
          newData:   null,
          ipAddress: req.headers.get('x-forwarded-for') ?? null,
        },
      });
    });

    return NextResponse.json({ data: { message: 'Pricing plan removed successfully' } });
  } catch (error) {
    console.error('[PRODUCT_PRICING_REMOVE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
