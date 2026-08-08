import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/user/notifications — Fetch user notifications
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userEmail = payload.email as string;

    const notifications = await prisma.userNotification.findMany({
      where: { userEmail },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.userNotification.count({
      where: { userEmail, isRead: false },
    });

    return NextResponse.json({ data: notifications, unreadCount });
  } catch (error) {
    console.error('[USER_NOTIFICATIONS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/user/notifications — Mark all or specific notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userEmail = payload.email as string;
    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      await prisma.userNotification.updateMany({
        where: { id: Number(id), userEmail },
        data: { isRead: true },
      });
    } else {
      await prisma.userNotification.updateMany({
        where: { userEmail, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER_NOTIFICATIONS_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
