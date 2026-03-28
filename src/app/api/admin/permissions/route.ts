import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

// GET /api/admin/permissions - List all available permissions
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || (payload.role as string) !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error('GET /api/admin/permissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
