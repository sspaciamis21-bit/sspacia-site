import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendPurchaseOrderEmail } from '@/lib/purchaseEmail';
import { trackPurchaseFmsPlanned } from '@/lib/purchaseFms';
import { findUniqueConsumedItem, updateConsumedItem, deleteConsumedItem } from '@/lib/consumedInventoryDb';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/inventory/consumed/[id]
 * Updates a consumed inventory entry and triggers buffer stock alerts if threshold breached
 */
export async function PUT(
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
    let isAdmin = false;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        userName = (payload.name as string) || 'Community Manager';
        userEmail = (payload.email as string) || 'cm@sspacia.com';
        const role = ((payload.role as string) || '').toUpperCase().replace(/[\s_-]/g, '');
        isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingItem = await findUniqueConsumedItem(itemId);

    if (!existingItem) {
      return NextResponse.json({ error: 'Consumed inventory item not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      entryDate,
      productName,
      locationId,
      initialQty,
      balanceQty,
      bufferLimit,
      unitCost,
      remarks,
    } = body;

    const newProductName = (productName || existingItem.productName || '').trim();
    const targetLocId = locationId !== undefined ? Number(locationId) : existingItem.locationId;
    const newInitialQty = initialQty !== undefined ? Math.max(0, parseInt(String(initialQty), 10) || 0) : existingItem.initialQty;
    const newBalanceQty = balanceQty !== undefined ? Math.max(0, parseInt(String(balanceQty), 10) || 0) : existingItem.balanceQty;
    const newBufferLimit = bufferLimit !== undefined ? Math.max(1, parseInt(String(bufferLimit), 10) || 1) : (existingItem.bufferLimit || 1);
    const newUnitCost = unitCost !== undefined ? Math.max(0, parseFloat(String(unitCost)) || 0) : (existingItem.unitCost || 0);
    const newBalanceAmount = newBalanceQty * newUnitCost;

    // Check Centre details for email & sheet logging
    const locationRecord = targetLocId
      ? await (prisma as any).location.findUnique({ where: { id: targetLocId } })
      : null;
    const centerName = locationRecord?.name || 'SSPACIA Centre';

    const isBufferBreached = newBalanceQty <= newBufferLimit;
    const reorderQty = newBufferLimit * 3;

    const isAlertActiveBool = existingItem.isBufferAlertActive === true || Number(existingItem.isBufferAlertActive) === 1;

    // Detect if we need to trigger a fresh purchase order alert
    const shouldTriggerPurchase =
      isBufferBreached &&
      (!isAlertActiveBool ||
        existingItem.purchaseStatus === 'DELIVERED' ||
        existingItem.purchaseStatus === 'NORMAL');

    let purchaseStatus = existingItem.purchaseStatus;
    let purchasePlannedAt = existingItem.purchasePlannedAt;
    let bufferAlertTriggeredAt = existingItem.bufferAlertTriggeredAt;

    if (shouldTriggerPurchase) {
      purchaseStatus = 'PENDING_PURCHASE';
      purchasePlannedAt = new Date();
      bufferAlertTriggeredAt = new Date();

      // 1. Dispatch Automated Purchase Email (3x buffer quantity)
      sendPurchaseOrderEmail({
        productName: newProductName,
        centerName,
        currentStock: newBalanceQty,
        bufferLimit: newBufferLimit,
        reorderQty,
        requestedByName: userName,
        remarks: remarks !== undefined ? String(remarks).trim() : existingItem.remarks,
      }).catch((err) => console.error('[Consumed Inventory PUT] Email error:', err));

      // 2. Log to Google Sheet 'sspacia-purchase' tab
      trackPurchaseFmsPlanned({
        itemName: newProductName,
        centerName,
        reorderQty,
        bufferLimit: newBufferLimit,
        currentStock: newBalanceQty,
        userEmail,
        userName,
      }).catch((err) => console.error('[Consumed Inventory PUT] FMS Sheet error:', err));
    } else if (!isBufferBreached && isAlertActiveBool) {
      // Stock replenished above buffer limit
      purchaseStatus = 'NORMAL';
    }

    const updated = await updateConsumedItem(itemId, {
      productName: newProductName,
      locationId: targetLocId,
      initialQty: newInitialQty,
      balanceQty: newBalanceQty,
      bufferLimit: newBufferLimit,
      unitCost: newUnitCost,
      balanceAmount: newBalanceAmount,
      remarks: remarks !== undefined ? String(remarks).trim() : existingItem.remarks,
      isBufferAlertActive: isBufferBreached,
      bufferAlertTriggeredAt,
      purchaseStatus,
      purchasePlannedAt,
      ...(entryDate ? { createdAt: new Date(entryDate) } : {}),
    });

    return NextResponse.json({
      success: true,
      message: `Consumable "${newProductName}" updated successfully!${
        shouldTriggerPurchase
          ? ` ⚠️ Buffer stock limit reached (${newBalanceQty} <= ${newBufferLimit}). Purchase order email dispatched for ${reorderQty} units!`
          : ''
      }`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update consumed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update consumed inventory' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/inventory/consumed/[id]
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const itemId = parseInt(id, 10);
    if (!itemId) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 });
    }

    await deleteConsumedItem(itemId);

    return NextResponse.json({
      success: true,
      message: 'Consumed inventory item deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete consumed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete consumed inventory item' }, { status: 500 });
  }
}
