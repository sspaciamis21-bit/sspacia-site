import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { trackPurchaseFmsActual } from '@/lib/purchaseFms';
import { findUniqueConsumedItem, updateConsumedItem } from '@/lib/consumedInventoryDb';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/inventory/consumed/[id]/confirm-delivery
 * Records delivery confirmation: updates Google Sheet 'sspacia-purchase' tab to Done and records Actual timestamp
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const itemId = parseInt(id, 10);
    if (!itemId) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let userName: string = 'Community Manager';
    let userEmail: string = 'cm@sspacia.com';

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        userName = (payload.name as string) || 'Community Manager';
        userEmail = (payload.email as string) || 'cm@sspacia.com';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await findUniqueConsumedItem(itemId);

    if (!item) {
      return NextResponse.json({ error: 'Consumed item not found' }, { status: 404 });
    }

    const locationRecord = item.locationId
      ? await (prisma as any).location.findUnique({ where: { id: item.locationId } })
      : null;
    const centerName = locationRecord?.name || 'SSPACIA Centre';

    const now = new Date();

    // 1. Log Actual timestamp and Status: Done to Google Sheet 'sspacia-purchase' tab
    const fmsRes = await trackPurchaseFmsActual({
      itemName: item.productName,
      centerName,
      userEmail,
      userName,
    });

    // 2. Update DB Item to mark delivery confirmed
    const updated = await updateConsumedItem(itemId, {
      purchaseStatus: 'DELIVERED',
      purchaseActualAt: now,
      isBufferAlertActive: false,
    });

    return NextResponse.json({
      success: true,
      message: `Delivery confirmed for "${item.productName}"! Recorded Actual timestamp in Google Sheets FMS. Please update Available Stock Qty when you unpack the items.`,
      data: {
        item: updated,
        fms: fmsRes,
      },
    });
  } catch (error: any) {
    console.error('Confirm delivery error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to confirm purchase delivery' }, { status: 500 });
  }
}
