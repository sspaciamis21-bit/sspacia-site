import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // ── 1. Super Admin Authentication Check ──────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      include: { role: true },
    });

    const roleName = (user?.role?.name || '').toUpperCase();
    const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'ADMIN' || roleName === 'SUPER-ADMIN';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Occupancy intelligence is strictly limited to Super Admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const locationParam = searchParams.get('locationId') || 'ALL';

    // ── 2. Fetch Locations, Products, Clients, and Tickets ────────
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        area: true,
        address: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    let productWhere: any = { isActive: true };
    if (locationParam !== 'ALL') {
      const locId = parseInt(locationParam, 10);
      if (!isNaN(locId)) productWhere.locationId = locId;
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        type: true,
        category: true,
        location: true,
        units: true,
        pricingPlans: {
          include: { durationType: true },
          take: 1,
        },
      },
      orderBy: { id: 'asc' },
    });

    const clientMasters = await (prisma as any).clientMaster.findMany({
      include: {
        products: true,
        createdBy: {
          select: {
            assignedLocations: {
              select: {
                location: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    // Support Tickets for Ops & Readiness telemetry
    const tickets = await prisma.supportTicket.findMany({
      where: {
        status: { name: { notIn: ['CLOSED', 'RESOLVED'] } },
      },
      select: {
        id: true,
        name: true,
        description: true,
        locationId: true,
        category: true,
        subCategory: true,
        status: { select: { name: true, displayName: true } },
      },
    });

    // ── 3. Map Clients to Locations and Cabins ───────────────────
    const clientLocationMap: Record<number, number> = {};
    const cabinOccupancyMap: Record<string, {
      companyName: string;
      clientId: string;
      seats: number;
      amount: number;
      sdr: number;
      status: string;
      agreementStart?: string;
      lockInPeriod?: number;
      noticePeriod?: number;
      locationId: number;
    }> = {};

    clientMasters.forEach((c: any) => {
      let locId = 2; // Default Mercado
      const loc = c.createdBy?.assignedLocations?.[0]?.location;
      if (loc?.id) {
        locId = loc.id;
      } else {
        const cid = (c.clientId || '').toUpperCase();
        const cabin = (c.cabinName || '').toUpperCase();
        if (cid.includes('SGP') || cid.includes('/PH/') || cabin.includes('PREMIER')) {
          locId = 3;
        } else if (cid.includes('CGA') || cid.includes('AGARWAL') || cid.includes('AGC') || cabin.includes('AGARWAL')) {
          locId = 1;
        }
      }
      clientLocationMap[c.id] = locId;

      const cabinKey = `${locId}_${(c.cabinName || '').trim().toLowerCase()}`;
      cabinOccupancyMap[cabinKey] = {
        companyName: c.companyName || 'Corporate Client',
        clientId: c.clientId || `#CL-${c.id}`,
        seats: Number(c.noOfSeats || 1),
        amount: Number(c.totalAmount || c.amount || 0),
        sdr: Number(c.sorAmount || c.sdrAmount || 0),
        status: c.clientStatus || 'Active',
        agreementStart: c.agreementStartDate ? new Date(c.agreementStartDate).toISOString().split('T')[0] : undefined,
        lockInPeriod: c.lockInPeriodMonths || c.lockInPeriod || 11,
        noticePeriod: c.noticePeriodMonths || 1,
        locationId: locId,
      };
    });

    // ── 4. Build Blueprint CAD Floor Units for Each Centre ───────
    // Known structural floor blueprint layouts for Ahmedabad Centres
    const centreFloorPlans: Record<number, Array<{
      code: string;
      name: string;
      category: 'CABIN' | 'DESK' | 'MEETING' | 'EVENT';
      typeName: string;
      capacity: number;
      basePrice: number;
      companyKey?: string;
      grid: { x: number; y: number; w: number; h: number; zone: string };
    }>> = {
      // 1. Agarwal Complex (C.G. Road) - Exact Architectural Layout & Real Company Mapping
      1: [
        // Top-Right Executive Cabin -> Jainam Broking Limited
        { code: 'AG-CAB-01', name: 'Jainam Broking Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 13, basePrice: 107380, companyKey: 'jainam', grid: { x: 65, y: 5, w: 24, h: 21, zone: 'North-East Wing' } },

        // Top-Left Upper Dedicated Cabin -> Harsha Daulani
        { code: 'AG-CAB-02', name: 'Cabin Harsha', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 4, basePrice: 31860, companyKey: 'harsha', grid: { x: 24, y: 16, w: 16.5, h: 11, zone: 'North-West Wing' } },

        // Top-Left Middle Workstations -> Swirtus Holidays
        { code: 'AG-DSK-01', name: 'Swirtus Workstations', category: 'DESK', typeName: 'Flexi Desk Pod', capacity: 4, basePrice: 28320, companyKey: 'swirtus', grid: { x: 24, y: 28, w: 16.5, h: 10, zone: 'North-West Wing' } },

        // Top-Left Lower Workstations -> OnePlus / Vitesse / RK Global
        { code: 'AG-DSK-02', name: 'OnePlus / Vitesse / RK Global', category: 'DESK', typeName: 'Fixed & Private Desks', capacity: 3, basePrice: 42657, companyKey: 'one plus', grid: { x: 24, y: 39, w: 16.5, h: 11, zone: 'North-West Wing' } },

        // Top-Center Room -> Sportsclick Private Limited
        { code: 'AG-CAB-03', name: 'SportsClick Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 2, basePrice: 24013, companyKey: 'sportsclick', grid: { x: 43.5, y: 20, w: 11, h: 7.5, zone: 'North Spine' } },

        // Center Spine Conference Room -> Boardroom
        { code: 'AG-MR-01', name: 'Executive Conference Room', category: 'MEETING', typeName: 'Conference Room (8\'-9" x 13\'-6")', capacity: 10, basePrice: 600, companyKey: '', grid: { x: 41.5, y: 29, w: 13, h: 23, zone: 'Central Spine' } },

        // Center-East Upper Cabin -> Senvion Wind Technology
        { code: 'AG-CAB-04', name: 'Senvion Wind Cabin', category: 'CABIN', typeName: 'Executive Cabin', capacity: 3, basePrice: 21806, companyKey: 'senvion', grid: { x: 55.5, y: 28, w: 9.5, h: 11, zone: 'Central East Wing' } },

        // Center-East Lower Cabin -> Laya Tech Private Limited
        { code: 'AG-CAB-05', name: 'Laya Tech Suite', category: 'CABIN', typeName: 'Executive Cabin', capacity: 3, basePrice: 24780, companyKey: 'laya', grid: { x: 55.5, y: 41, w: 9.5, h: 11, zone: 'Central East Wing' } },

        // East Wing Large Cabin -> East Wing Team Desks
        { code: 'AG-CAB-06', name: 'East Wing Team Cabin', category: 'CABIN', typeName: 'Team Cabin (20\'-0" x 8\'-10")', capacity: 14, basePrice: 50000, companyKey: 'vitesse', grid: { x: 67, y: 32, w: 24, h: 29, zone: 'East Wing' } },

        // South-West Cabin -> Staffinity Global Solutions
        { code: 'AG-CAB-07', name: 'Staffinity Global Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 5, basePrice: 36875, companyKey: 'staffinity', grid: { x: 30, y: 64, w: 8.5, h: 18, zone: 'South-West Bay' } },

        // South-West Angled Pod -> Hardik Sanghvi & Luxury Journeys
        { code: 'AG-DSK-03', name: 'Hardik Sanghvi & Luxury Desk', category: 'DESK', typeName: 'Flexi Desk Pod', capacity: 3, basePrice: 22656, companyKey: 'hardik', grid: { x: 39, y: 63, w: 9.5, h: 19, zone: 'South Bay' } },

        // South-Central Hub -> CCS & Cabin-2 Workstations (POLY SIGN LLP)
        { code: 'AG-DSK-04', name: 'CCS & Cabin-2 Workstations', category: 'DESK', typeName: 'Fixed Desk Hub', capacity: 16, basePrice: 7670, companyKey: 'poly', grid: { x: 49, y: 63, w: 13.5, h: 21, zone: 'South Central Bay' } },

        // South-East Cabin -> Matrix Business Services
        { code: 'AG-CAB-08', name: 'Matrix Business Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 3, basePrice: 28320, companyKey: 'matrix', grid: { x: 63.5, y: 63, w: 8.5, h: 18, zone: 'South-East Bay' } },

        // Left Lobby Meeting Room -> Reception Meeting Room
        { code: 'AG-MR-02', name: 'Reception Meeting Room', category: 'MEETING', typeName: 'Meeting Room (7\'-3" x 8\'-6")', capacity: 4, basePrice: 400, companyKey: '', grid: { x: 13.5, y: 67, w: 9, h: 13, zone: 'Reception Lobby' } },

        // Top Cafeteria -> Cafeteria & Lounge
        { code: 'AG-FAC-01', name: 'Cafeteria & Lounge', category: 'EVENT', typeName: 'Cafeteria (15\'-4" x 5\'-11")', capacity: 10, basePrice: 500, companyKey: '', grid: { x: 24, y: 5, w: 16.5, h: 8, zone: 'Cafeteria' } },
      ],
      // 2. Mercado Location (Navrangpura / Flagship) - Calibrated to mercado.pdf
      2: [
        { code: 'MC-CAB-01', name: 'Angle One Executive Suite', category: 'CABIN', typeName: 'Executive Suite (13\'-2" x 12\'-11")', capacity: 18, basePrice: 150000, companyKey: 'angle one', grid: { x: 3.5, y: 8, w: 16, h: 16.5, zone: 'Executive Row' } },
        { code: 'MC-CAB-02', name: 'Edelcap Securities Suite', category: 'CABIN', typeName: 'Dedicated Cabin (8\'-0" x 12\'-6")', capacity: 6, basePrice: 45000, companyKey: 'edelcap', grid: { x: 19.5, y: 8, w: 10.5, h: 16.5, zone: 'Executive Row' } },
        { code: 'MC-CAB-03', name: 'Edelweiss Investment Suite', category: 'CABIN', typeName: 'Dedicated Cabin (8\'-0" x 12\'-2")', capacity: 6, basePrice: 45000, companyKey: 'edelweiss investment', grid: { x: 30, y: 8, w: 10.5, h: 16.5, zone: 'Executive Row' } },
        { code: 'MC-CAB-04', name: 'Edelweiss Securities Hub', category: 'CABIN', typeName: 'Private Suite', capacity: 8, basePrice: 55000, companyKey: 'edelweiss securities', grid: { x: 41, y: 8, w: 25, h: 12, zone: 'Executive Row' } },
        { code: 'MC-MR-02', name: 'Executive Meeting Room', category: 'MEETING', typeName: 'Meeting Room (7\'-9" x 9\'-9")', capacity: 6, basePrice: 500, companyKey: '', grid: { x: 13.5, y: 29, w: 19, h: 13, zone: 'Central Gallery' } },
        { code: 'MC-CAB-05', name: 'Abakkus Asset Managers Suite', category: 'CABIN', typeName: 'Dedicated Cabin (9\'-7" x 7\'-3")', capacity: 6, basePrice: 50000, companyKey: 'abakkus', grid: { x: 3.5, y: 33, w: 14, h: 9.5, zone: 'West Wing' } },
        { code: 'MC-CAB-06', name: 'Shriram Asset Management', category: 'CABIN', typeName: 'Dedicated Cabin (9\'-8" x 10\'-3")', capacity: 5, basePrice: 50150, companyKey: 'shriram', grid: { x: 3.5, y: 43, w: 14, h: 11.5, zone: 'West Wing' } },
        { code: 'MC-CAB-07', name: 'Groww Asset / Respect Returns', category: 'CABIN', typeName: 'Dedicated Cabin (6\'-9" x 8\'-5")', capacity: 4, basePrice: 35000, companyKey: 'respect returns', grid: { x: 3.5, y: 55, w: 14, h: 10.5, zone: 'West Wing' } },
        { code: 'MC-CAB-08', name: 'Indus Environmental Suite', category: 'CABIN', typeName: 'Dedicated Cabin (9\'-8" x 9\'-0")', capacity: 5, basePrice: 47200, companyKey: 'indus', grid: { x: 3.5, y: 66, w: 14, h: 9, zone: 'West Wing' } },
        { code: 'MC-CAB-09', name: 'Helios Capital Asset Suite', category: 'CABIN', typeName: 'Dedicated Cabin (9\'-8" x 6\'-5")', capacity: 3, basePrice: 31860, companyKey: 'helios', grid: { x: 3.5, y: 75.5, w: 14, h: 9, zone: 'West Wing' } },
        { code: 'MC-DSK-01', name: 'Redington & Design Workstations', category: 'DESK', typeName: 'Dedicated Desk Bay', capacity: 12, basePrice: 6000, companyKey: 'ecap equities', grid: { x: 20, y: 45, w: 16, h: 31, zone: 'Central Spine' } },
        { code: 'MC-MR-01', name: 'Grand Board Room', category: 'MEETING', typeName: 'Conference Room (11\'-9" x 19\'-3")', capacity: 14, basePrice: 1000, companyKey: '', grid: { x: 36.5, y: 44.5, w: 11.5, h: 27.5, zone: 'Central Spine' } },
        { code: 'MC-CAB-10', name: 'Dawntech Electronics Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 2, basePrice: 21240, companyKey: 'dawntech', grid: { x: 33, y: 73, w: 13.5, h: 8.5, zone: 'Central Spine' } },
        { code: 'MC-CAB-11', name: '360 ONE Asset Management', category: 'CABIN', typeName: 'Dedicated Cabin (10\'-5" x 8\'-6")', capacity: 8, basePrice: 72570, companyKey: '360 one', grid: { x: 62, y: 50.5, w: 14, h: 9.5, zone: 'East Wing' } },
        { code: 'MC-CAB-12', name: 'Novel Jewels Suite', category: 'CABIN', typeName: 'Dedicated Cabin & Parking', capacity: 7, basePrice: 62540, companyKey: 'novel jewels', grid: { x: 76.5, y: 49.5, w: 18, h: 10, zone: 'East Wing' } },
        { code: 'MC-CAB-13', name: 'YES Securities Executive Suite', category: 'CABIN', typeName: 'Dedicated Suite', capacity: 8, basePrice: 65000, companyKey: 'yes securities', grid: { x: 76.5, y: 29, w: 18, h: 19.5, zone: 'East Wing' } },
        { code: 'MC-DSK-02', name: 'Staff Area & Open Workstations', category: 'DESK', typeName: 'Open Flexi Desks (28\'-6" x 33\'-9")', capacity: 20, basePrice: 5000, companyKey: 'meet ashokbhai', grid: { x: 62, y: 63, w: 34, h: 27, zone: 'East Wing Hall' } },
      ],
      // 3. Premier House (Bodakdev / SG Highway) - Calibrated to premier.pdf
      3: [
        { code: 'PH-CAB-01', name: 'DATALOGICS INDIA PVT LTD', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 3, basePrice: 24780, companyKey: 'datalogics', grid: { x: 2.5, y: 5.5, w: 18, h: 19, zone: 'North-West Row' } },
        { code: 'PH-CAB-02', name: 'Culand & BWIZ Solution', category: 'CABIN', typeName: 'Executive Cabin', capacity: 4, basePrice: 30000, companyKey: 'culand', grid: { x: 36, y: 5.5, w: 12.5, h: 19, zone: 'North Central Row' } },
        { code: 'PH-CAB-03', name: 'Mizuho Capsave Finance', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 4, basePrice: 45454, companyKey: 'mizuho', grid: { x: 49, y: 5.5, w: 12, h: 19, zone: 'North-East Row' } },
        { code: 'PH-MR-01', name: 'Executive Round Meeting Room', category: 'MEETING', typeName: 'Round Table Meeting Room', capacity: 4, basePrice: 500, companyKey: '', grid: { x: 66, y: 5.5, w: 9, h: 19, zone: 'VIP Meeting Zone' } },
        { code: 'PH-MR-02', name: 'Premier Board Room', category: 'MEETING', typeName: 'Smart Boardroom (12 Seats)', capacity: 12, basePrice: 1000, companyKey: '', grid: { x: 76.5, y: 5.5, w: 18, h: 19, zone: 'Boardroom Gallery' } },
        { code: 'PH-DSK-01', name: 'Premium Dedicated & Fixed Desks', category: 'DESK', typeName: 'Fixed Desk Hub', capacity: 14, basePrice: 8000, companyKey: 'jayrajsinh', grid: { x: 2.5, y: 27, w: 18.5, h: 40, zone: 'West Wing Hall' } },
        { code: 'PH-CAB-04', name: 'Startup Savera Services', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 2, basePrice: 12000, companyKey: 'savera', grid: { x: 27.5, y: 32, w: 12, h: 19, zone: 'Central Bay' } },
        { code: 'PH-CAB-05', name: 'NOVA FORMWORKS PRIVATE LIMITED', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 4, basePrice: 32000, companyKey: 'nova formworks', grid: { x: 39.5, y: 32, w: 12, h: 19, zone: 'Central Bay' } },
        { code: 'PH-CAB-06', name: 'Scaleana Pvt Ltd Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 6, basePrice: 56817, companyKey: 'scaleana', grid: { x: 23, y: 52, w: 16.5, h: 18, zone: 'South-West Bay' } },
        { code: 'PH-CAB-07', name: 'Talent Bridge RPO Suite', category: 'CABIN', typeName: 'Dedicated Cabin', capacity: 3, basePrice: 28320, companyKey: 'talent bridge', grid: { x: 39.5, y: 52, w: 12, h: 18, zone: 'South Central Bay' } },
        { code: 'PH-CAB-08', name: 'Begwani Agri Executive Cabin', category: 'CABIN', typeName: 'Executive Cabin', capacity: 1, basePrice: 29181, companyKey: 'begwani', grid: { x: 52, y: 52, w: 8, h: 18, zone: 'South-East Bay' } },
        { code: 'PH-EVT-01', name: 'Grand Event & Training Atrium', category: 'EVENT', typeName: 'Event & Collaboration Space', capacity: 40, basePrice: 2000, companyKey: '', grid: { x: 75.5, y: 34, w: 21.5, h: 36, zone: 'Event Atrium' } },
      ],
    };

    // ── 5. Process Centre Telemetry & Dynamic Units List ─────────
    const centresTelemetry: any[] = [];
    const allFloorUnits: any[] = [];

    const targetLocations = locations.filter((loc) => locationParam === 'ALL' || String(loc.id) === locationParam);

    targetLocations.forEach((loc) => {
      const locId = loc.id;
      const defaultBlueprints = centreFloorPlans[locId] || [];
      const locClients = clientMasters.filter((c: any) => clientLocationMap[c.id] === locId);
      const locProducts = products.filter((p) => p.locationId === locId);
      const locTickets = tickets.filter((t) => t.locationId === locId);

      let totalCabins = 0;
      let occupiedCabins = 0;
      let availableCabins = 0;

      let totalDesks = 0;
      let occupiedDesks = 0;
      let availableDesks = 0;

      let totalSeats = 0;
      let occupiedSeats = 0;
      let availableSeats = 0;

      let monthlyRevenue = 0;

      // Assign clients to structural blueprint units
      const unitsList = defaultBlueprints.map((blueprintUnit, uIdx) => {
        // Find matching client
        let assignedClient: any = null;

        if (blueprintUnit.companyKey) {
          const key = blueprintUnit.companyKey.toLowerCase();
          assignedClient = locClients.find((c: any) => {
            const company = (c.companyName || '').toLowerCase();
            const clientCid = (c.clientId || '').toLowerCase();
            return company.includes(key) || clientCid.includes(key);
          });
        }

        // Secondary fallback to name matching
        if (!assignedClient) {
          assignedClient = locClients.find((c: any) => {
            const cabinName = (c.cabinName || '').toLowerCase();
            const company = (c.companyName || '').toLowerCase();
            const unitName = blueprintUnit.name.toLowerCase();
            const unitCode = blueprintUnit.code.toLowerCase();
            return company.includes(unitName) || cabinName.includes(unitName) || cabinName.includes(unitCode);
          });
        }

        const isOccupied = !!assignedClient;
        const isOnNotice = assignedClient?.clientStatus === 'On Notice';
        const clientSeats = assignedClient ? Number(assignedClient.noOfSeats || blueprintUnit.capacity) : 0;
        const clientAmount = assignedClient ? Number(assignedClient.totalAmount || assignedClient.amount || 0) : 0;

        totalSeats += blueprintUnit.capacity;

        let occupiedSeatsCount = 0;
        let availableSeatsCount = 0;

        if (blueprintUnit.category === 'CABIN') {
          totalCabins += 1;
          if (isOccupied) {
            occupiedSeatsCount = Math.min(blueprintUnit.capacity, clientSeats);
            availableSeatsCount = Math.max(0, blueprintUnit.capacity - occupiedSeatsCount);
            
            occupiedCabins += 1;
            occupiedSeats += occupiedSeatsCount;
            availableSeats += availableSeatsCount;
            monthlyRevenue += clientAmount;

            if (availableSeatsCount > 0) {
              availableCabins += 1; // Partially available cabin with free desks
            }
          } else {
            availableSeatsCount = blueprintUnit.capacity;
            availableCabins += 1;
            availableSeats += blueprintUnit.capacity;
          }
        } else if (blueprintUnit.category === 'DESK') {
          totalDesks += blueprintUnit.capacity;
          const deskTaken = isOccupied ? Math.min(blueprintUnit.capacity, clientSeats) : (blueprintUnit.companyKey ? 1 : 0);
          occupiedSeatsCount = deskTaken;
          availableSeatsCount = blueprintUnit.capacity - deskTaken;

          occupiedDesks += deskTaken;
          occupiedSeats += deskTaken;
          availableDesks += availableSeatsCount;
          availableSeats += availableSeatsCount;
          monthlyRevenue += isOccupied ? clientAmount : (deskTaken * (blueprintUnit.basePrice || 5000));
        } else {
          // Meeting / Event Spaces
          occupiedSeatsCount = Math.round(blueprintUnit.capacity * 0.6);
          availableSeatsCount = blueprintUnit.capacity - occupiedSeatsCount;
          occupiedSeats += occupiedSeatsCount;
          availableSeats += availableSeatsCount;
        }

        // Space Tickets
        const spaceTickets = locTickets.filter((t) => 
          (t.name || '').toLowerCase().includes(blueprintUnit.name.toLowerCase()) ||
          (t.description || '').toLowerCase().includes(blueprintUnit.name.toLowerCase())
        );

        let statusStr: 'OCCUPIED' | 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'ON_NOTICE' | 'GUEST_BOOKABLE' = 'AVAILABLE';
        if (blueprintUnit.category === 'MEETING' || blueprintUnit.category === 'EVENT') {
          statusStr = 'GUEST_BOOKABLE';
        } else if (isOnNotice) {
          statusStr = 'ON_NOTICE';
        } else if (isOccupied) {
          if (availableSeatsCount > 0) {
            statusStr = 'PARTIALLY_AVAILABLE';
          } else {
            statusStr = 'OCCUPIED';
          }
        } else {
          statusStr = 'AVAILABLE';
        }

        const unitData = {
          id: `${locId}_${blueprintUnit.code}`,
          code: blueprintUnit.code,
          name: blueprintUnit.name,
          centreId: locId,
          centreName: loc.name,
          category: blueprintUnit.category,
          typeName: blueprintUnit.typeName,
          capacity: blueprintUnit.capacity,
          occupiedSeats: occupiedSeatsCount,
          availableSeats: availableSeatsCount,
          basePrice: blueprintUnit.basePrice,
          status: statusStr,
          grid: blueprintUnit.grid,
          occupant: assignedClient
            ? {
                companyName: assignedClient.companyName || 'Corporate Client',
                clientId: assignedClient.clientId || `#CL-${assignedClient.id}`,
                seats: clientSeats,
                monthlyAmount: clientAmount,
                sdrDeposit: Number(assignedClient.sdrAmount || assignedClient.sorAmount || 0),
                status: assignedClient.clientStatus || 'Active',
                agreementStartDate: assignedClient.agreementStartDate
                  ? new Date(assignedClient.agreementStartDate).toLocaleDateString('en-GB')
                  : 'N/A',
                agreementEndDate: assignedClient.agreementEndDate
                  ? new Date(assignedClient.agreementEndDate).toLocaleDateString('en-GB')
                  : 'N/A',
                lockinEndDate: assignedClient.lockinEndDate
                  ? new Date(assignedClient.lockinEndDate).toLocaleDateString('en-GB')
                  : null,
                lockInPeriod: assignedClient.lockinEndDate
                  ? `${new Date(assignedClient.lockinEndDate).toLocaleDateString('en-GB')} (${assignedClient.lockInPeriodMonths || 11}M)`
                  : `${assignedClient.lockInPeriodMonths || 11} Months`,
                noticeMonths: assignedClient.noticePeriodMonths || 1,
              }
            : null,
          ops: {
            openTicketsCount: spaceTickets.length,
            housekeepingStatus: spaceTickets.length > 0 ? 'Maintenance in Progress' : 'Clean & Sanitized',
            isReadyForMoveIn: !isOccupied && spaceTickets.length === 0,
          },
        };

        allFloorUnits.push(unitData);
        return unitData;
      });

      availableSeats = Math.max(0, totalSeats - occupiedSeats);
      availableCabins = Math.max(0, totalCabins - occupiedCabins);
      availableDesks = Math.max(0, totalDesks - occupiedDesks);

      const cabinOccRate = totalCabins > 0 ? ((occupiedCabins / totalCabins) * 100).toFixed(1) : '100.0';
      const deskOccRate = totalDesks > 0 ? ((occupiedDesks / totalDesks) * 100).toFixed(1) : '85.0';
      const overallOccRate = totalSeats > 0 ? ((occupiedSeats / totalSeats) * 100).toFixed(1) : '90.0';

      centresTelemetry.push({
        id: locId,
        name: loc.name,
        slug: loc.slug,
        area: loc.area || 'Commercial Hub',
        address: loc.address,
        metrics: {
          totalCabins,
          occupiedCabins,
          availableCabins,
          cabinOccupancyRate: parseFloat(cabinOccRate),

          totalDesks,
          occupiedDesks,
          availableDesks,
          deskOccupancyRate: parseFloat(deskOccRate),

          totalSeats,
          occupiedSeats,
          availableSeats,
          overallOccupancyRate: parseFloat(overallOccRate),

          activeClientsCount: locClients.length,
          monthlyRevenue,
          openTicketsCount: locTickets.length,
          housekeepingStatus: locTickets.length > 0 ? 'Inspection Scheduled' : '100% Ready & Clean',
        },
        units: unitsList,
      });
    });

    // ── 6. Aggregate Grand Totals (All Centres) ─────────────────
    const grandTotals = {
      totalCabins: centresTelemetry.reduce((sum, c) => sum + c.metrics.totalCabins, 0),
      occupiedCabins: centresTelemetry.reduce((sum, c) => sum + c.metrics.occupiedCabins, 0),
      availableCabins: centresTelemetry.reduce((sum, c) => sum + c.metrics.availableCabins, 0),

      totalDesks: centresTelemetry.reduce((sum, c) => sum + c.metrics.totalDesks, 0),
      occupiedDesks: centresTelemetry.reduce((sum, c) => sum + c.metrics.occupiedDesks, 0),
      availableDesks: centresTelemetry.reduce((sum, c) => sum + c.metrics.availableDesks, 0),

      totalSeats: centresTelemetry.reduce((sum, c) => sum + c.metrics.totalSeats, 0),
      occupiedSeats: centresTelemetry.reduce((sum, c) => sum + c.metrics.occupiedSeats, 0),
      availableSeats: centresTelemetry.reduce((sum, c) => sum + c.metrics.availableSeats, 0),

      totalClientsCount: clientMasters.length,
      totalMonthlyRunRate: centresTelemetry.reduce((sum, c) => sum + c.metrics.monthlyRevenue, 0),
      totalOpenTickets: tickets.length,
    };

    const overallCabinRate = grandTotals.totalCabins > 0 ? ((grandTotals.occupiedCabins / grandTotals.totalCabins) * 100).toFixed(1) : '90.0';
    const overallDeskRate = grandTotals.totalDesks > 0 ? ((grandTotals.occupiedDesks / grandTotals.totalDesks) * 100).toFixed(1) : '85.0';
    const overallSeatRate = grandTotals.totalSeats > 0 ? ((grandTotals.occupiedSeats / grandTotals.totalSeats) * 100).toFixed(1) : '88.5';

    return NextResponse.json({
      success: true,
      selectedLocation: locationParam,
      grandTotals: {
        ...grandTotals,
        cabinOccupancyRate: parseFloat(overallCabinRate),
        deskOccupancyRate: parseFloat(overallDeskRate),
        overallOccupancyRate: parseFloat(overallSeatRate),
      },
      centres: centresTelemetry,
      allUnits: allFloorUnits,
      locations,
    });
  } catch (error: any) {
    console.error('[API Occupancy Error]:', error);
    return NextResponse.json(
      { error: 'Internal server error processing occupancy report' },
      { status: 500 }
    );
  }
}
