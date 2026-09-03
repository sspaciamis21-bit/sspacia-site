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
        href: "/products?centre=1",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=1",
          products: [
            { 
              name: "Meeting Room", 
              badge: "5 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635417/sspacia/zn8uhmxi970pwbicxfvo.jpg",
              href: "/products?centre=1&type=meeting-room", 
              description: "High-Speed WiFi, Display Screen, Whiteboard, Air Conditioning" 
            },
            { 
              name: "Board Room", 
              badge: "11 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635368/sspacia/wmgzactuei1zw9bybxjd.jpg",
              href: "/products?centre=1&type=board-room", 
              description: "HD Video Conferencing, Audio System, Executive Seating" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=1",
          products: [
            { 
              name: "Flexi Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635869/sspacia/kobfavhkbawfimpzqszt.jpg",
              href: "/products?centre=1&type=flexi-desk", 
              description: "Ultra-Fast WiFi, 24/7 Access, Gourmet Brews, Homely Staff" 
            },
            { 
              name: "Fixed Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635812/sspacia/rf39f2avjwoziofpmkj8.jpg",
              href: "/products?centre=1&type=fixed-desk", 
              description: "Fixed Workstation, Lockable Storage, Ultra-Fast WiFi" 
            },
            { 
              name: "Dedicated Cabin", 
              badge: "4 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635561/sspacia/s2auntn8fgam4zcothjl.jpg",
              href: "/products?centre=1&type=dedicated-cabin", 
              description: "Private Glass Cabin, Dedicated Access, Ultra-Fast WiFi" 
            },
            { 
              name: "Private Cabin", 
              badge: "8 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635518/sspacia/cbquo8pwvgtliddvp7hu.jpg",
              href: "/products?centre=1&type=private-cabin", 
              description: "Acoustic Glass Enclosure, Key Lockable, Ultra-Fast WiFi" 
            },
            { 
              name: "Executive Cabin", 
              badge: "10 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635472/sspacia/pisc6f6onwuhxyiutyoh.jpg",
              href: "/products?centre=1&type=executive-cabin", 
              description: "Executive Team Suite, Premium Ergonomics, Ultra-Fast WiFi" 
            }
          ]
        }
      },
      {
        id: "mercardo",
        name: "Mercado",
        shortName: "Chandkheda",
        address: "Mercado, Chandkheda, Ahmedabad",
        href: "/products?centre=2",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=2",
          products: [
            { 
              name: "Meeting Room", 
              badge: "6 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634689/sspacia/spxy536xlynfktvqopwt.jpg",
              href: "/products?centre=2&type=meeting-room", 
              description: "Advanced Tech, Ultra-Fast WiFi, 24/7 Access, Homely Staff" 
            },
            { 
              name: "Board Room", 
              badge: "14 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634504/sspacia/folrtl4pgrpfxaxd6afc.jpg",
              href: "/products?centre=2&type=board-room", 
              description: "Executive Boardroom Setup, Advanced Tech, Ultra-Fast WiFi" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=2",
          products: [
            { 
              name: "Flexi Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634847/sspacia/leelnmezm7hzdtqzqywf.jpg",
              href: "/products?centre=2&type=flexi-desk", 
              description: "Ultra-Fast WiFi, 24/7 Access, Gourmet Brews, Homely Staff" 
            },
            { 
              name: "Fixed Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635130/sspacia/wgxtq7cliwyspnvkrsfi.jpg",
              href: "/products?centre=2&type=fixed-desk", 
              description: "Reserved Workstation, Ultra-Fast WiFi, Gourmet Brews" 
            },
            { 
              name: "Dedicated Cabin", 
              badge: "6 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634750/sspacia/xjqmrfsn69ithe7tc0id.jpg",
              href: "/products?centre=2&type=dedicated-cabin", 
              description: "Furnished Team Cabin, Ultra-Fast WiFi, 24/7 Access" 
            },
            { 
              name: "Private Cabin", 
              badge: "8 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787634897/sspacia/j8jisbg2vbs3s3gs71r4.jpg",
              href: "/products?centre=2&type=private-cabin", 
              description: "Private Glass Suite, Ultra-Fast WiFi, 24/7 Access" 
            },
            { 
              name: "Executive Cabin", 
              badge: "12 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787635070/sspacia/qnraod6yuhuyitpfzzvo.jpg",
              href: "/products?centre=2&type=executive-cabin", 
              description: "Director Executive Cabin, Ultra-Fast WiFi, 24/7 Access" 
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
        href: "/products?centre=3",
        guestSpaces: {
          title: "Guest Spaces",
          type: "guest",
          badge: "Hourly / Daily",
          href: "/guest-spaces?centre=3",
          products: [
            { 
              name: "Meeting Room", 
              badge: "4 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637449/sspacia/zyqeedod9lxhnzixspdf.jpg",
              href: "/products?centre=3&type=meeting-room", 
              description: "Display Screen, Ultra-Fast WiFi, High-Speed Internet, AC" 
            },
            { 
              name: "Board Room", 
              badge: "12 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637125/sspacia/vjk4ttvafaojoy3c11ag.jpg",
              href: "/products?centre=3&type=board-room", 
              description: "Executive Boardroom Setup, Video Conferencing, Audio System" 
            },
            { 
              name: "Event Room", 
              badge: "40 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637220/sspacia/ombcwnvxurdyiwc2atud.jpg",
              href: "/products?centre=3&type=event-room", 
              description: "Large Format Event Hall, Presentation Setup, PA Audio System" 
            }
          ]
        },
        coworkingSpaces: {
          title: "Co-working Spaces",
          type: "coworking",
          badge: "Monthly / Dedicated",
          href: "/coworking-spaces?centre=3",
          products: [
            { 
              name: "Flexi Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637560/sspacia/owf8hte4jizxrazo22sk.jpg",
              href: "/products?centre=3&type=flexi-desk", 
              description: "Ultra-Fast WiFi, 24/7 Access, Gourmet Brews, Homely Staff" 
            },
            { 
              name: "Fixed Desk", 
              badge: "1 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787723141/sspacia/euunzkotguczezkmo9yl.jpg",
              href: "/products?centre=3&type=fixed-desk", 
              description: "Dedicated Workstation, Ultra-Fast WiFi, 24/7 Access" 
            },
            { 
              name: "Dedicated Cabin", 
              badge: "4 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787637494/sspacia/u9b5c1xebx39uoynlnqd.jpg",
              href: "/products?centre=3&type=dedicated-cabin", 
              description: "Private Glass Cabin, Ultra-Fast WiFi, 24/7 Access" 
            },
            { 
              name: "Private Cabin", 
              badge: "8 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787723034/sspacia/hsou3eratsy8zieiyscr.jpg",
              href: "/products?centre=3&type=private-cabin", 
              description: "Team Glass Suite, Ultra-Fast WiFi, 24/7 Access" 
            },
            { 
              name: "Executive Cabin", 
              badge: "10 Seater", 
              image: "https://res.cloudinary.com/dmgwi8dqd/image/upload/v1787722962/sspacia/ip38muckfafkwnihjia6.jpg",
              href: "/products?centre=3&type=executive-cabin", 
              description: "Executive Team Wing, Ultra-Fast WiFi, 24/7 Access" 
            }
          ]
        }
      }
    ]
  }
];
