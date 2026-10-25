/**
 * Canonical centre, room and workspace data for SSPACIA.
 *
 * One source of truth for name / address / phone / geo (NAP) that every page,
 * JSON-LD block, sitemap entry and the llms.txt file reads from, so that search
 * engines and AI assistants always see the same facts.
 *
 * Addresses and coordinates were verified against Google Maps on 25 Oct 2026.
 * Room prices are the live hourly rates shown on /guest-spaces.
 */

export type RoomKind = "meeting-room" | "board-room" | "event-room";
export type WorkspaceKind =
  | "flexi-desk"
  | "fixed-desk"
  | "dedicated-cabin"
  | "private-cabin"
  | "executive-cabin";

export interface Room {
  /** Product id in the SSPACIA platform; booking page is /products/<id>. */
  id: number;
  kind: RoomKind;
  name: string;
  capacity: number;
  /** Hourly rate in INR, exclusive of GST. */
  pricePerHour: number;
  image: string;
  highlights: string[];
}

export interface Workspace {
  id: number;
  kind: WorkspaceKind;
  name: string;
  capacity: number;
  image: string;
  highlights: string[];
}

export interface Centre {
  /** URL slug: /locations/<slug> */
  slug: string;
  /** Location id in the SSPACIA platform (products?centre=<id>). */
  locationId: number;
  name: string;
  area: "CG Road" | "SG Highway";
  locality: string;
  streetAddress: string;
  landmark: string;
  postalCode: string;
  geo: { latitude: number; longitude: number };
  googleMapsUrl: string;
  /** Google Maps embed (place-pinned) for the centre page. */
  mapEmbedUrl: string;
  /** Google Business Profile place id, when a verified profile exists. */
  googlePlaceId?: string;
  image: string;
  tagline: string;
  rooms: Room[];
  workspaces: Workspace[];
}

export const BUSINESS = {
  name: "SSPACIA",
  brand: "SSPACIA Coworking",
  phoneDisplay: "+91 76003 93779",
  phoneE164: "+917600393779",
  whatsapp: "https://wa.me/917600393779",
  email: "sales@sspacia.com",
  city: "Ahmedabad",
  region: "Gujarat",
  country: "IN",
  /** Member access is round the clock at every centre. */
  openingHours: "Mo-Su 00:00-23:59",
  /** Rooms are bookable online in hourly slots within this window. */
  roomSlotWindow: "8:00 am – 8:00 pm",
  dayPassPrice: 500,
  weeklyPassPrice: 4000,
  virtualOfficeYearly: 24000,
  social: {
    facebook: "https://www.facebook.com/share/1ESQc7o11n/",
    instagram: "https://www.instagram.com/sspacia",
    linkedin: "https://www.linkedin.com/company/sspacia/",
    youtube: "https://www.youtube.com/@sspacia_",
  },
} as const;

const CLOUD = "https://res.cloudinary.com/dmgwi8dqd/image/upload";

