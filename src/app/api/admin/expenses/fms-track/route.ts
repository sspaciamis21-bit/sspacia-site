import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { trackExpenseFmsActual } from '@/lib/expenseFms';

export async function POST(req: NextRequest) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { centerName, locationId } = body;

    let targetCenterName = centerName;

    if (!targetCenterName && locationId) {
      const location = await prisma.location.findUnique({
        where: { id: Number(locationId) },
        select: { name: true }
      });
      if (location) {
        targetCenterName = location.name;
      }
    }

    if (!targetCenterName) {
      return NextResponse.json({ error: 'centerName or locationId is required' }, { status: 400 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    // Fire FMS tracking in background
    const result = await trackExpenseFmsActual({
      centerName: targetCenterName,
      userEmail: dbUser?.email || undefined,
      userName: dbUser?.name || undefined,
      action: 'mark_actual'
    });

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to track FMS';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
