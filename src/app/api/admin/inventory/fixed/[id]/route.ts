import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      productName,
      locationId,
      balanceQty,
      initialQty,
      unitCost,
      remarks,
    } = body;

    const existing = await (prisma as any).fixedInventoryItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Fixed inventory item not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (productName !== undefined) updateData.productName = String(productName).trim();
    if (locationId !== undefined) updateData.locationId = locationId ? Number(locationId) : null;
    if (initialQty !== undefined) updateData.initialQty = Math.max(0, parseInt(String(initialQty), 10) || 0);
    if (balanceQty !== undefined) updateData.balanceQty = Math.max(0, parseInt(String(balanceQty), 10) || 0);
    if (unitCost !== undefined) updateData.unitCost = Math.max(0, parseFloat(String(unitCost)) || 0);
    if (remarks !== undefined) updateData.remarks = remarks ? String(remarks).trim() : null;

    const finalBalanceQty = updateData.balanceQty !== undefined ? updateData.balanceQty : existing.balanceQty;
    const finalUnitCost = updateData.unitCost !== undefined ? updateData.unitCost : (existing.unitCost || 0);
    updateData.balanceAmount = finalBalanceQty * finalUnitCost;

    const updated = await (prisma as any).fixedInventoryItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Fixed inventory item updated successfully!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update fixed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await (prisma as any).fixedInventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Fixed inventory item deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete fixed inventory error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete item' }, { status: 500 });
  }
}
