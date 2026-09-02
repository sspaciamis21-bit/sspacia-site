import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { sendPurchaseOrderEmail } from '@/lib/purchaseEmail';
import { trackPurchaseFmsPlanned } from '@/lib/purchaseFms';
import { findManyConsumedItems, createConsumedItem } from '@/lib/consumedInventoryDb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/inventory/consumed
 * Fetches all consumed inventory items with centre scoping and buffer status
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;
    let userAssignedLocationIds: number[] = [];

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        const role = ((payload.role as string) || '').toUpperCase().replace(/[\s_-]/g, '');
        isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const locationIdParam = searchParams.get('locationId');

    let targetLocationId: number | null | undefined = undefined;
    let targetLocationIds: number[] | undefined = undefined;

    // Node data scoping for Community Managers
    if (!isAdmin) {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: { assignedLocations: true },
      });
      userAssignedLocationIds = (user?.assignedLocations || []).map((l: any) => l.locationId);

      if (userAssignedLocationIds.length > 0) {
        if (locationIdParam && locationIdParam !== 'ALL') {
          const selectedLoc = Number(locationIdParam);
          if (userAssignedLocationIds.includes(selectedLoc)) {
            targetLocationId = selectedLoc;
          } else {
            targetLocationIds = userAssignedLocationIds;
          }
        } else {
          targetLocationIds = userAssignedLocationIds;
        }
      }
    } else {
      if (locationIdParam && locationIdParam !== 'ALL') {
        targetLocationId = Number(locationIdParam);
      }
    }

    const items = await findManyConsumedItems({
      search,
      locationId: targetLocationId,
      locationIds: targetLocationIds,
    });

    // Fetch all locations to attach names
    const locations = await (prisma as any).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const locMap = new Map(locations.map((l: any) => [l.id, l.name]));

    const enrichedItems = items.map((it: any) => {
      const isLowStock = Number(it.balanceQty) <= Number(it.bufferLimit);
      return {
        ...it,
        entryDate: it.entryDate || it.createdAt,
        locationName: it.locationId ? (locMap.get(it.locationId) || 'Unassigned Centre') : 'All Centres',
        balanceAmount: (Number(it.balanceQty) || 0) * (Number(it.unitCost) || 0),
        isLowStock,
        reorderQty: Math.max(1, (Number(it.bufferLimit) || 1) * 3),
      };
    });

    // Collect product suggestions
    const existingNames = items.map((p: any) => p.productName).filter(Boolean);

    const defaultConsumables = [
      'Sugar Packets (1kg)',
      'Tea Leaves (Tata Tea / Red Label)',
      'Coffee Powder (Nescafe / Bru)',
      'Tissue Paper Box',
      'Handwash Liquid (5L Can)',
      'Paper Cups (150ml)',
      'A4 Printing Paper (75 GSM Ream)',
      'Dairy Milk Packets (Amul Gold / Taaza)',
      'Dishwashing Liquid (Vim / Pril)',
      'Hand Sanitizer Refill (5L)',
      'Garbage Bags (Large Black Rolls)',
      'Green Tea Bags Box',
      'Cookies / Biscuits Assorted',
      'Whiteboard Marker Pens (Set)',
    ];

    const combinedProductSuggestions = Array.from(new Set([...defaultConsumables, ...existingNames])).sort();

    return NextResponse.json({
      success: true,
      data: enrichedItems,
      productSuggestions: combinedProductSuggestions,
      locations,
      userAssignedLocationIds,
      isAdmin,
    });
  } catch (error: any) {
    console.error('Fetch consumed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch consumed inventory' }, { status: 500 });
  }
}

/**
 * POST /api/admin/inventory/consumed
 * Creates a new consumed inventory entry with buffer threshold checking
 */
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const {
      entryDate,
      productName,
      locationId,
      initialQty = 1,
      balanceQty,
      bufferLimit = 1,
      unitCost = 0,
      remarks = '',
    } = body;

    if (!productName || typeof productName !== 'string' || productName.trim() === '') {
      return NextResponse.json({ error: 'Consumable Product / Item name is required' }, { status: 400 });
    }

    let targetLocationId = locationId ? Number(locationId) : null;
    if (!isAdmin && !targetLocationId) {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: { assignedLocations: true },
      });
      targetLocationId = user?.assignedLocations?.[0]?.locationId || null;
    }

    const locationRecord = targetLocationId
      ? await (prisma as any).location.findUnique({ where: { id: targetLocationId } })
      : null;
    const centerName = locationRecord?.name || 'SSPACIA Centre';

    const cleanProductName = productName.trim();
    const parsedDate = entryDate ? new Date(entryDate) : new Date();
    const initQty = Math.max(0, parseInt(String(initialQty), 10) || 0);
    const balQty = balanceQty !== undefined && balanceQty !== null && balanceQty !== ''
      ? Math.max(0, parseInt(String(balanceQty), 10) || 0)
      : initQty;
    const bufLimit = Math.max(1, parseInt(String(bufferLimit), 10) || 1);
    const cost = Math.max(0, parseFloat(String(unitCost)) || 0);
    const balanceAmt = balQty * cost;

    // Determine sequential SR.No for this location
    const existingForLoc = await findManyConsumedItems({
      locationId: targetLocationId,
    });
    const maxSrNo = existingForLoc.reduce((max, it) => Math.max(max, it.srNo || 0), 0);
    const nextSrNo = maxSrNo + 1;

    const isBufferReached = balQty <= bufLimit;
    const reorderQty = bufLimit * 3;

    let purchaseStatus = 'NORMAL';
    let purchasePlannedAt: Date | null = null;
    let bufferAlertTriggeredAt: Date | null = null;

    if (isBufferReached) {
      purchaseStatus = 'PENDING_PURCHASE';
      purchasePlannedAt = new Date();
      bufferAlertTriggeredAt = new Date();

      // 1. Dispatch Automated Purchase Email
      sendPurchaseOrderEmail({
        productName: cleanProductName,
        centerName,
        currentStock: balQty,
        bufferLimit: bufLimit,
        reorderQty,
        requestedByName: userName,
        remarks: remarks ? String(remarks).trim() : null,
      }).catch((err) => console.error('[Consumed Inventory] Email error:', err));

      // 2. Log to Google Sheet 'sspacia-purchase' tab
      trackPurchaseFmsPlanned({
        itemName: cleanProductName,
        centerName,
        reorderQty,
        bufferLimit: bufLimit,
        currentStock: balQty,
        userEmail,
        userName,
      }).catch((err) => console.error('[Consumed Inventory] FMS Sheet error:', err));
    }

    const newItem = await createConsumedItem({
      srNo: nextSrNo,
      entryDate: parsedDate,
      productName: cleanProductName,
      locationId: targetLocationId,
      initialQty: initQty,
      balanceQty: balQty,
      bufferLimit: bufLimit,
      unitCost: cost,
      balanceAmount: balanceAmt,
      remarks: remarks ? String(remarks).trim() : null,
      createdById: userId,
      isBufferAlertActive: isBufferReached,
      bufferAlertTriggeredAt,
      purchaseStatus,
      purchasePlannedAt,
    });

    return NextResponse.json({
      success: true,
      message: `Consumable item "${cleanProductName}" created successfully!${
        isBufferReached
          ? ` ⚠️ Low stock buffer limit reached (${balQty} <= ${bufLimit}). Purchase email dispatched for ${reorderQty} units.`
          : ''
      }`,
      data: newItem,
    });
  } catch (error: any) {
    console.error('Create consumed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create consumed inventory entry' }, { status: 500 });
  }
}
