import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

// PATCH /api/admin/announcements/[id]
// Super Admin updates an announcement marquee label
export const PATCH = withPermission('products', 'update', async (
  req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const labelId = parseInt(id, 10);
    if (isNaN(labelId)) {
      return NextResponse.json({ error: 'Invalid label ID' }, { status: 400 });
    }

    const body = await req.json();
    const updated = await (prisma as any).announcementLabel.update({
      where: { id: labelId },
      data: {
        ...(body.text !== undefined && { text: String(body.text).trim() }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('[ADMIN_ANNOUNCEMENT_PATCH]', error);
    return NextResponse.json({ error: 'Failed to update announcement label' }, { status: 500 });
  }
});

// DELETE /api/admin/announcements/[id]
// Super Admin deletes an announcement marquee label
export const DELETE = withPermission('products', 'delete', async (
  _req: NextRequest,
  { params, payload }: PermissionContext
) => {
  try {
    const { id } = await params;
    const labelId = parseInt(id, 10);
    if (isNaN(labelId)) {
      return NextResponse.json({ error: 'Invalid label ID' }, { status: 400 });
    }

    await (prisma as any).announcementLabel.delete({
      where: { id: labelId }
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement label deleted successfully'
    });
  } catch (error) {
    console.error('[ADMIN_ANNOUNCEMENT_DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete announcement label' }, { status: 500 });
  }
});
