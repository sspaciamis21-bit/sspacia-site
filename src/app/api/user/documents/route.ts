import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getOrCreateSyncedCustomer } from '@/lib/customerSyncHelper';

// GET /api/user/documents — List documents for authenticated user
export async function GET() {
  try {
    const payload = await requireAuth();
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const userId = Number(payload.id);
    const customer = await getOrCreateSyncedCustomer(userId, payload.email as string);

    if (!customer) {
      return NextResponse.json({ data: [] });
    }


    const data = await prisma.document.findMany({
      where: { customerId: customer.id },
      include: {
        category: { select: { id: true, name: true, displayName: true, slug: true } },
        status: { select: { id: true, name: true, displayName: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[USER_DOCUMENTS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
