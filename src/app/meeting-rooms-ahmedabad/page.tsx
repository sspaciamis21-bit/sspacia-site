import type { Metadata } from "next";
import { seoConfig } from "@/config/seo";
import { BUSINESS, formatINR, roomsOfKind } from "@/config/centres";
import { StructuredData } from "@/components/structured-data";
import { breadcrumbSchema, faqSchema, roomProductSchema, serviceSchema } from "@/lib/seo-schema";
import {
  Breadcrumbs,
  CentreStrip,
  CtaBand,
  FaqList,
  Inclusions,
  LandingHero,
  LandingShell,
  PriceTable,
  RelatedLinks,
  RoomCards,
  SectionTitle,
  type Faq,
} from "@/components/seo/landing";

export const revalidate = 3600;

const PATH = "/meeting-rooms-ahmedabad";
const TITLE = "Meeting Rooms on Rent in Ahmedabad – Hourly from ₹400";
const DESCRIPTION =
  "Meeting rooms by the hour in Ahmedabad from ₹400/hour: 4–6 seaters at CG Road (Agarwal Complex, Mercado) and SG Highway (Premier House). Book online.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${seoConfig.baseUrl}${PATH}` },
  openGraph: {
    title: `${TITLE} | SSPACIA`,
    description: DESCRIPTION,
    url: `${seoConfig.baseUrl}${PATH}`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Meeting rooms on rent in Ahmedabad – SSPACIA" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "How much does a meeting room cost per hour in Ahmedabad at SSPACIA?",
    a: "₹400 per hour for the 5-seater at Agarwal Complex (CG Road), ₹500 per hour for the 6-seater at Mercado (CG Road) and ₹500 per hour for the 4-seater at Premier House (SG Highway). GST is extra. The hourly rate includes the display screen, Wi-Fi, air-conditioning and tea and coffee for the group.",
  },
  {
    q: "Can I book a meeting room for just one hour?",
    a: "Yes. Rooms are sold in one-hour slots between 8:00 am and 8:00 pm. Pick the room, choose the date and the slots you need, pay online and the booking is confirmed instantly. If the next slot is free you can add hours on the same calendar.",
  },
  {
    q: "Do I need to be a SSPACIA member to rent a meeting room?",
    a: "No. Meeting rooms, board rooms and the event room are open to anyone. Visiting teams and non-members book the same way as members, through the online calendar or by calling the front desk on +91 76003 93779.",
  },
  {
    q: "What is included in the room?",
    a: "A display screen for presentations, high-speed Wi-Fi, whiteboard, air-conditioning, front-desk reception for your guests and unlimited tea and coffee. Printing and scanning are available at the front desk.",
  },
  {
    q: "Where exactly are the rooms?",
    a: "Agarwal Complex and Mercado are both on C.G. Road (Navrangpura and Ellisbridge, pin 380009), Mercado opposite the Municipal Market. Premier House is on S.G. Highway in Bodakdev (pin 380054), opposite the Gurudwara. Each centre page has the Google Maps pin.",
  },
  {
    q: "Will I get a tax invoice for the booking?",
    a: "Yes. A tax invoice is issued for every booking, so the room rent can be claimed as a business expense. Enter your company name and GSTIN at checkout to have them printed on the invoice.",
  },
  {
    q: "Which room should I choose for 8 to 14 people?",
    a: "Use a board room: 11 seats at Agarwal Complex (₹600/hour), 14 seats at Mercado (₹1,000/hour) or 12 seats at Premier House (₹1,000/hour). For 15 to 40 people, book the event room at Premier House (₹2,000/hour).",
  },
];

export default function MeetingRoomsPage() {
  const rooms = roomsOfKind("meeting-room");

  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Meeting rooms in Ahmedabad", path: PATH }])} />
      <StructuredData
        data={serviceSchema({
          name: "Meeting room rental in Ahmedabad",
          serviceType: "Meeting room rental",
          description: DESCRIPTION,
          path: PATH,
          offers: rooms.map(({ centre, room }) => ({
            name: `${room.name} (${room.capacity} seats) – ${centre.name}, ${centre.area}`,
            price: room.pricePerHour,
            unit: "per hour",
            url: `${seoConfig.baseUrl}/products/${room.id}`,
          })),
        })}
      />
      {rooms.map(({ centre, room }) => (
        <StructuredData key={room.id} data={roomProductSchema(centre, room)} />
      ))}
      <StructuredData data={faqSchema(FAQS)} />

      <LandingShell>
        <Breadcrumbs items={[{ name: "Meeting rooms in Ahmedabad", path: PATH }]} />

        <LandingHero
          eyebrow="SSPACIA · Ahmedabad"
          title="Meeting rooms on rent in Ahmedabad, by the hour"
          intro={`SSPACIA has three fully equipped meeting rooms in Ahmedabad: a 5-seater at Agarwal Complex and a 6-seater at Mercado on CG Road, and a 4-seater at Premier House on SG Highway. Rates start at ${formatINR(400)} per hour plus GST, bookable online in hourly slots from ${BUSINESS.roomSlotWindow}, with a screen, Wi-Fi, air-conditioning and tea and coffee included. No membership needed.`}
          primary={{ label: "See live slots and book", href: "/guest-spaces" }}
          secondary={{ label: "Board rooms for 11–14", href: "/board-rooms-ahmedabad" }}
          facts={["From ₹400/hour", "Instant online booking", "GST invoice", "CG Road and SG Highway", "Open to non-members"]}
        />

        <section className="space-y-6">
          <SectionTitle
            kicker="Choose a room"
            title="Three meeting rooms, two business districts"
            intro="Pick the centre nearest your client or your team. Each room is private, air-conditioned and front-desk supported, so your guests are received and seated before you arrive."
          />
          <RoomCards items={rooms} />
        </section>

        <PriceTable caption="Meeting room prices in Ahmedabad at SSPACIA (per hour, exclusive of GST)" rows={rooms} />

        <Inclusions
          title="What every hourly meeting-room booking includes"
          items={[
            "Display screen for presentations and video calls",
            "High-speed fibre Wi-Fi with backup line",
            "Whiteboard and markers",
            "Air-conditioned, sound-insulated room",
            "Reception to receive and seat your guests",
            "Unlimited tea and coffee for attendees",
            "Printing and scanning at the front desk",
            "GST tax invoice issued automatically on booking",
          ]}
        />

        <CentreStrip title="Where the rooms are" />

        <FaqList title="Meeting rooms in Ahmedabad: questions people ask" items={FAQS} />

        <CtaBand
          title="Need a room today?"
          text="Slots are live on the booking calendar. For a recurring weekly slot, a half-day block or catering for your guests, call or WhatsApp the front desk and we will hold the room for you."
          primary={{ label: "Open booking calendar", href: "/guest-spaces" }}
        />

        <RelatedLinks current={PATH} />
      </LandingShell>
    </>
  );
}
