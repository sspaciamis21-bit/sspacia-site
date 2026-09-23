import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    let userId: number | null = null;
    let userName = 'Community Manager';

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        userId = Number(payload.id);
        userName = (payload.name as string) || (payload.email as string) || userName;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      sourceItemId,
      toLocationId,
      toCabinName,
      quantity,
      transferDate,
      remarks = '',
    } = body;

    const parsedTransferDate = transferDate ? new Date(transferDate) : new Date();
    const qtyToTransfer = parseInt(String(quantity), 10);
    const targetLocId = parseInt(String(toLocationId), 10);
    const srcItemId = parseInt(String(sourceItemId), 10);
    const normalizedToCabin = toCabinName && String(toCabinName).trim() !== '' ? String(toCabinName).trim() : null;

    if (!srcItemId || isNaN(srcItemId)) {
      return NextResponse.json({ error: 'Source inventory item is required' }, { status: 400 });
    }

    if (!targetLocId || isNaN(targetLocId)) {
      return NextResponse.json({ error: 'Destination centre is required' }, { status: 400 });
    }

    if (!qtyToTransfer || qtyToTransfer <= 0) {
      return NextResponse.json({ error: 'Transfer quantity must be greater than 0' }, { status: 400 });
    }

    // 1. Fetch source item
    const sourceItem = await (prisma as any).fixedInventoryItem.findUnique({
      where: { id: srcItemId },
    });

    if (!sourceItem) {
      return NextResponse.json({ error: 'Source inventory item not found' }, { status: 404 });
    }

    const normalizedFromCabin = sourceItem.cabinName && String(sourceItem.cabinName).trim() !== '' ? String(sourceItem.cabinName).trim() : null;
    const isSameLocation = sourceItem.locationId === targetLocId;

    if (isSameLocation) {
      // Intra-center transfer: destination cabin must be different from source cabin
      const fromCabinLabel = normalizedFromCabin || '';
      const toCabinLabel = normalizedToCabin || '';
      if (fromCabinLabel.toLowerCase() === toCabinLabel.toLowerCase()) {
        return NextResponse.json({
          error: 'For transfers within the same centre, destination cabin/room must be different from source cabin/room.',
        }, { status: 400 });
      }
    }

    if (sourceItem.balanceQty < qtyToTransfer) {
      return NextResponse.json({
        error: `Insufficient stock! Current balance is ${sourceItem.balanceQty} units (attempted to transfer ${qtyToTransfer} units).`,
      }, { status: 400 });
    }

    // 2. Fetch location names
    const locations = await (prisma as any).location.findMany({
      where: { id: { in: [sourceItem.locationId, targetLocId].filter(Boolean) } },
    });
    const fromLocName = locations.find((l: any) => l.id === sourceItem.locationId)?.name || 'Source Centre';
    const toLocName = locations.find((l: any) => l.id === targetLocId)?.name || 'Destination Centre';

    // 3. Deduct from source item
    const newSourceBalance = sourceItem.balanceQty - qtyToTransfer;

    await (prisma as any).fixedInventoryItem.update({
      where: { id: srcItemId },
      data: {
        balanceQty: newSourceBalance,
        balanceAmount: 0,
      },
    });

    // 4. Find or create destination item at toLocationId matching toCabinName
    let destinationItem = await (prisma as any).fixedInventoryItem.findFirst({
      where: {
        locationId: targetLocId,
        productName: { equals: sourceItem.productName },
        cabinName: normalizedToCabin ? { equals: normalizedToCabin } : null,
      },
    });

    if (destinationItem) {
      // Increase existing stock at destination cabin/centre
      const newDestBalance = destinationItem.balanceQty + qtyToTransfer;
      const newDestInitial = (destinationItem.initialQty || 0) + qtyToTransfer;

      const movementNote = isSameLocation
        ? `[Relocated +${qtyToTransfer} from ${normalizedFromCabin || 'General Stock'} to ${normalizedToCabin || 'General Stock'} on ${new Date().toLocaleDateString('en-IN')}]`
        : `[Received +${qtyToTransfer} from ${fromLocName}${normalizedFromCabin ? ` (${normalizedFromCabin})` : ''} on ${new Date().toLocaleDateString('en-IN')}]`;

      destinationItem = await (prisma as any).fixedInventoryItem.update({
        where: { id: destinationItem.id },
        data: {
          initialQty: newDestInitial,
          balanceQty: newDestBalance,
          balanceAmount: 0,
          remarks: destinationItem.remarks
            ? `${destinationItem.remarks}\n${movementNote}`
            : movementNote,
        },
      });
    } else {
      // Auto-create new product item at destination centre & cabin
      const maxSrAtDest = await (prisma as any).fixedInventoryItem.findFirst({
        where: { locationId: targetLocId },
        orderBy: { srNo: 'desc' },
        select: { srNo: true },
      });

      const nextSrNoAtDest = (maxSrAtDest?.srNo || 0) + 1;

      const initialRemarks = isSameLocation
        ? `Relocated from ${normalizedFromCabin || 'General Centre Stock'}${remarks ? ` (${remarks})` : ''}`
        : `Transferred from ${fromLocName}${normalizedFromCabin ? ` (${normalizedFromCabin})` : ''}${remarks ? ` (${remarks})` : ''}`;

      destinationItem = await (prisma as any).fixedInventoryItem.create({
        data: {
          srNo: nextSrNoAtDest,
          createdAt: parsedTransferDate,
          productName: sourceItem.productName,
          locationId: targetLocId,
          cabinName: normalizedToCabin || null,
          initialQty: qtyToTransfer,
          balanceQty: qtyToTransfer,
          unitCost: 0,
          balanceAmount: 0,
          remarks: initialRemarks,
          createdById: userId,
        },
      });
    }

    // 5. Create immutable audit transfer log with cabin details
    const transferLog = await (prisma as any).inventoryTransferLog.create({
      data: {
        productName: sourceItem.productName,
        fromLocationId: sourceItem.locationId || 0,
        fromLocationName: fromLocName,
        fromCabinName: normalizedFromCabin || null,
        toLocationId: targetLocId,
        toLocationName: toLocName,
        toCabinName: normalizedToCabin || null,
        quantity: qtyToTransfer,
        sourceItemId: sourceItem.id,
        destinationItemId: destinationItem.id,
        remarks: remarks ? String(remarks).trim() : null,
        transferredById: userId,
        transferredByName: userName,
        createdAt: parsedTransferDate,
      },
    });

    const successMessage = isSameLocation
      ? `Successfully relocated ${qtyToTransfer}x "${sourceItem.productName}" from "${normalizedFromCabin || 'General Stock'}" to "${normalizedToCabin || 'General Stock'}" within ${fromLocName}!`
      : `Successfully transferred ${qtyToTransfer}x "${sourceItem.productName}" from ${fromLocName}${normalizedFromCabin ? ` (${normalizedFromCabin})` : ''} to ${toLocName}${normalizedToCabin ? ` (${normalizedToCabin})` : ''}!`;

    return NextResponse.json({
      success: true,
      message: successMessage,
      data: {
        sourceBalanceRemaining: newSourceBalance,
        destinationBalanceNew: destinationItem.balanceQty,
        transferLog,
      },
    });
  } catch (error: any) {
    console.error('Inventory transfer error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process inventory transfer' }, { status: 500 });
  }
}

/**
 * GET /api/admin/inventory/transfer
 * Returns full history of all inter-centre transfers
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    const where: any = {};
    if (locationId && locationId !== 'ALL') {
      const locId = Number(locationId);
      where.OR = [
        { fromLocationId: locId },
        { toLocationId: locId },
      ];
    }

    const logs = await (prisma as any).inventoryTransferLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Fetch inventory transfer logs error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch transfer logs' }, { status: 500 });
  }
}
