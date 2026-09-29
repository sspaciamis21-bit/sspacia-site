import { NextResponse } from 'next/server';
import { fetchAllExpenseFmsItems } from '@/lib/expenseFmsSync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await fetchAllExpenseFmsItems();
    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Fetch expense FMS items error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch items' }, { status: 500 });
  }
}
