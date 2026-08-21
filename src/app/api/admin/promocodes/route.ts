import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/promocodes
export async function GET() {
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

    let promocodes: any[] = [];
    const p = prisma as any;
    if (p.promoCode && typeof p.promoCode.findMany === 'function') {
      promocodes = await p.promoCode.findMany({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      });
    } else {
      promocodes = await prisma.$queryRawUnsafe('SELECT * FROM `PromoCode` ORDER BY `isActive` DESC, `createdAt` DESC');
    }

    return NextResponse.json({ success: true, data: promocodes || [] });
  } catch (error: any) {
    console.error('[ADMIN_PROMOCODES_GET]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/promocodes
export async function POST(request: Request) {
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

    if (!code || !String(code).trim()) {
      return NextResponse.json({ error: 'Promo code is required' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanType = discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const val = parseFloat(String(discountValue));

    if (isNaN(val) || val <= 0) {
      return NextResponse.json({ error: 'Valid positive discount rate is required' }, { status: 400 });
    }

    if (cleanType === 'PERCENTAGE' && val > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 });
    }

    const p = prisma as any;

    // Check duplicate
    if (p.promoCode && typeof p.promoCode.findUnique === 'function') {
      const existing = await p.promoCode.findUnique({ where: { code: cleanCode } });
      if (existing) {
        return NextResponse.json({ error: `Promo code "${cleanCode}" already exists` }, { status: 409 });
      }

      const created = await p.promoCode.create({
        data: {
          code: cleanCode,
          title: title ? String(title).trim() : null,
          discountType: cleanType,
          discountValue: val,
          minOrderAmount: minOrderAmount ? parseFloat(String(minOrderAmount)) : null,
          maxDiscountAmount: maxDiscountAmount ? parseFloat(String(maxDiscountAmount)) : null,
          isActive: isActive !== false,
          usageLimit: usageLimit ? parseInt(String(usageLimit), 10) : null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          createdById: Number(payload.id),
          createdByName: payload.name || 'Super Admin',
        },
      });

      return NextResponse.json({ success: true, data: created });
    }

    // Raw SQL fallback
    const rawExisting = await prisma.$queryRawUnsafe('SELECT id FROM `PromoCode` WHERE `code` = ? LIMIT 1', cleanCode);
    if (Array.isArray(rawExisting) && rawExisting.length > 0) {
      return NextResponse.json({ error: `Promo code "${cleanCode}" already exists` }, { status: 409 });
    }

    await prisma.$executeRawUnsafe(
      'INSERT INTO `PromoCode` (`code`, `title`, `discountType`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `isActive`, `usageLimit`, `usedCount`, `createdById`, `createdByName`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())',
      cleanCode,
      title || null,
      cleanType,
      val,
      minOrderAmount ? parseFloat(String(minOrderAmount)) : null,
      maxDiscountAmount ? parseFloat(String(maxDiscountAmount)) : null,
      isActive !== false ? 1 : 0,
      usageLimit ? parseInt(String(usageLimit), 10) : null,
      Number(payload.id),
      payload.name || 'Super Admin'
    );

    return NextResponse.json({ success: true, message: 'Promo code created successfully' });
  } catch (error: any) {
    console.error('[ADMIN_PROMOCODES_POST]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
