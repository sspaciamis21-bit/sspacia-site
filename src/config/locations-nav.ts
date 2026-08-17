export interface ProductItem {
  name: string;
  badge?: string;
  href: string;
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
        href: "/products#agarwal-complex",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces",
          products: [
            { name: "Meeting Room (4-6 Seater)", badge: "Hourly", href: "/products#agarwal-complex", description: "Smart Display, Whiteboard, High-speed WiFi" },
            { name: "Conference Room (10-12 Seater)", badge: "Hourly", href: "/products#agarwal-complex", description: "Video Conferencing, Projector Setup" },
            { name: "Day Pass (Hot Desk)", badge: "Per Day", href: "/products#agarwal-complex", description: "Full Day Access with High-Speed Internet" },
            { name: "Interview Room", badge: "Hourly", href: "/products#agarwal-complex", description: "Private & Sound-Insulated Space" }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces",
          products: [
            { name: "Dedicated Desk", badge: "Monthly", href: "/products#agarwal-complex", description: "Fixed Personal Desk with Lockable Storage" },
            { name: "Flexi / Hot Desk", badge: "Monthly", href: "/products#agarwal-complex", description: "Flexible Seating Across Open Lounge" },
            { name: "Private Cabin (1-4 Seater)", badge: "Monthly", href: "/products#agarwal-complex", description: "Fully Furnished Enclosed Glass Cabin" },
            { name: "Managed Team Office", badge: "Custom", href: "/products#agarwal-complex", description: "Dedicated Space for Scaling Teams" }
          ]
        }
      },
      {
        id: "mercardo",
        name: "Mercado",
        shortName: "CG Road / Ellisbridge",
        address: "Sindhu Bhavan Marg / CG Road, Ahmedabad",
        href: "/products#mercardo",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces",
          products: [
            { name: "Meeting Room (4-6 Seater)", badge: "Hourly", href: "/products#mercardo", description: "HD Display, Conference Audio & Gourmet Coffee" },
            { name: "Board Room (10-14 Seater)", badge: "Hourly", href: "/products#mercardo", description: "Executive Board Setup with AV Systems" },
            { name: "Day Pass (Flex Desk)", badge: "Per Day", href: "/products#mercardo", description: "Single Day Premium Coworking Pass" },
            { name: "Event & Workshop Space", badge: "Half/Full Day", href: "/products#mercardo", description: "Ideal for Seminars, Meetups & Demos" }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces",
          products: [
            { name: "Dedicated Desk", badge: "Monthly", href: "/products#mercardo", description: "Assigned Workstation with Power Backup" },
            { name: "Flexi / Hot Desk", badge: "Monthly", href: "/products#mercardo", description: "Open Workstation Flexibility" },
            { name: "Private Cabin (1-6 Seater)", badge: "Monthly", href: "/products#mercardo", description: "Acoustic Glass Partitioned Offices" },
            { name: "Executive Suite", badge: "Custom", href: "/products#mercardo", description: "Premium Managerial & Director Suites" }
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
        href: "/products#premier-house",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces",
          products: [
            { name: "Executive Meeting Room (4-6 Seater)", badge: "Hourly", href: "/products#premier-house", description: "Ergonomic Chairs, 4K Screen & High-speed WiFi" },
            { name: "Conference Hall (12-16 Seater)", badge: "Hourly", href: "/products#premier-house", description: "Large Format Corporate Conference Room" },
            { name: "Day Pass (Coworking)", badge: "Per Day", href: "/products#premier-house", description: "Access Premium Amenities & Lounge" },
            { name: "Discussion & Interview Pod", badge: "Hourly", href: "/products#premier-house", description: "Focused 1-on-1 Discussion Pod" }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces",
          products: [
            { name: "Dedicated Desk", badge: "Monthly", href: "/products#premier-house", description: "Reserved Desk with Personal Storage" },
            { name: "Flexi / Hot Desk", badge: "Monthly", href: "/products#premier-house", description: "Dynamic Seating in Premium Lounges" },
            { name: "Private Cabin (1-8 Seater)", badge: "Monthly", href: "/products#premier-house", description: "Sound-Treated Dedicated Private Cabins" },
            { name: "Enterprise Team Office", badge: "Custom", href: "/products#premier-house", description: "Custom Scalable Wing for High-Growth Teams" }
          ]
        }
      }
    ]
  }
];
