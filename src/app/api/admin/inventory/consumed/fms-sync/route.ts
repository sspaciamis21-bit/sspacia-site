import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { findManyConsumedItems } from '@/lib/consumedInventoryDb';

export const dynamic = 'force-dynamic';

const APPS_SCRIPT_URL =
  process.env.EXPENSE_FMS_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';

function formatToIST(dateInput: any): string | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(istDate.getUTCDate());
  const month = pad(istDate.getUTCMonth() + 1);
  const year = istDate.getUTCFullYear();
  const hours = pad(istDate.getUTCHours());
  const minutes = pad(istDate.getUTCMinutes());
  const seconds = pad(istDate.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * GET /api/admin/inventory/consumed/fms-sync
 * Public/Webhook-accessible endpoint to fetch all items that have buffer limit exceed history
 */
export async function GET() {
  try {
    const items = await findManyConsumedItems({});
    const locations = await (prisma as any).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const locMap = new Map(locations.map((l: any) => [l.id, l.name]));

    // Filter items that have exceeded buffer limit or have planned timestamps
    const bufferItems = items
      .filter((it: any) => {
        const isAlert = it.isBufferAlertActive === true || Number(it.isBufferAlertActive) === 1;
        const hasPlanned = Boolean(it.purchasePlannedAt || it.bufferAlertTriggeredAt);
        const hasActual = Boolean(it.purchaseActualAt);
        const isBelowBuffer = Number(it.balanceQty) <= Number(it.bufferLimit);
        return isAlert || hasPlanned || hasActual || isBelowBuffer;
      })
      .map((it: any) => {
        const triggered = it.bufferAlertTriggeredAt || it.purchasePlannedAt || it.createdAt;
        return {
          id: it.id,
          itemName: it.productName,
          centerName: it.locationId ? (locMap.get(it.locationId) || 'SSPACIA Centre') : 'SSPACIA Centre',
          currentStock: it.balanceQty,
          bufferLimit: it.bufferLimit,
          reorderQty: it.bufferLimit * 3,
          bufferAlertTriggeredAt: formatToIST(triggered),
          purchasePlannedAt: formatToIST(triggered),
          purchaseActualAt: formatToIST(it.purchaseActualAt),
          purchaseStatus: it.purchaseStatus,
        };
      });

    return NextResponse.json({
      success: true,
      count: bufferItems.length,
      data: bufferItems,
    });
  } catch (error: any) {
    console.error('[FMS-Sync GET] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch items' }, { status: 500 });
  }
}

/**
 * POST /api/admin/inventory/consumed/fms-sync
 * Pushes all buffer items directly to S-PURCHASE FMS in Google Sheets
 */
export async function POST() {
  try {
    const items = await findManyConsumedItems({});
    const locations = await (prisma as any).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const locMap = new Map(locations.map((l: any) => [l.id, l.name]));

    const bufferItems = items
      .filter((it: any) => {
        const isAlert = it.isBufferAlertActive === true || Number(it.isBufferAlertActive) === 1;
        const hasPlanned = Boolean(it.purchasePlannedAt || it.bufferAlertTriggeredAt);
        const hasActual = Boolean(it.purchaseActualAt);
        const isBelowBuffer = Number(it.balanceQty) <= Number(it.bufferLimit);
        return isAlert || hasPlanned || hasActual || isBelowBuffer;
      })
      .map((it: any) => {
        const triggered = it.bufferAlertTriggeredAt || it.purchasePlannedAt || it.createdAt;
        return {
          id: it.id,
          itemName: it.productName,
          centerName: it.locationId ? (locMap.get(it.locationId) || 'SSPACIA Centre') : 'SSPACIA Centre',
          currentStock: it.balanceQty,
          bufferLimit: it.bufferLimit,
          reorderQty: it.bufferLimit * 3,
          bufferAlertTriggeredAt: formatToIST(triggered),
          purchasePlannedAt: formatToIST(triggered),
          purchaseActualAt: formatToIST(it.purchaseActualAt),
          purchaseStatus: it.purchaseStatus,
        };
      });

    if (bufferItems.length === 0) {
      return NextResponse.json({ success: true, message: 'No items to sync', count: 0 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'purchase_fms_bootstrap_sync',
        items: bufferItems,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const fmsData = await res.json().catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Pushed ${bufferItems.length} items to S-PURCHASE FMS!`,
      count: bufferItems.length,
      fmsData,
    });
  } catch (error: any) {
    console.error('[FMS-Sync POST] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to sync with FMS' }, { status: 500 });
  }
}
