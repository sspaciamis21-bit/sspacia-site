import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

// GET /api/admin/announcements
// Super Admin fetches all announcement labels
export const GET = withPermission('products', 'read', async (
  _req: NextRequest,
  { payload }: PermissionContext
) => {
  try {
    const announcements = await (prisma as any).announcementLabel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('[ADMIN_ANNOUNCEMENTS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

// POST /api/admin/announcements
// Super Admin creates a new top-bar announcement marquee label
export const POST = withPermission('products', 'create', async (
  req: NextRequest,
  { payload }: PermissionContext
) => {
  try {
    const body = await req.json();
    const { text, isActive, sortOrder } = body;

    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'Announcement text is required' }, { status: 400 });
    }

    const created = await (prisma as any).announcementLabel.create({
      data: {
        text: String(text).trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      }
    });

    return NextResponse.json({
      success: true,
      data: created
    });
  } catch (error) {
    console.error('[ADMIN_ANNOUNCEMENT_CREATE]', error);
    return NextResponse.json({ error: 'Failed to create announcement label' }, { status: 500 });
  }
});
