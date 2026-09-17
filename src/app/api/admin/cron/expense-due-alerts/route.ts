import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { runExpenseDueDateAlertEmails } from '@/lib/expense-due-automation';

async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: { role: true },
    });
    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/cron/expense-due-alerts — Check status or trigger preview
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    const url = new URL(request.url);
    const cronSecret = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isAuthorizedCron && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forceDispatch = url.searchParams.get('force') === 'true';
    const overrideTo = url.searchParams.get('to') || undefined;

    const result = await runExpenseDueDateAlertEmails({
      forceDispatch,
      overrideTo,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[EXPENSE_DUE_CRON_GET]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to run expense due date alerts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/cron/expense-due-alerts — Force execute or test email dispatch
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    const cronSecret = request.headers.get('x-cron-secret');
    const isAuthorizedCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isAuthorizedCron && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { forceDispatch, overrideTo, overrideCc } = body;

    const result = await runExpenseDueDateAlertEmails({
      forceDispatch: Boolean(forceDispatch),
      overrideTo,
      overrideCc,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[EXPENSE_DUE_CRON_POST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to run expense due date alerts' },
      { status: 500 }
    );
  }
}
