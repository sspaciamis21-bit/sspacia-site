import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/public/promocodes/validate
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, subTotal } = body;

    if (!code || !String(code).trim()) {
      return NextResponse.json({ valid: false, error: 'Please enter a promo code' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const orderSubTotal = parseFloat(String(subTotal || 0));

    const p = prisma as any;
    let promo: any = null;

    if (p.promoCode && typeof p.promoCode.findUnique === 'function') {
      promo = await p.promoCode.findUnique({
        where: { code: cleanCode },
      });
    } else {
      const rows = await prisma.$queryRawUnsafe('SELECT * FROM `PromoCode` WHERE `code` = ? LIMIT 1', cleanCode);
      if (Array.isArray(rows) && rows.length > 0) {
        promo = rows[0];
      }
    }

    // Hardcoded fallback for default welcome code if not in DB yet
    if (!promo && cleanCode === 'WELCOME10') {
      promo = {
        code: 'WELCOME10',
        title: 'Welcome 10% Discount',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderAmount: null,
        maxDiscountAmount: null,
        isActive: true,
      };
    }

    if (!promo) {
      return NextResponse.json({ valid: false, error: `Invalid promo code "${cleanCode}"` }, { status: 404 });
    }

    if (!promo.isActive) {
      return NextResponse.json({ valid: false, error: `Promo code "${cleanCode}" is currently inactive or expired` }, { status: 400 });
    }

    const now = new Date();
    if (promo.validFrom && new Date(promo.validFrom) > now) {
      return NextResponse.json({ valid: false, error: `Promo code "${cleanCode}" is not active yet` }, { status: 400 });
    }

    if (promo.validUntil && new Date(promo.validUntil) < now) {
      return NextResponse.json({ valid: false, error: `Promo code "${cleanCode}" has expired` }, { status: 400 });
    }

    if (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usedCount >= promo.usageLimit) {
      return NextResponse.json({ valid: false, error: `Promo code "${cleanCode}" redemption limit reached` }, { status: 400 });
    }

    const minAmount = promo.minOrderAmount ? parseFloat(String(promo.minOrderAmount)) : 0;
    if (minAmount > 0 && orderSubTotal < minAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum booking subtotal of ₹${minAmount.toLocaleString()} required for this promo code`,
      }, { status: 400 });
    }

    const discType = String(promo.discountType || 'PERCENTAGE').toUpperCase();
    const discVal = parseFloat(String(promo.discountValue || 0));
    let calculatedDiscount = 0;

    if (discType === 'PERCENTAGE') {
      const rawDisc = orderSubTotal * (discVal / 100);
      const maxCap = promo.maxDiscountAmount ? parseFloat(String(promo.maxDiscountAmount)) : null;
      calculatedDiscount = maxCap !== null && maxCap > 0 ? Math.min(rawDisc, maxCap) : rawDisc;
    } else {
      calculatedDiscount = Math.min(discVal, orderSubTotal);
    }

    return NextResponse.json({
      success: true,
      valid: true,
      code: promo.code,
      title: promo.title || `${discVal}${discType === 'PERCENTAGE' ? '%' : '₹'} Off`,
      discountType: discType,
      discountValue: discVal,
      discountAmount: Math.round(calculatedDiscount * 100) / 100,
      message: `🎉 Promo code "${promo.code}" applied! You saved ₹${calculatedDiscount.toFixed(2)}`,
    });
  } catch (error: any) {
    console.error('[PROMOCODE_VALIDATE_ERROR]', error);
    return NextResponse.json({ valid: false, error: 'Error validating promo code' }, { status: 500 });
  }
}
