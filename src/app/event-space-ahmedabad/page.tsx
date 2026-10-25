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

const PATH = "/event-space-ahmedabad";
const TITLE = "Event Space & Training Room on Rent in Ahmedabad – 40 Seats, SG Highway";
const DESCRIPTION =
  "40-seat event and training room at Premier House, SG Highway, Ahmedabad: ₹2,000/hour + GST, screen, PA audio, theatre or classroom layout. Book online.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${seoConfig.baseUrl}${PATH}` },
  openGraph: {
    title: `${TITLE} | SSPACIA`,
    description: DESCRIPTION,
    url: `${seoConfig.baseUrl}${PATH}`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Event space on rent in Ahmedabad – SSPACIA Premier House" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "How much does the event room cost?",
    a: "₹2,000 per hour plus GST for the 40-seater event room at Premier House, SG Highway. Book the hours you need online; for a half-day or full-day workshop, call the front desk and we will quote a block rate.",
  },
  {
    q: "How many people fit in the event room?",
    a: "Up to 40 people in theatre seating. Classroom and U-shape layouts for training hold fewer; tell us the format when you book and the room is set up before you arrive.",
  },
  {
    q: "What kind of events is the room used for?",
    a: "Corporate training, workshops, seminars, product demos and launches, team town halls, investor meetups, certification classes and community events. It is a working-day venue inside a corporate building, not a banquet hall.",
  },
  {
    q: "What equipment is provided?",
    a: "A presentation screen with a projector-ready setup, PA audio system with microphone, high-speed Wi-Fi for all participants, air-conditioning and front-desk reception for registration. Tea and coffee are included; lunch and snacks can be arranged.",
  },
  {
    q: "Where is Premier House?",
    a: "Premier House is on the Sarkhej–Gandhinagar (S.G.) Highway in Bodakdev, Ahmedabad 380054, opposite the Gurudwara, in the city's corporate corridor. SSPACIA is on the 6th floor.",
  },
  {
    q: "Can we book the event room on a weekend or after hours?",
    a: "Online slots run from 8:00 am to 8:00 pm every day. For an early start, a late finish or a multi-day programme, call or WhatsApp the front desk and we will arrange it.",
  },
  {
    q: "Do you have smaller rooms for breakout sessions?",
    a: "Yes. Premier House also has a 12-seater board room and a 4-seater meeting room on the same floor, bookable by the hour for breakouts, interviews or a speakers' room.",
  },
];

export default function EventSpacePage() {
  const rooms = roomsOfKind("event-room");

  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Event space in Ahmedabad", path: PATH }])} />
      <StructuredData
        data={serviceSchema({
          name: "Event space and training room rental in Ahmedabad",
          serviceType: "Event venue and training room rental",
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
        <Breadcrumbs items={[{ name: "Event space in Ahmedabad", path: PATH }]} />

        <LandingHero
          eyebrow="SSPACIA · Premier House, SG Highway"
          title="Event space and training room on rent in Ahmedabad"
          intro={`SSPACIA's event room at Premier House, S.G. Highway (Bodakdev) seats 40 and rents for ${formatINR(2000)} per hour plus GST, with a presentation screen, PA audio, high-speed Wi-Fi, air-conditioning and reception for registration. Book hourly slots online from ${BUSINESS.roomSlotWindow}, or call for a half-day, full-day or multi-day workshop rate.`}
          primary={{ label: "Check availability and book", href: "/products/24" }}
          secondary={{ label: "Board rooms for 11–14", href: "/board-rooms-ahmedabad" }}
          facts={["40 seats", "₹2,000/hour + GST", "Theatre, classroom or U-shape", "PA audio and screen", "Corporate building, 6th floor"]}
        />

        <section className="space-y-6">
          <SectionTitle
            kicker="The room"
            title="A 40-seat hall built for working events"
            intro="Training programmes, seminars, launches and town halls, inside a corporate building on the S.G. Highway corridor, with breakout rooms on the same floor."
          />
          <RoomCards items={rooms} />
        </section>

        <PriceTable caption="Event room price in Ahmedabad at SSPACIA (per hour, exclusive of GST)" rows={rooms} />

        <Inclusions
          title="What the event room booking includes"
          items={[
            "Seating for up to 40 in theatre layout; classroom and U-shape on request",
            "Presentation screen with projector-ready setup",
            "PA audio system with microphone",
            "High-speed fibre Wi-Fi for all participants",
            "Air-conditioned hall",
            "Reception desk for registration and guest handling",
            "Unlimited tea and coffee; lunch and snacks arranged on request",
            "Tax invoice for the booking",
          ]}
        />

        <CentreStrip title="Other SSPACIA centres in Ahmedabad" />

        <FaqList title="Event space in Ahmedabad: questions people ask" items={FAQS} />

        <CtaBand
          title="Planning a workshop or seminar?"
          text="Tell us the date, headcount and layout. We will confirm availability, set up the room and quote a block rate for half-day, full-day or multi-day programmes."
          primary={{ label: "Book the event room", href: "/products/24" }}
        />

        <RelatedLinks current={PATH} />
      </LandingShell>
    </>
  );
}
