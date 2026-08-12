import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withPermission, type PermissionContext } from '@/lib/auth/withPermission';
import prisma from '@/lib/prisma';

export interface CityGeoData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  visitors: number;
  chatLeads: number;
  convertedLeads: number;
  loggedOutVisitors: number;
  unregisteredVisitors: number;
}

// Master Fallback Coordinates for Major Indian Cities
const INDIAN_CITIES_COORDS: Record<string, { state: string; lat: number; lng: number }> = {
  "Ahmedabad": { state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  "Surat": { state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  "Vadodara": { state: "Gujarat", lat: 22.3072, lng: 73.1812 },
  "Rajkot": { state: "Gujarat", lat: 22.3039, lng: 70.8022 },
  "Mumbai": { state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  "Pune": { state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  "Nagpur": { state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  "Delhi": { state: "Delhi", lat: 28.7041, lng: 77.1025 },
  "Bangalore": { state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  "Hyderabad": { state: "Telangana", lat: 17.3850, lng: 78.4867 },
  "Chennai": { state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  "Jaipur": { state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  "Indore": { state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  "Kolkata": { state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  "Lucknow": { state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
};

// GET /api/admin/visitor-geo-analytics
export const GET = withPermission('dashboard', 'read', async (
  req: NextRequest,
  { payload }: PermissionContext
) => {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    // Build filter condition for Prisma aggregation
    const whereCondition: any = {};
    if (filter === 'unregistered') whereCondition.isUnregistered = true;
    if (filter === 'chat') whereCondition.hasChatted = true;
    if (filter === 'loggedout') whereCondition.isLoggedOut = true;
    if (filter === 'converted') whereCondition.isConverted = true;

    // 1. Group DB logs by city and state using high-performance aggregation
    const groupedResults = await (prisma as any).visitorLog.groupBy({
      by: ['city', 'state'],
      where: whereCondition,
      _count: { id: true },
      _avg: { latitude: true, longitude: true },
    });

    // 2. Fetch breakdown counts per city
    const cityBreakdown = await (prisma as any).visitorLog.groupBy({
      by: ['city', 'hasChatted', 'isConverted', 'isLoggedOut', 'isUnregistered'],
      _count: { id: true }
    });

    // Create map for city breakdowns
    const breakdownMap: Record<string, { chat: number; converted: number; loggedOut: number; unreg: number }> = {};

    cityBreakdown.forEach((item: any) => {
      const c = item.city;
      if (!breakdownMap[c]) {
        breakdownMap[c] = { chat: 0, converted: 0, loggedOut: 0, unreg: 0 };
      }
      const count = item._count.id;
      if (item.hasChatted) breakdownMap[c].chat += count;
      if (item.isConverted) breakdownMap[c].converted += count;
      if (item.isLoggedOut) breakdownMap[c].loggedOut += count;
      if (item.isUnregistered) breakdownMap[c].unreg += count;
    });

    const cityDataMap: Record<string, CityGeoData> = {};

    // First initialize all master cities so they always exist on the map
    Object.entries(INDIAN_CITIES_COORDS).forEach(([cityName, coords]) => {
      const counts = breakdownMap[cityName] || { chat: 0, converted: 0, loggedOut: 0, unreg: 0 };
      cityDataMap[cityName] = {
        city: cityName,
        state: coords.state,
        lat: coords.lat,
        lng: coords.lng,
        visitors: 0,
        chatLeads: counts.chat,
        convertedLeads: counts.converted,
        loggedOutVisitors: counts.loggedOut,
        unregisteredVisitors: counts.unreg,
      };
    });

    // Overwrite with real grouped DB counts
    groupedResults.forEach((group: any) => {
      const cityName = group.city;
      const stateName = group.state;
      const counts = breakdownMap[cityName] || { chat: 0, converted: 0, loggedOut: 0, unreg: 0 };
      const fallback = INDIAN_CITIES_COORDS[cityName] || { lat: 22.5937, lng: 78.9629 };

      cityDataMap[cityName] = {
        city: cityName,
        state: stateName,
        lat: group._avg.latitude || fallback.lat,
        lng: group._avg.longitude || fallback.lng,
        visitors: group._count.id,
        chatLeads: counts.chat,
        convertedLeads: counts.converted,
        loggedOutVisitors: counts.loggedOut,
        unregisteredVisitors: counts.unreg,
      };
    });

    const cityList = Object.values(cityDataMap);
    cityList.sort((a, b) => b.visitors - a.visitors);

    const totalVisitors = cityList.reduce((acc, c) => acc + c.visitors, 0);
    const totalChatLeads = cityList.reduce((acc, c) => acc + c.chatLeads, 0);
    const totalConverted = cityList.reduce((acc, c) => acc + c.convertedLeads, 0);

    return NextResponse.json({
      success: true,
      data: {
        filter,
        summary: {
          totalVisitors,
          totalChatLeads,
          totalConverted,
          totalCities: cityList.filter(c => c.visitors > 0).length,
          avgConversionRate: totalVisitors > 0 ? `${Math.round((totalConverted / totalVisitors) * 100)}%` : "0%"
        },
        cities: cityList,
      }
    });
  } catch (error) {
    console.error('[ADMIN_GEO_ANALYTICS_GET]', error);
    return NextResponse.json({ error: 'Failed to fetch geo analytics' }, { status: 500 });
  }
});