export const CENTRES: Centre[] = [
  {
    slug: "agarwal-complex",
    locationId: 1,
    name: "Agarwal Complex",
    area: "CG Road",
    locality: "Navrangpura",
    streetAddress: "Agarwal Complex, C.G. Road (Chimanlal Girdharlal Road), Navrangpura",
    landmark: "Near Parimal Garden and Municipal Market, C.G. Road",
    postalCode: "380009",
    geo: { latitude: 23.0350239, longitude: 72.5609197 },
    googleMapsUrl: "https://maps.app.goo.gl/nv4fsViv3n5JnZKP6",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85aa2ca9060b%3A0x5c9ab865d47d0323!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468609195!5m2!1sen!2sin",
    image: "/Pictures/Reception.jpeg",
    tagline: "Central C.G. Road hub for consultants, CA firms and small teams",
    rooms: [
      {
        id: 16,
        kind: "meeting-room",
        name: "Meeting Room",
        capacity: 5,
        pricePerHour: 400,
        image: `${CLOUD}/v1787635417/sspacia/zn8uhmxi970pwbicxfvo.jpg`,
        highlights: ["Display screen", "Whiteboard", "High-speed Wi-Fi", "Air-conditioned"],
      },
      {
        id: 17,
        kind: "board-room",
        name: "Board Room",
        capacity: 11,
        pricePerHour: 600,
        image: `${CLOUD}/v1787635368/sspacia/wmgzactuei1zw9bybxjd.jpg`,
        highlights: ["HD video conferencing", "Audio system", "Executive seating", "Tea and coffee service"],
      },
    ],
    workspaces: [
      { id: 1, kind: "flexi-desk", name: "Flexi Desk", capacity: 1, image: `${CLOUD}/v1787635869/sspacia/kobfavhkbawfimpzqszt.jpg`, highlights: ["Any open desk", "24/7 access", "Unlimited tea and coffee"] },
      { id: 2, kind: "fixed-desk", name: "Fixed Desk", capacity: 1, image: `${CLOUD}/v1787635812/sspacia/rf39f2avjwoziofpmkj8.jpg`, highlights: ["Reserved workstation", "Lockable storage", "24/7 access"] },
      { id: 3, kind: "dedicated-cabin", name: "Dedicated Cabin", capacity: 4, image: `${CLOUD}/v1787635561/sspacia/s2auntn8fgam4zcothjl.jpg`, highlights: ["Private glass cabin", "Dedicated access", "Meeting-room credits"] },
      { id: 4, kind: "private-cabin", name: "Private Cabin", capacity: 8, image: `${CLOUD}/v1787635518/sspacia/cbquo8pwvgtliddvp7hu.jpg`, highlights: ["Acoustic glass enclosure", "Key-lockable", "Meeting-room credits"] },
      { id: 5, kind: "executive-cabin", name: "Executive Cabin", capacity: 10, image: `${CLOUD}/v1787635472/sspacia/pisc6f6onwuhxyiutyoh.jpg`, highlights: ["Executive team suite", "Premium ergonomics", "Meeting-room credits"] },
    ],
  },
  {
    slug: "mercado",
    locationId: 2,
    name: "Mercado",
    area: "CG Road",
    locality: "Ellisbridge",
    streetAddress: "6th Floor, Mercado, C.G. Road, opposite Municipal Market, Vasant Vihar, Ellisbridge",
    landmark: "Opposite Municipal Market, C.G. Road",
    postalCode: "380009",
    geo: { latitude: 23.0349279, longitude: 72.5603554 },
    googleMapsUrl: "https://maps.app.goo.gl/hvfuXehGcpgP1FfBA",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85f077353eab%3A0x1ead32a902ba4157!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468526608!5m2!1sen!2sin",
    googlePlaceId: "ChIJqz41d_CFXjkRV0G6AqkyrR4",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
    tagline: "High-street address on C.G. Road with the largest board room",
    rooms: [
      {
        id: 19,
        kind: "meeting-room",
        name: "Meeting Room",
        capacity: 6,
        pricePerHour: 500,
        image: `${CLOUD}/v1787634689/sspacia/spxy536xlynfktvqopwt.jpg`,
        highlights: ["Display screen", "High-speed Wi-Fi", "Air-conditioned", "Front-desk support"],
      },
      {
        id: 20,
        kind: "board-room",
        name: "Board Room",
        capacity: 14,
        pricePerHour: 1000,
        image: `${CLOUD}/v1787634504/sspacia/folrtl4pgrpfxaxd6afc.jpg`,
        highlights: ["Executive boardroom table", "Video conferencing", "Audio system", "Tea and coffee service"],
      },
    ],
    workspaces: [
      { id: 6, kind: "flexi-desk", name: "Flexi Desk", capacity: 1, image: `${CLOUD}/v1787634847/sspacia/leelnmezm7hzdtqzqywf.jpg`, highlights: ["Any open desk", "24/7 access", "Unlimited tea and coffee"] },
      { id: 7, kind: "fixed-desk", name: "Fixed Desk", capacity: 1, image: `${CLOUD}/v1787635130/sspacia/wgxtq7cliwyspnvkrsfi.jpg`, highlights: ["Reserved workstation", "24/7 access", "Unlimited tea and coffee"] },
      { id: 8, kind: "dedicated-cabin", name: "Dedicated Cabin", capacity: 6, image: `${CLOUD}/v1787634750/sspacia/xjqmrfsn69ithe7tc0id.jpg`, highlights: ["Furnished team cabin", "24/7 access", "Meeting-room credits"] },
      { id: 9, kind: "private-cabin", name: "Private Cabin", capacity: 8, image: `${CLOUD}/v1787634897/sspacia/j8jisbg2vbs3s3gs71r4.jpg`, highlights: ["Private glass suite", "24/7 access", "Meeting-room credits"] },
      { id: 10, kind: "executive-cabin", name: "Executive Cabin", capacity: 12, image: `${CLOUD}/v1787635070/sspacia/qnraod6yuhuyitpfzzvo.jpg`, highlights: ["Director-style cabin", "24/7 access", "Meeting-room credits"] },
    ],
  },
  {
    slug: "premier-house",
    locationId: 3,
    name: "Premier House",
    area: "SG Highway",
    locality: "Bodakdev",
    streetAddress: "6th Floor, Premier House, 1, Sarkhej–Gandhinagar Highway, opposite Gurudwara, Bodakdev",
    landmark: "Opposite Gurudwara, S.G. Highway corporate corridor",
    postalCode: "380054",
    geo: { latitude: 23.0447083, longitude: 72.5156486 },
    googleMapsUrl: "https://maps.app.goo.gl/ZJ948unE5tiks47RA",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14685.718214362558!2d72.49659418715818!3d23.0447083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e9b6f44c62bdf%3A0x767273454104ee1e!2sSSPACIA%20-%20Coworking%20Space%20in%20Ahmedabad!5e0!3m2!1sen!2sin!4v1773468658065!5m2!1sen!2sin",
    googlePlaceId: "ChIJ3yvGRG-bXjkRHu4EQUVzcnY",
    image: "/PH_images/ESL04996.JPG",
    tagline: "Corporate S.G. Highway address with the 40-seat event room",
    rooms: [
      {
        id: 22,
        kind: "meeting-room",
        name: "Meeting Room",
        capacity: 4,
        pricePerHour: 500,
        image: `${CLOUD}/v1787637449/sspacia/zyqeedod9lxhnzixspdf.jpg`,
        highlights: ["Display screen", "High-speed Wi-Fi", "Air-conditioned", "Front-desk support"],
      },
      {
        id: 23,
        kind: "board-room",
        name: "Board Room",
        capacity: 12,
        pricePerHour: 1000,
        image: `${CLOUD}/v1787637125/sspacia/vjk4ttvafaojoy3c11ag.jpg`,
        highlights: ["Executive boardroom setup", "Video conferencing", "Audio system", "Tea and coffee service"],
      },
      {
        id: 24,
        kind: "event-room",
        name: "Event Room",
        capacity: 40,
        pricePerHour: 2000,
        image: `${CLOUD}/v1787637220/sspacia/ombcwnvxurdyiwc2atud.jpg`,
        highlights: ["Large-format hall for 40", "Presentation screen and projector-ready setup", "PA audio system", "Theatre, classroom or U-shape layouts"],
      },
    ],
    workspaces: [
      { id: 11, kind: "flexi-desk", name: "Flexi Desk", capacity: 1, image: `${CLOUD}/v1787637560/sspacia/owf8hte4jizxrazo22sk.jpg`, highlights: ["Any open desk", "24/7 access", "Unlimited tea and coffee"] },
      { id: 12, kind: "fixed-desk", name: "Fixed Desk", capacity: 1, image: `${CLOUD}/v1787723141/sspacia/euunzkotguczezkmo9yl.jpg`, highlights: ["Dedicated workstation", "24/7 access", "Unlimited tea and coffee"] },
      { id: 13, kind: "dedicated-cabin", name: "Dedicated Cabin", capacity: 4, image: `${CLOUD}/v1787637494/sspacia/u9b5c1xebx39uoynlnqd.jpg`, highlights: ["Private glass cabin", "24/7 access", "Meeting-room credits"] },
      { id: 14, kind: "private-cabin", name: "Private Cabin", capacity: 8, image: `${CLOUD}/v1787723034/sspacia/hsou3eratsy8zieiyscr.jpg`, highlights: ["Team glass suite", "24/7 access", "Meeting-room credits"] },
      { id: 15, kind: "executive-cabin", name: "Executive Cabin", capacity: 10, image: `${CLOUD}/v1787722962/sspacia/ip38muckfafkwnihjia6.jpg`, highlights: ["Executive team wing", "24/7 access", "Meeting-room credits"] },
    ],
  },
];

/** Accepts the current slug and the legacy "mercardo" spelling. */
export function getCentre(slug: string): Centre | undefined {
  const normalised = slug === "mercardo" ? "mercado" : slug;
  return CENTRES.find((c) => c.slug === normalised);
}

export function fullAddress(c: Centre): string {
  return `${c.streetAddress}, ${BUSINESS.city}, ${BUSINESS.region} ${c.postalCode}`;
}

export function roomsOfKind(kind: RoomKind): { centre: Centre; room: Room }[] {
  return CENTRES.flatMap((centre) =>
    centre.rooms.filter((r) => r.kind === kind).map((room) => ({ centre, room })),
  );
}

export function cabins(): { centre: Centre; workspace: Workspace }[] {
  return CENTRES.flatMap((centre) =>
    centre.workspaces
      .filter((w) => w.kind.endsWith("cabin"))
      .map((workspace) => ({ centre, workspace })),
  );
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
