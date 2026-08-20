import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// In-memory presence store: locationId -> Map<userId, { userName, rowId, colId, lastSeen }>
const presenceStore = new Map<number, Map<number, { userName: string; rowId: string; colId: string; lastSeen: number }>>();

// Clean stale presence entries (older than 10 seconds)
function cleanStalePresence(locationId: number) {
  const locMap = presenceStore.get(locationId);
  if (!locMap) return;
  const now = Date.now();
  for (const [userId, data] of locMap.entries()) {
    if (now - data.lastSeen > 10000) {
      locMap.delete(userId);
    }
  }
  if (locMap.size === 0) {
    presenceStore.delete(locationId);
  }
}

// POST /api/admin/expenses/[locationId]/presence — Send cursor position
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const resolvedParams: any = await (params as any);
    const locationId = Number(resolvedParams?.locationId || 0);
    if (!locationId || isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const userId = Number(payload.id || (payload as any).userId);
    const body = await req.json().catch(() => ({}));
    const { userName = 'User', rowId = '', colId = '' } = body;

    if (!presenceStore.has(locationId)) {
      presenceStore.set(locationId, new Map());
    }

    const locMap = presenceStore.get(locationId)!;
    locMap.set(userId, {
      userName,
      rowId,
      colId,
      lastSeen: Date.now(),
    });

    cleanStalePresence(locationId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PRESENCE_POST_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to update presence' }, { status: 500 });
  }
}

// GET /api/admin/expenses/[locationId]/presence — Get active users
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const payload = await requireAuth();
    if (!payload || (!payload.id && !(payload as any).userId)) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const resolvedParams: any = await (params as any);
    const locationId = Number(resolvedParams?.locationId || 0);
    if (!locationId || isNaN(locationId)) {
      return NextResponse.json({ error: 'Invalid location ID' }, { status: 400 });
    }

    const currentUserId = Number(payload.id || (payload as any).userId);

    cleanStalePresence(locationId);

    const locMap = presenceStore.get(locationId);
    const users: { userId: number; userName: string; rowId: string; colId: string }[] = [];

    if (locMap) {
      for (const [uid, data] of locMap.entries()) {
        if (uid !== currentUserId) {
          users.push({
            userId: uid,
            userName: data.userName,
            rowId: data.rowId,
            colId: data.colId,
          });
        }
      }
    }

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('[PRESENCE_GET_ERROR]', error);
    return NextResponse.json({ error: error?.message || 'Failed to get presence' }, { status: 500 });
  }
}
