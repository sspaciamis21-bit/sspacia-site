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

const PATH = "/board-rooms-ahmedabad";
const TITLE = "Board Rooms on Rent in Ahmedabad – 11 to 14 Seats, Hourly";
const DESCRIPTION =
  "Board rooms on hourly rent in Ahmedabad: 11, 12 and 14 seaters at CG Road and SG Highway from ₹600/hour, with video conferencing. Book online.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${seoConfig.baseUrl}${PATH}` },
  openGraph: {
    title: `${TITLE} | SSPACIA`,
    description: DESCRIPTION,
    url: `${seoConfig.baseUrl}${PATH}`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Board rooms on rent in Ahmedabad – SSPACIA" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "What does a board room cost per hour in Ahmedabad at SSPACIA?",
    a: "₹600 per hour for the 11-seater at Agarwal Complex (CG Road), ₹1,000 per hour for the 14-seater at Mercado (CG Road) and ₹1,000 per hour for the 12-seater at Premier House (SG Highway), all exclusive of GST.",
  },
  {
    q: "Is video conferencing available in the board rooms?",
    a: "Yes. The board rooms are set up for HD video conferencing with a large display and an audio system, so a hybrid meeting with remote directors or clients runs from the room without extra equipment.",
  },
  {
    q: "Can non-members book a board room for a client presentation or a board meeting?",
    a: "Yes. Board rooms are open to everyone. Book the date and hourly slots online, or call the front desk to hold a half-day or full-day block.",
  },
  {
    q: "Which board room is the largest?",
    a: "The Mercado board room on CG Road seats 14 around an executive table. Premier House on SG Highway seats 12 and Agarwal Complex seats 11. For 15 to 40 people, use the event room at Premier House.",
  },
  {
    q: "Can tea, coffee and lunch be arranged for the meeting?",
    a: "Tea and coffee are included for attendees. Working lunch or snacks for the group can be arranged through the front desk when you book; tell us the headcount and timing.",
  },
  {
    q: "Is the board room suitable for interviews, auditor visits and statutory meetings?",
    a: "Yes. The rooms are private and sound-insulated, with reception to receive candidates or auditors, printing at the front desk and a tax invoice for the booking.",
  },
];

export default function BoardRoomsPage() {
  const rooms = roomsOfKind("board-room");

  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Board rooms in Ahmedabad", path: PATH }])} />
      <StructuredData
        data={serviceSchema({
          name: "Board room rental in Ahmedabad",
          serviceType: "Board room and conference room rental",
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
        <Breadcrumbs items={[{ name: "Board rooms in Ahmedabad", path: PATH }]} />

        <LandingHero
          eyebrow="SSPACIA · Ahmedabad"
          title="Board rooms on rent in Ahmedabad for 11 to 14 people"
          intro={`SSPACIA's three board rooms seat 11 at Agarwal Complex and 14 at Mercado on CG Road, and 12 at Premier House on SG Highway. Hourly rates run from ${formatINR(600)} to ${formatINR(1000)} plus GST, with HD video conferencing, an audio system, executive seating and tea and coffee included. Book hourly slots online from ${BUSINESS.roomSlotWindow}, or ask the front desk for a half-day or full-day block.`}
          primary={{ label: "See live slots and book", href: "/guest-spaces" }}
          secondary={{ label: "Smaller meeting rooms", href: "/meeting-rooms-ahmedabad" }}
          facts={["11, 12 and 14 seats", "From ₹600/hour", "Video conferencing", "Tax invoice", "Open to non-members"]}
        />

        <section className="space-y-6">
          <SectionTitle
            kicker="Choose a room"
            title="Three board rooms across CG Road and SG Highway"
            intro="Executive tables, HD screens and sound insulation for board meetings, client pitches, investor reviews, auditor visits and panel interviews."
          />
          <RoomCards items={rooms} />
        </section>

        <PriceTable caption="Board room prices in Ahmedabad at SSPACIA (per hour, exclusive of GST)" rows={rooms} />

        <Inclusions
          title="What every board-room booking includes"
          items={[
            "Executive boardroom table and seating",
            "Large display with HD video conferencing",
            "Audio system for hybrid meetings",
            "High-speed fibre Wi-Fi with backup line",
            "Air-conditioned, sound-insulated room",
            "Reception to receive and seat your guests",
            "Unlimited tea and coffee; lunch on request",
            "Printing, scanning and a tax invoice",
          ]}
        />

        <CentreStrip title="Where the board rooms are" />

        <FaqList title="Board rooms in Ahmedabad: questions people ask" items={FAQS} />

        <CtaBand
          title="Hold a board room for your next meeting"
          text="Live availability is on the booking calendar. For recurring board meetings, monthly reviews or a full-day block with lunch, call or WhatsApp the front desk."
          primary={{ label: "Open booking calendar", href: "/guest-spaces" }}
        />

        <RelatedLinks current={PATH} />
      </LandingShell>
    </>
  );
}
