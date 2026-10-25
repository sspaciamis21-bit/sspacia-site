/**
 * Site-wide SEO settings.
 *
 * baseUrl is the single canonical origin. sspacia.in, sspacia.ind.in and the
 * www hosts 301-redirect here (see next.config.ts), so every canonical tag,
 * sitemap entry, Open Graph URL and JSON-LD @id uses this origin.
 *
 * Page titles below are WITHOUT the brand: layout.tsx appends
 * " | SSPACIA Coworking Ahmedabad" through titleTemplate.
 */
export const seoConfig = {
  defaultTitle: "SSPACIA | Coworking Space in Ahmedabad – CG Road & SG Highway",
  titleTemplate: "%s | SSPACIA Coworking Ahmedabad",
  description:
    "Coworking space in Ahmedabad at CG Road (Agarwal Complex, Mercado) and SG Highway (Premier House): private cabins, desks, meeting rooms from ₹400/hour.",
  siteName: "SSPACIA Coworking",
  twitterHandle: "@sspacia",
  baseUrl: "https://sspacia.com",
  ogImage: "/og-image.jpg",
  keywords: [
    "coworking space Ahmedabad",
    "coworking space CG Road Ahmedabad",
    "coworking space SG Highway Ahmedabad",
    "managed office space Ahmedabad",
    "meeting room on rent Ahmedabad",
    "board room on rent Ahmedabad",
    "event space on rent Ahmedabad",
    "training room Ahmedabad",
    "shared office space Ahmedabad",
    "private cabin Ahmedabad",
    "hot desk Ahmedabad",
    "office space for rent Ahmedabad",
    "virtual office Ahmedabad with GST registration",
    "day pass coworking Ahmedabad",
    "SSPACIA",
    "SSPACIA Coworking",
    "SSPACIA Agarwal Complex",
    "SSPACIA Mercado",
    "SSPACIA Premier House",
  ],
  pages: {
    home: {
      title: "SSPACIA | Coworking Space in Ahmedabad – CG Road & SG Highway",
      description:
        "Coworking space in Ahmedabad at CG Road (Agarwal Complex, Mercado) and SG Highway (Premier House): private cabins, desks, meeting rooms from ₹400/hour.",
    },
    about: {
      title: "About SSPACIA – Coworking Centres in Ahmedabad",
      description:
        "SSPACIA runs fully managed coworking centres in Ahmedabad for startups, freelancers, CA and consulting firms and corporate teams at CG Road and SG Highway.",
    },
    products: {
      title: "Workspaces, Private Cabins & Meeting Rooms in Ahmedabad",
      description:
        "Every SSPACIA workspace in Ahmedabad: flexi and fixed desks, private cabins for 4–12, meeting rooms, board rooms and the event room, with live online booking.",
    },
    coworkingSpaces: {
      title: "Coworking Spaces in Ahmedabad – Shared Desks & Private Cabins",
      description:
        "Flexi desks, fixed desks and private cabins at CG Road and SG Highway, Ahmedabad. Fibre internet, meeting-room credits, 24/7 access. Monthly plans, free tour.",
    },
    guestSpaces: {
      title: "Meeting Rooms & Day Passes on Hourly Rent in Ahmedabad",
      description:
        "Book meeting rooms, board rooms, the 40-seat event room and day passes at SSPACIA Ahmedabad by the hour. Live calendar, instant booking, no membership needed.",
    },
    gallery: {
      title: "Workspace Gallery & Virtual Tour",
      description:
        "Photos of SSPACIA's reception areas, private cabins, meeting rooms and lounges at Agarwal Complex, Mercado and Premier House, Ahmedabad.",
    },
    contact: {
      title: "Contact SSPACIA & Book a Free Tour",
      description:
        "Call or WhatsApp +91 76003 93779, or e-mail sales@sspacia.com. Book a free tour at Agarwal Complex, Mercado (CG Road) or Premier House (SG Highway).",
    },
    blog: {
      title: "Coworking & Business Insights Blog",
      description:
        "Articles on coworking, managed offices, productivity and running a business from Ahmedabad, by the SSPACIA team.",
    },
    bookOnline: {
      title: "Book a Free Tour of a SSPACIA Centre in Ahmedabad",
      description:
        "Schedule a guided tour at any SSPACIA centre in Ahmedabad: see the cabins, rooms and pantry, and get a written proposal the same day.",
    },
    privacy: {
      title: "Privacy Policy",
      description: "Privacy policy and data-protection standards of SSPACIA Coworking.",
    },
    terms: {
      title: "Terms of Service",
      description: "Terms of service, membership rules and workspace agreement guidelines for SSPACIA centres in Ahmedabad.",
    },
  },
};
