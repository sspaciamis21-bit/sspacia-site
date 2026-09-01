import { NextResponse } from 'next/server';
import { autoDispatchIfLastDay } from '@/lib/auto-dispatch';

export const dynamic = 'force-dynamic';

/**
 * API route to auto-dispatch month-end invoices on the last day of the month.
 * Scheduled at 12:00 AM (00:00) IST on the last day of every month,
 * or can be pinged by an external cron/webhook anytime.
 */
export async function POST() {
  try {
    const result = await autoDispatchIfLastDay();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('Trigger month-end invoice auto-dispatch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to auto-dispatch month-end invoices' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await autoDispatchIfLastDay();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('Trigger month-end invoice auto-dispatch GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to auto-dispatch month-end invoices' },
      { status: 500 }
    );
  }
}
