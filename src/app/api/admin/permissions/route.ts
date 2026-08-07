import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

// GET /api/admin/permissions — Returns all permissions grouped by module
export const GET = withPermission('roles', 'read', async () => {
  try {
    const permissions = await prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        module: true,
        action: true,
        displayName: true,
        description: true,
      },
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });

    return NextResponse.json({ data: permissions });
  } catch (error) {
    console.error('[PERMISSIONS_READ]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
