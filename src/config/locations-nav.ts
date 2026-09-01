export interface ProductItem {
  name: string;
  badge?: string;
  href: string;
  image: string;
  description?: string;
}

export interface SpaceCategory {
  title: string;
  type: "guest" | "coworking";
  badge: string;
  href: string;
  products: ProductItem[];
}

export interface CenterInfo {
  id: string;
  name: string;
  shortName: string;
  address: string;
  href: string;
  guestSpaces: SpaceCategory;
  coworkingSpaces: SpaceCategory;
}

export interface LocationArea {
  id: string;
  name: string;
  tagline: string;
  centres: CenterInfo[];
}

export const locationsNavData: LocationArea[] = [
  {
    id: "cg-road",
    name: "CG Road",
    tagline: "Commercial Hub of Ahmedabad",
    centres: [
      {
        id: "agarwal-complex",
        name: "Agarwal Complex",
        shortName: "CG Road, Navrangpura",
        address: "C.G. Road, Navrangpura, Ahmedabad",
        href: "/products?centre=agarwal-complex",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=agarwal-complex",
          products: [
            { 
              name: "Meeting Room", 
              badge: "4-6 Seater", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Meeting Room.jpeg",
              href: "/products?centre=agarwal-complex&type=meeting-room", 
              description: "Smart Display, Whiteboard, High-speed WiFi & Coffee" 
            },
            { 
              name: "Conference Room", 
              badge: "10-12 Seater", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Board Room.jpeg",
              href: "/products?centre=agarwal-complex&type=conference-room", 
              description: "Video Conferencing, Projector Setup & Soundproofing" 
            },
            { 
              name: "Day Pass (Hot Desk)", 
              badge: "Per Day", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/flexi cabin .jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Full Day Access with High-Speed WiFi & Power Backup" 
            },
            { 
              name: "Training Room", 
              badge: "20-30 Seater", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Traning Room-1.jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Modular Workshop & Seminar Room Setup" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=agarwal-complex",
          products: [
            { 
              name: "Dedicated Desk", 
              badge: "Monthly", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/4 seater dedicated cabin.jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Fixed Personal Desk with Lockable Storage" 
            },
            { 
              name: "Flexi / Hot Desk", 
              badge: "Monthly", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/flexi cabin .jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Flexible Seating Across Open Lounge" 
            },
            { 
              name: "Private Cabin", 
              badge: "1-4 Seater", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Private Cabin.jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Fully Furnished Enclosed Glass Cabin" 
            },
            { 
              name: "Executive Cabin", 
              badge: "VIP Suite", 
              image: "/IMAGES_SSPACIA/AGARWAL COMPLEX IMAGES/Executive Cabin.jpeg",
              href: "/products?centre=agarwal-complex", 
              description: "Managerial Suite with Private Meeting Privileges" 
            }
          ]
        }
      },
      {
        id: "mercardo",
        name: "Mercado",
        shortName: "CG Road / Ellisbridge",
        address: "Sindhu Bhavan Marg / CG Road, Ahmedabad",
        href: "/products?centre=mercardo",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=mercardo",
          products: [
            { 
              name: "Meeting Room", 
              badge: "4-6 Seater", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Meeting Room.jpg",
              href: "/products?centre=mercardo", 
              description: "HD Display, Conference Audio & Gourmet Coffee" 
            },
            { 
              name: "Board Room", 
              badge: "10-14 Seater", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Board room.jpg",
              href: "/products?centre=mercardo", 
              description: "Executive Board Setup with AV & Soundproofing" 
            },
            { 
              name: "Day Pass (Flex Desk)", 
              badge: "Per Day", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Fix-flexi desk.jpg",
              href: "/products?centre=mercardo", 
              description: "Single Day Premium Coworking Pass" 
            },
            { 
              name: "Conference Area", 
              badge: "25-35 Seater", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Mercado conference area.jpg",
              href: "/products?centre=mercardo", 
              description: "Ideal for Seminars, Meetups & Corporate Demos" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=mercardo",
          products: [
            { 
              name: "Dedicated Desk", 
              badge: "Monthly", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Fix-flexi desk.jpg",
              href: "/products?centre=mercardo", 
              description: "Assigned Workstation with Power Backup & Drawer" 
            },
            { 
              name: "Dedicated Cabin", 
              badge: "4-6 Seater", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/MERCADO 4-SEATER CABIN.jpg",
              href: "/products?centre=mercardo", 
              description: "Fully Key-Lockable Team Workspace" 
            },
            { 
              name: "Private Cabin", 
              badge: "1-6 Seater", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Private Cabin.jpg",
              href: "/products?centre=mercardo", 
              description: "Acoustic Glass Partitioned Fully Furnished Suite" 
            },
            { 
              name: "Executive Suite", 
              badge: "VIP Suite", 
              image: "/IMAGES_SSPACIA/MERCADO IMAGES/Executive Cabin.jpg",
              href: "/products?centre=mercardo", 
              description: "Premium Director Suite with Reception Access" 
            }
          ]
        }
      }
    ]
  },
  {
    id: "sg-highway",
    name: "SG Highway",
    tagline: "Prime Corporate IT Corridor",
    centres: [
      {
        id: "premier-house",
        name: "Premier House",
        shortName: "SG Highway, Bodakdev",
        address: "SG Highway, Bodakdev, Ahmedabad",
        href: "/products?centre=premier-house",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=premier-house",
          products: [
            { 
              name: "Executive Meeting Room", 
              badge: "4-6 Seater", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/meeting room.jpg",
              href: "/products?centre=premier-house", 
              description: "Ergonomic Chairs, 4K Screen & High-speed WiFi" 
            },
            { 
              name: "Conference Hall", 
              badge: "12-16 Seater", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/board room.jpg",
              href: "/products?centre=premier-house", 
              description: "Large Format Corporate Conference Room" 
            },
            { 
              name: "Day Pass (Coworking)", 
              badge: "Per Day", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/Flexi Desk.jpeg",
              href: "/products?centre=premier-house", 
              description: "Access Premium Amenities & Collaborative Lounge" 
            },
            { 
              name: "Event & Workshop Hall", 
              badge: "30-50 Seater", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/EVENT ROOM 1.jpg",
              href: "/products?centre=premier-house", 
              description: "State-of-the-Art AV & Modular Event Setup" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=premier-house",
          products: [
            { 
              name: "Dedicated Desk", 
              badge: "Monthly", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/Fixed Desk Cabin.jpeg",
              href: "/products?centre=premier-house", 
              description: "Reserved Desk with Personal Lockable Storage" 
            },
            { 
              name: "Flexi / Hot Desk", 
              badge: "Monthly", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/Flexi Desk.jpeg",
              href: "/products?centre=premier-house", 
              description: "Dynamic Seating in Premium Vibrant Lounges" 
            },
            { 
              name: "Private Cabin", 
              badge: "1-8 Seater", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/Private Cabin.jpeg",
              href: "/products?centre=premier-house", 
              description: "Sound-Treated Dedicated Private Glass Cabins" 
            },
            { 
              name: "Executive Cabin", 
              badge: "VIP Suite", 
              image: "/IMAGES_SSPACIA/PREMIER HOUSE/Executive Cabin.jpeg",
              href: "/products?centre=premier-house", 
              description: "Custom Scalable Wing for High-Growth Teams" 
            }
          ]
        }
      }
    ]
  }
];
