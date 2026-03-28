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

// DELETE /api/admin/products/[id]/pricing/[planId] - Remove a pricing plan
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; planId: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, planId } = await params;
    const productId = parseInt(id);
    const pId = parseInt(planId);

    if (isNaN(productId) || isNaN(pId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.pricingPlan.delete({
      where: { id: pId, productId },
    });

    return NextResponse.json({ data: { message: 'Pricing plan removed successfully' } });
  } catch (error) {
    console.error('DELETE /api/admin/products/[id]/pricing/[planId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
