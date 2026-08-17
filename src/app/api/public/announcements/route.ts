import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/announcements
// Public endpoint for top moving marquee bar
export async function GET() {
  try {
    const announcements = await (prisma as any).announcementLabel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });

    return NextResponse.json({
      success: true,
      data: announcements || []
    });
  } catch (error) {
    console.error('[PUBLIC_ANNOUNCEMENTS_GET]', error);
    return NextResponse.json({
      success: true,
      data: []
    });
  }
}
