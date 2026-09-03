import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: {
        city: true,
        products: {
          where: { isActive: true },
          include: {
            category: true,
            type: true,
            amenities: {
              include: { amenity: true },
              orderBy: { amenity: { sortOrder: 'asc' } },
            },
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const formatProduct = (p: any, loc: any) => {
      const primaryImg = p.images?.[0]?.url || '/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg';
      const amenityNames = p.amenities?.map((a: any) => a.amenity?.name).filter(Boolean) || [];
      const facilitiesText = amenityNames.length > 0 
        ? amenityNames.join(', ') 
        : (p.description || 'High-Speed WiFi, 24/7 Access, Air Conditioning, Gourmet Brews');

      const isGuest = p.category?.name === 'GUEST_SPACE' || 
        ['MEETING_ROOM', 'BOARD_ROOM', 'EVENT_ROOM', 'TRAINING_ROOM'].includes(p.type?.name);

      let badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
      if (isGuest) {
        if (p.capacity >= 12) badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
        else if (p.capacity >= 6) badgeColor = 'bg-cyan-50 text-cyan-800 border-cyan-200';
      } else {
        if (p.capacity >= 10) badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
        else if (p.capacity >= 4) badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        else badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        badge: `${p.capacity || 1} Seater`,
        badgeColor,
        centreName: loc.name,
        image: primaryImg,
        facilities: facilitiesText,
        description: facilitiesText,
        href: `/products?centre=${loc.id}&type=${p.type?.slug || p.slug}`,
      };
    };

    // 1. Structure for Products Dropdown
    const centresData = locations.map((loc) => {
      const guestProds = loc.products
        .filter((p) => p.category?.name === 'GUEST_SPACE' || ['MEETING_ROOM', 'BOARD_ROOM', 'EVENT_ROOM'].includes(p.type?.name))
        .map((p) => formatProduct(p, loc));

      const coworkingProds = loc.products
        .filter((p) => p.category?.name !== 'GUEST_SPACE' && !['MEETING_ROOM', 'BOARD_ROOM', 'EVENT_ROOM'].includes(p.type?.name))
        .map((p) => formatProduct(p, loc));

      return {
        id: loc.slug || String(loc.id),
        locationId: loc.id,
        name: loc.name,
        shortName: loc.area || loc.name,
        guestProducts: guestProds,
        coworkingProducts: coworkingProds,
      };
    });

    const allGuest = centresData.flatMap((c) => c.guestProducts);
    const allCoworking = centresData.flatMap((c) => c.coworkingProducts);

    const productsDropdownData = [
      {
        id: 'all',
        name: 'All Centres',
        shortName: 'Across Ahmedabad',
        guestProducts: allGuest,
        coworkingProducts: allCoworking,
      },
      ...centresData,
    ];

    // 2. Structure for Locations Dropdown (Grouped by Area)
    const areasMap = new Map<string, any>();

    for (const loc of locations) {
      const areaKey = (loc.area || 'Ahmedabad Prime').trim();
      const areaId = areaKey.toLowerCase().replace(/[^a-z0-9]/g, '-');

      if (!areasMap.has(areaId)) {
        areasMap.set(areaId, {
          id: areaId,
          name: areaKey,
          tagline: `${areaKey} Corporate Hub`,
          centres: [],
        });
      }

      const guestProds = loc.products
        .filter((p) => p.category?.name === 'GUEST_SPACE' || ['MEETING_ROOM', 'BOARD_ROOM', 'EVENT_ROOM'].includes(p.type?.name))
        .map((p) => formatProduct(p, loc));

      const coworkingProds = loc.products
        .filter((p) => p.category?.name !== 'GUEST_SPACE' && !['MEETING_ROOM', 'BOARD_ROOM', 'EVENT_ROOM'].includes(p.type?.name))
        .map((p) => formatProduct(p, loc));

      areasMap.get(areaId).centres.push({
        id: loc.slug || String(loc.id),
        locationId: loc.id,
        name: loc.name,
        shortName: loc.area || loc.name,
        address: loc.address || `${loc.name}, Ahmedabad`,
        href: `/products?centre=${loc.id}`,
        guestSpaces: {
          title: 'Guest Spaces',
          type: 'guest',
          badge: 'Hourly / Daily',
          href: `/guest-spaces?centre=${loc.id}`,
          products: guestProds,
        },
        coworkingSpaces: {
          title: 'Co-working Spaces',
          type: 'coworking',
          badge: 'Monthly / Dedicated',
          href: `/coworking-spaces?centre=${loc.id}`,
          products: coworkingProds,
        },
      });
    }

    const locationsDropdownData = Array.from(areasMap.values());

    return NextResponse.json({
      success: true,
      productsDropdownData,
      locationsDropdownData,
    });
  } catch (error: any) {
    console.error('Error fetching live nav catalog:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
