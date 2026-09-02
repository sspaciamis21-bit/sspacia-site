import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findManyConsumedItems } from '@/lib/consumedInventoryDb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/inventory/consumed/cron
 * Daily 9:00 AM reminder checker for any unresolved low-stock consumable items
 */
export async function GET() {
  try {
    const allItems = await findManyConsumedItems({});

    const locations = await (prisma as any).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const locMap = new Map(locations.map((l: any) => [l.id, l.name]));

    const activeBreaches = allItems.filter(
      (it) => Number(it.balanceQty) <= Number(it.bufferLimit)
    );

    return NextResponse.json({
      success: true,
      count: activeBreaches.length,
      items: activeBreaches.map((it) => ({
        id: it.id,
        productName: it.productName,
        centerName: it.locationId ? (locMap.get(it.locationId) || 'Unassigned Centre') : 'All Centres',
        balanceQty: it.balanceQty,
        bufferLimit: it.bufferLimit,
        reorderQty: it.bufferLimit * 3,
        purchaseStatus: it.purchaseStatus,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Daily buffer cron check error' }, { status: 500 });
  }
}
