import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PUT /api/admin/promocodes/[id]
export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const role = String(payload?.role || '').toUpperCase();
    if (!payload?.id || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      code,
      title,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      isActive,
      usageLimit,
      validFrom,
      validUntil,
    } = body;

    const data: any = {};
    if (code !== undefined) data.code = String(code).trim().toUpperCase();
    if (title !== undefined) data.title = title ? String(title).trim() : null;
    if (discountType !== undefined) data.discountType = discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    if (discountValue !== undefined) {
      const val = parseFloat(String(discountValue));
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ error: 'Valid positive discount rate is required' }, { status: 400 });
      }
      data.discountValue = val;
    }
    if (minOrderAmount !== undefined) {
      data.minOrderAmount = minOrderAmount ? parseFloat(String(minOrderAmount)) : null;
    }
    if (maxDiscountAmount !== undefined) {
      data.maxDiscountAmount = maxDiscountAmount ? parseFloat(String(maxDiscountAmount)) : null;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (usageLimit !== undefined) {
      data.usageLimit = usageLimit ? parseInt(String(usageLimit), 10) : null;
    }
    if (validFrom !== undefined) data.validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null;

    const p = prisma as any;
    if (p.promoCode && typeof p.promoCode.update === 'function') {
      const updated = await p.promoCode.update({
        where: { id },
        data,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Fallback SQL
    const setClauses: string[] = ['`updatedAt` = NOW()'];
    const sqlParams: any[] = [];
    if (data.code !== undefined) { setClauses.push('`code` = ?'); sqlParams.push(data.code); }
    if (data.title !== undefined) { setClauses.push('`title` = ?'); sqlParams.push(data.title); }
    if (data.discountType !== undefined) { setClauses.push('`discountType` = ?'); sqlParams.push(data.discountType); }
    if (data.discountValue !== undefined) { setClauses.push('`discountValue` = ?'); sqlParams.push(data.discountValue); }
    if (data.minOrderAmount !== undefined) { setClauses.push('`minOrderAmount` = ?'); sqlParams.push(data.minOrderAmount); }
    if (data.maxDiscountAmount !== undefined) { setClauses.push('`maxDiscountAmount` = ?'); sqlParams.push(data.maxDiscountAmount); }
    if (data.isActive !== undefined) { setClauses.push('`isActive` = ?'); sqlParams.push(data.isActive ? 1 : 0); }
    if (data.usageLimit !== undefined) { setClauses.push('`usageLimit` = ?'); sqlParams.push(data.usageLimit); }

    sqlParams.push(id);
    await prisma.$executeRawUnsafe(
      `UPDATE \`PromoCode\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
      ...sqlParams
    );

    return NextResponse.json({ success: true, message: 'Promo code updated successfully' });
  } catch (error: any) {
    console.error('[ADMIN_PROMOCODES_PUT]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/promocodes/[id]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const role = String(payload?.role || '').toUpperCase();
    if (!payload?.id || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const params = await props.params;
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const p = prisma as any;
    if (p.promoCode && typeof p.promoCode.delete === 'function') {
      await p.promoCode.delete({ where: { id } });
    } else {
      await prisma.$executeRawUnsafe('DELETE FROM `PromoCode` WHERE `id` = ?', id);
    }

    return NextResponse.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error: any) {
    console.error('[ADMIN_PROMOCODES_DELETE]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
