import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { repopulateDailyFmsChecks } from '@/lib/accountsFmsSync';

export const dynamic = 'force-dynamic';

export async function POST() {
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

    const result = await repopulateDailyFmsChecks();

    return NextResponse.json({
      success: true,
      message: 'Daily FMS checks repopulated to Google Sheets tab Accounts',
      result,
    });
  } catch (err: any) {
    console.error('[DAILY_FMS_REPOPULATE_ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to repopulate daily FMS checks' },
      { status: 500 }
    );
  }
}
