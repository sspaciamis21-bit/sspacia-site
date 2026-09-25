export interface CentreData {
  id: string;
  name: string;
  area: string;
  address: string;
  landmark: string;
  image: string;
  gallery?: string[];
  mapEmbedUrl: string;
  googleMapsUrl: string;
  tagline: string;
  pincode: string;
}

export const CENTRES: CentreData[] = [
  {
    id: "agarwal-complex",
    name: "Agarwal Complex",
    area: "CG Road",
    address: "Agarwal Complex, Chimanlal Girdharlal Rd, Navrangpura, Ahmedabad, Gujarat 380009",
    landmark: "Near Municipal Market / Parimal Garden, C.G. Road",
    image: "/Pictures/Reception.jpeg",
    gallery: [
      "/Pictures/Reception.jpeg",
      "/Pictures/MeetingRoom1.jpeg",
      "/Pictures/DSC04771.jpg"
    ],
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85aa2ca9060b%3A0x5c9ab865d47d0323!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468609195!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/nv4fsViv3n5JnZKP6",
    tagline: "Prime Corporate Hub on C.G. Road",
    pincode: "380009",
  },
  {
    id: "mercardo",
    name: "Mercado",
    area: "CG Road",
    address: "6th Floor, Mercado, Chimanlal Girdharlal Rd, opp. Municipal Market, Vasant Vihar, Ellisbridge, Ahmedabad, Gujarat 380009",
    landmark: "Opposite Municipal Market, C.G. Road, Ellisbridge",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
    gallery: [
      "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
      "/IMAGES_SSPACIA/MERCADO IMAGES/Conference.jpg",
      "/IMAGES_SSPACIA/MERCADO IMAGES/Cabin 1.jpg"
    ],
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85f077353eab%3A0x1ead32a902ba4157!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468526608!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/hvfuXehGcpgP1FfBA",
    tagline: "High-Street Prestige Opposite Municipal Market",
    pincode: "380009",
  },
  {
    id: "premier-house",
    name: "Premier House",
    area: "SG Highway",
    address: "Premier House, Opp. Gurudwara, SG Highway, Ahmedabad, Gujarat 380054",
    landmark: "Opposite Gurudwara, S.G. Highway Corporate Corridor",
    image: "/PH_images/ESL04996.JPG",
    gallery: [
      "/PH_images/ESL04996.JPG",
      "/PH_images/ESL05022.JPG",
      "/PH_images/ESL05041.JPG"
    ],
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14685.718214362558!2d72.49659418715818!3d23.0447083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e9b6f44c62bdf%3A0x767273454104ee1e!2sSSPACIA%20-%20Coworking%20Space%20in%20Ahmedabad!5e0!3m2!1sen!2sin!4v1773468658065!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/ZJ948unE5tiks47RA",
    tagline: "Premier Highway Presence & Enterprise Address",
    pincode: "380054",
  },
];

export function getCentreById(id: string): CentreData | undefined {
  if (id === "mercado") return CENTRES.find((c) => c.id === "mercardo");
  return CENTRES.find((c) => c.id === id);
}
