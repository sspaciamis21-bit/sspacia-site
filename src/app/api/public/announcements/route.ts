import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_ANNOUNCEMENT = 'MEETING ROOM EXCLUSIVE: 50% OFF* on first booking | 25% OFF * on full day booking. •';

// GET /api/public/announcements
// Public endpoint for top moving marquee bar
export async function GET() {
  try {
    let announcements = await (prisma as any).announcementLabel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    });

    if (!announcements || announcements.length === 0) {
      // Seed initial default marquee text if database is empty
      const created = await (prisma as any).announcementLabel.create({
        data: {
          text: DEFAULT_ANNOUNCEMENT,
          isActive: true,
          sortOrder: 0
        }
      });
      announcements = [created];
    }

    return NextResponse.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('[PUBLIC_ANNOUNCEMENTS_GET]', error);
    return NextResponse.json({
      success: true,
      data: [{ id: 0, text: DEFAULT_ANNOUNCEMENT, isActive: true }]
    });
  }
}
