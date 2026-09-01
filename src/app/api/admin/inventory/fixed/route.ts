import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { getNodeScopedUserIds, getUserIdsByLocation } from '@/lib/auth/getNodeScopedUserIds';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/inventory/fixed
 * Fetches all fixed inventory items with node scoping and distinct product suggestions
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let isAdmin = false;

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

    const where: any = {};

    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { remarks: { contains: search } },
      ];
    }

    // Node data scoping
    if (!isAdmin) {
      const user = await (prisma as any).user.findUnique({
        where: { id: userId },
        include: { assignedLocations: true },
      });
      const myLocationIds = (user?.assignedLocations || []).map((l: any) => l.locationId);

      if (myLocationIds.length > 0) {
        if (locationIdParam && locationIdParam !== 'ALL') {
          const selectedLoc = Number(locationIdParam);
          if (myLocationIds.includes(selectedLoc)) {
            where.locationId = selectedLoc;
          } else {
            where.locationId = { in: myLocationIds };
          }
        } else {
          where.locationId = { in: myLocationIds };
        }
      }
    } else {
      if (locationIdParam && locationIdParam !== 'ALL') {
        where.locationId = Number(locationIdParam);
      }
    }

    const items = await (prisma as any).fixedInventoryItem.findMany({
      where,
      orderBy: [
        { srNo: 'asc' },
        { id: 'asc' },
      ],
    });

    // Fetch all locations to attach names
    const locations = await (prisma as any).location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const locMap = new Map(locations.map((l: any) => [l.id, l.name]));

    const enrichedItems = items.map((it: any) => ({
      ...it,
      locationName: it.locationId ? (locMap.get(it.locationId) || 'Unassigned Centre') : 'All Centres',
      balanceAmount: (Number(it.balanceQty) || 0) * (Number(it.unitCost) || 0),
    }));

    // Fetch distinct product names across inventory for dynamic dropdown suggestions
    const allProductsRaw = await (prisma as any).fixedInventoryItem.findMany({
      select: { productName: true },
      distinct: ['productName'],
    });

    const defaultSuggestions = [
      'Executive Table',
      'Work Desk',
      'Ergonomic Mesh Chair',
      'Visitor Chair',
      'Conference Table',
      'Whiteboard',
      'Ceramic Plates',
      'Coffee Mugs',
      'Water Dispenser',
      'Microwave Oven',
      'Projector',
      'Monitor',
      'Pedestal Drawer',
      'Sofa Set',
    ];

    const existingNames = allProductsRaw.map((p: any) => p.productName).filter(Boolean);
    const combinedProductSuggestions = Array.from(new Set([...defaultSuggestions, ...existingNames])).sort();

    return NextResponse.json({
      success: true,
      data: enrichedItems,
      productSuggestions: combinedProductSuggestions,
      locations,
    });
  } catch (error: any) {
    console.error('Fetch fixed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch fixed inventory' }, { status: 500 });
  }
}

/**
 * POST /api/admin/inventory/fixed
 * Creates a new fixed inventory item
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      productName,
      locationId,
      initialQty = 0,
      unitCost = 0,
      remarks = '',
    } = body;

    if (!productName || typeof productName !== 'string' || productName.trim() === '') {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const cleanProductName = productName.trim();
    const targetLocationId = locationId ? Number(locationId) : null;
    const qty = Math.max(0, parseInt(String(initialQty), 10) || 0);
    const cost = Math.max(0, parseFloat(String(unitCost)) || 0);
    const balanceAmt = qty * cost;

    // Determine auto-incremented sequential SR.No for this location
    const maxSrItem = await (prisma as any).fixedInventoryItem.findFirst({
      where: targetLocationId ? { locationId: targetLocationId } : {},
      orderBy: { srNo: 'desc' },
      select: { srNo: true },
    });

    const nextSrNo = (maxSrItem?.srNo || 0) + 1;

    const newItem = await (prisma as any).fixedInventoryItem.create({
      data: {
        srNo: nextSrNo,
        productName: cleanProductName,
        locationId: targetLocationId,
        initialQty: qty,
        balanceQty: qty,
        unitCost: cost,
        balanceAmount: balanceAmt,
        remarks: remarks ? String(remarks).trim() : null,
        createdById: userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Fixed inventory entry #${nextSrNo} (${cleanProductName}) created successfully!`,
      data: newItem,
    });
  } catch (error: any) {
    console.error('Create fixed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create fixed inventory entry' }, { status: 500 });
  }
}
