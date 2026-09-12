import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { syncAccountsDailyFmsActual } from '@/lib/accountsFmsSync';

export const dynamic = 'force-dynamic';

export interface DailyFmsCheckItem {
  date: string; // YYYY-MM-DD
  status: 'YES' | 'NO';
  timestamp: string; // M/D/YYYY HH:mm:ss
  checkedById: number | null;
  checkedByName: string;
  checkedByEmail: string;
  checkedAt: string;
  remarks?: string | null;
}

const SETTING_KEY = 'invoice_daily_fms_checks';

// Helper to get current date in IST (YYYY-MM-DD)
function getTodayIst(): string {
  const istDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = istDate.getFullYear();
  const m = String(istDate.getMonth() + 1).padStart(2, '0');
  const d = String(istDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /api/admin/invoice-payments/daily-fms-check
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayDate = getTodayIst();

    const row = await (prisma as any).setting.findFirst({
      where: { key: SETTING_KEY },
    });

    let list: DailyFmsCheckItem[] = [];
    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    const todayCheck = list.find((c) => c.date === todayDate) || null;

    return NextResponse.json({
      success: true,
      todayDate,
      todayCheck,
      history: list.slice(0, 30),
    });
  } catch (err: any) {
    console.error('[DAILY_FMS_CHECK_GET_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch daily check status' },
      { status: 500 }
    );
  }
}

// POST /api/admin/invoice-payments/daily-fms-check
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const dbUser = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    });

    const userName = dbUser?.name || 'Accountant';
    const userEmail = dbUser?.email || '';

    const body = await request.json();
    const { status, remarks } = body;

    const normalizedStatus = String(status || '').toUpperCase();
    if (normalizedStatus !== 'YES' && normalizedStatus !== 'NO') {
      return NextResponse.json({ error: 'Status must be YES or NO' }, { status: 400 });
    }

    const todayDate = getTodayIst();

    // Format IST timestamp: M/D/YYYY HH:mm:ss
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const month = istDate.getMonth() + 1;
    const day = istDate.getDate();
    const year = istDate.getFullYear();
    const hours = istDate.getHours();
    const minutes = String(istDate.getMinutes()).padStart(2, '0');
    const seconds = String(istDate.getSeconds()).padStart(2, '0');
    const timestampFormatted = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

    const newEntry: DailyFmsCheckItem = {
      date: todayDate,
      status: normalizedStatus as 'YES' | 'NO',
      timestamp: timestampFormatted,
      checkedById: userId,
      checkedByName: userName,
      checkedByEmail: userEmail,
      checkedAt: now.toISOString(),
      remarks: remarks?.trim() || null,
    };

    // Read current setting
    const existing = await (prisma as any).setting.findFirst({
      where: { key: SETTING_KEY },
    });

    let list: DailyFmsCheckItem[] = [];
    if (existing && existing.value) {
      try {
        const parsed = JSON.parse(existing.value);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    }

    // Replace if check for today already exists, or unshift
    const idx = list.findIndex((c) => c.date === todayDate);
    if (idx >= 0) {
      list[idx] = newEntry;
    } else {
      list.unshift(newEntry);
    }
    list.sort((a, b) => b.date.localeCompare(a.date));

    const jsonValue = JSON.stringify(list);

    if (existing) {
      await (prisma as any).setting.update({
        where: { id: existing.id },
        data: { value: jsonValue },
      });
    } else {
      await (prisma as any).setting.create({
        data: {
          key: SETTING_KEY,
          value: jsonValue,
          group: 'billing',
        },
      });
    }

    // ── Dispatch to Google Sheet Accounts tab (Column R: Actual) ──
    syncAccountsDailyFmsActual(now).catch((fmsErr) => {
      console.warn('[Daily FMS Check] Google Sheets dispatch notice:', fmsErr);
    });

    return NextResponse.json({
      success: true,
      message: `Daily check recorded: ${normalizedStatus}`,
      check: newEntry,
    });
  } catch (err: any) {
    console.error('[DAILY_FMS_CHECK_POST_ERROR]', err);
    return NextResponse.json(
      { error: err.message || 'Failed to record daily check' },
      { status: 500 }
    );
  }
}
