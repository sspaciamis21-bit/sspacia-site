import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionToken, isLoggedOut, isUnregistered, userEmail } = body;

    // Extract real client IP address from headers
    const cfIp = request.headers.get('cf-connecting-ip');
    const realIp = request.headers.get('x-real-ip');
    const forwarded = request.headers.get('x-forwarded-for');
    
    let rawIp = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');

    // Geo-IP Lookup using geoip-lite
    let city = 'Ahmedabad';
    let state = 'Gujarat';
    let country = 'India';
    let lat = 23.0225;
    let lng = 72.5714;

    if (rawIp && rawIp !== '127.0.0.1' && rawIp !== '::1' && !rawIp.startsWith('192.168.') && !rawIp.startsWith('10.')) {
      try {
        const geoip = require('geoip-lite');
        const geo = geoip.lookup(rawIp);
        if (geo) {
          city = geo.city || city;
          state = geo.region || state;
          country = geo.country || country;
          if (geo.ll && geo.ll.length === 2) {
            lat = geo.ll[0];
            lng = geo.ll[1];
          }
        }
      } catch (e) {
        console.warn('[GEOIP_LOOKUP_WARNING]', e);
      }
    }

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 3. Deduplication: Check if this session or IP visited within the last 30 minutes
    const existingLog = await (prisma as any).visitorLog.findFirst({
      where: {
        OR: [
          ...(sessionToken ? [{ sessionToken }] : []),
          ...(rawIp ? [{ ipAddress: rawIp }] : [])
        ],
        visitedAt: { gte: thirtyMinsAgo }
      },
      orderBy: { visitedAt: 'desc' }
    });

    if (existingLog) {
      // Update existing record timestamp & status rather than creating a duplicate row
      const updatedLog = await (prisma as any).visitorLog.update({
        where: { id: existingLog.id },
        data: {
          visitedAt: new Date(),
          isLoggedOut: Boolean(isLoggedOut),
          isUnregistered: Boolean(isUnregistered),
          ...(userEmail ? { userEmail } : {})
        }
      });
      return NextResponse.json({ success: true, logId: updatedLog.id, deduplicated: true });
    }

    // 4. Create new visitor log entry
    const newLog = await (prisma as any).visitorLog.create({
      data: {
        sessionToken: sessionToken || null,
        ipAddress: rawIp,
        city,
        state,
        country,
        latitude: lat,
        longitude: lng,
        hasChatted: false,
        isUnregistered: Boolean(isUnregistered),
        isLoggedOut: Boolean(isLoggedOut),
        isConverted: false,
        userEmail: userEmail || null
      }
    });

    return NextResponse.json({ success: true, logId: newLog.id, city, state });
  } catch (error) {
    console.error('[TRACK_VISITOR_ERROR]', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
