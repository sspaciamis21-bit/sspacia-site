import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { seoConfig } from "@/config/seo";
import { BUSINESS, CENTRES, formatINR, fullAddress, getCentre, type Centre } from "@/config/centres";
import { StructuredData } from "@/components/structured-data";
import { breadcrumbSchema, centreSchema, faqSchema, roomProductSchema } from "@/lib/seo-schema";
import {
  Breadcrumbs,
  CtaBand,
  FaqList,
  Inclusions,
  LandingShell,
  PriceTable,
  RelatedLinks,
  RoomCards,
  SectionTitle,
  WorkspaceCards,
  type Faq,
} from "@/components/seo/landing";

export const revalidate = 3600;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CENTRES.map((c) => ({ slug: c.slug }));
}

function titleFor(c: Centre) {
  return `Coworking Space at ${c.name}, ${c.area}, Ahmedabad – Cabins, Desks, Meeting Rooms`;
}

function descriptionFor(c: Centre) {
  const cheapest = Math.min(...c.rooms.map((r) => r.pricePerHour));
  return `SSPACIA ${c.name}: coworking in ${c.locality}, ${c.area}, Ahmedabad. Private cabins for ${c.workspaces
    .filter((w) => w.kind.endsWith("cabin"))
    .map((w) => w.capacity)
    .join(", ")} people, desks, meeting rooms from ${formatINR(cheapest)}/hour, 24/7 access. Book a tour.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const c = getCentre(slug);
  if (!c) return { title: "Centre not found" };
  const url = `${seoConfig.baseUrl}/locations/${c.slug}`;
  return {
    title: titleFor(c),
    description: descriptionFor(c),
    alternates: { canonical: url },
    openGraph: {
      title: `${titleFor(c)} | SSPACIA`,
      description: descriptionFor(c),
      url,
      type: "website",
      images: [{ url: `${seoConfig.baseUrl}${encodeURI(c.image)}`, width: 1200, height: 800, alt: `SSPACIA ${c.name} reception, ${c.area}, Ahmedabad` }],
    },
  };
}

function faqsFor(c: Centre): Faq[] {
  const meeting = c.rooms.find((r) => r.kind === "meeting-room");
  const board = c.rooms.find((r) => r.kind === "board-room");
  const event = c.rooms.find((r) => r.kind === "event-room");
  const faqs: Faq[] = [
    {
      q: `Where is SSPACIA ${c.name}?`,
      a: `${fullAddress(c)}. Landmark: ${c.landmark}. Open the Google Maps pin on this page for directions.`,
    },
    {
      q: `What can I rent at SSPACIA ${c.name}?`,
      a: `Flexi desks and fixed desks for individuals, private cabins for ${c.workspaces
        .filter((w) => w.kind.endsWith("cabin"))
        .map((w) => w.capacity)
        .join(", ")} people on monthly terms, ${c.rooms
        .map((r) => `a ${r.capacity}-seat ${r.name.toLowerCase()} at ${formatINR(r.pricePerHour)}/hour`)
        .join(", ")}, day passes at ${formatINR(BUSINESS.dayPassPrice)} + GST and a virtual office address at ${formatINR(BUSINESS.virtualOfficeYearly)}/year.`,
    },
    {
      q: `What are the opening hours at ${c.name}?`,
      a: "Members have 24/7 access, every day. Meeting rooms and the event room are bookable online in hourly slots from 8:00 am to 8:00 pm; call the front desk for other timings.",
    },
    {
      q: `Can I book a meeting room at ${c.name} without being a member?`,
      a: `Yes. ${meeting ? `The ${meeting.capacity}-seater meeting room (${formatINR(meeting.pricePerHour)}/hour)` : "The meeting room"}${board ? ` and the ${board.capacity}-seater board room (${formatINR(board.pricePerHour)}/hour)` : ""}${event ? ` and the ${event.capacity}-seat event room (${formatINR(event.pricePerHour)}/hour)` : ""} are open to visitors and non-members. Book online or call ${BUSINESS.phoneDisplay}.`,
    },
    {
      q: `Can I use ${c.name} as my registered office or GST address?`,
      a: `Yes. ${c.name} is a commercial address at ${c.locality}, ${c.area}, and SSPACIA's virtual office plan (${formatINR(BUSINESS.virtualOfficeYearly)} per year) covers address use for company and GST registration plus mail and courier handling at the front desk.`,
    },
    {
      q: `How do I try ${c.name} for a day?`,
      a: `Buy a day pass (${formatINR(BUSINESS.dayPassPrice)} + GST) or a weekly pass (${formatINR(BUSINESS.weeklyPassPrice)} + GST) for a flexi desk, or book a free tour and the community manager will walk you through the centre and the plans.`,
    },
  ];
  return faqs;
}

export default async function CentrePage({ params }: PageProps) {
  const { slug } = await params;
  const c = getCentre(slug);
  if (!c) notFound();

  const roomRows = c.rooms.map((room) => ({ centre: c, room }));
  const workspaceRows = c.workspaces.map((workspace) => ({ centre: c, workspace }));
  const faqs = faqsFor(c);
  const others = CENTRES.filter((o) => o.slug !== c.slug);
  const cheapest = Math.min(...c.rooms.map((r) => r.pricePerHour));

  return (
    <>
      <StructuredData data={centreSchema(c)} />
      <StructuredData data={breadcrumbSchema([{ name: "Locations", path: "/locations" }, { name: c.name, path: `/locations/${c.slug}` }])} />
      {c.rooms.map((room) => (
        <StructuredData key={room.id} data={roomProductSchema(c, room)} />
      ))}
      <StructuredData data={faqSchema(faqs)} />

      <LandingShell>
        <Breadcrumbs items={[{ name: "Locations", path: "/locations" }, { name: `${c.name}, ${c.area}`, path: `/locations/${c.slug}` }]} />

        <section className="grid gap-8 rounded-[2rem] border border-[#CFD8DC]/70 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#006064]">SSPACIA · {c.area} · Ahmedabad</span>
            <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-[#004D40] sm:text-4xl lg:text-5xl">
              Coworking space at {c.name}, {c.area}, Ahmedabad
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#424242] sm:text-lg">
              {c.tagline}. SSPACIA {c.name} in {c.locality} offers flexi and fixed desks, private cabins for{" "}
              {c.workspaces.filter((w) => w.kind.endsWith("cabin")).map((w) => w.capacity).join(", ")} people, and{" "}
              {c.rooms.length} bookable rooms from {formatINR(cheapest)} per hour, with 24/7 member access, fibre internet, reception and a
              commercial address you can register your company and GST at.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book-online"
                className="inline-flex items-center gap-2 rounded-full bg-[#006064] px-6 py-3 text-sm font-bold text-white hover:bg-[#004D40]"
              >
                Book a free tour <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/guest-spaces?centre=${c.locationId}`}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#006064] bg-white px-6 py-3 text-sm font-bold text-[#006064] hover:bg-[#E0F7FA]"
              >
                Book a room by the hour
              </Link>
            </div>
            <dl className="grid gap-3 text-sm text-[#424242] sm:grid-cols-2">
              <div className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" />
                <div>
                  <dt className="font-semibold text-[#1B1C1C]">Address</dt>
                  <dd>{fullAddress(c)}</dd>
                  <dd className="text-xs text-[#616161]">{c.landmark}</dd>
                  <dd>
                    <a href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#006064] hover:underline">
                      Open in Google Maps
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" />
                <div>
                  <dt className="font-semibold text-[#1B1C1C]">Phone and WhatsApp</dt>
                  <dd>
                    <a href={`tel:${BUSINESS.phoneE164}`} className="hover:text-[#006064]">{BUSINESS.phoneDisplay}</a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" />
                <div>
                  <dt className="font-semibold text-[#1B1C1C]">E-mail</dt>
                  <dd>
                    <a href={`mailto:${BUSINESS.email}`} className="hover:text-[#006064]">{BUSINESS.email}</a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" />
                <div>
                  <dt className="font-semibold text-[#1B1C1C]">Hours</dt>
                  <dd>Members 24/7 · rooms bookable {BUSINESS.roomSlotWindow}</dd>
                </div>
              </div>
            </dl>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <div className="relative h-56 overflow-hidden rounded-2xl sm:h-64">
              <Image
                src={c.image}
                alt={`SSPACIA ${c.name} reception, ${c.area}, Ahmedabad`}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
                priority
              />
            </div>
            <iframe
              src={c.mapEmbedUrl}
              title={`Map of SSPACIA ${c.name}, ${c.area}, Ahmedabad`}
              className="h-56 w-full rounded-2xl border border-[#CFD8DC]/70"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            kicker="Rooms by the hour"
            title={`Meeting rooms${c.rooms.some((r) => r.kind === "event-room") ? ", board room and event room" : " and board room"} at ${c.name}`}
            intro="Open to members and visitors. Prices are per hour, exclusive of GST, with the screen, Wi-Fi, air-conditioning and tea and coffee included."
          />
          <RoomCards items={roomRows} />
          <PriceTable caption={`Room prices at SSPACIA ${c.name} (per hour, exclusive of GST)`} rows={roomRows} />
        </section>

        <section className="space-y-6">
          <SectionTitle
            kicker="Monthly workspaces"
            title={`Desks and private cabins at ${c.name}`}
            intro="Flexi and fixed desks for individuals; dedicated, private and executive cabins for teams. Cabin rent is quoted per cabin after your tour."
          />
          <WorkspaceCards items={workspaceRows} />
        </section>

        <Inclusions
          title={`Included at ${c.name}`}
          items={[
            "24/7 access for members",
            "High-speed fibre Wi-Fi with backup line",
            "Reception: visitors, mail and couriers handled",
            "Daily housekeeping; air-conditioned floor",
            "Unlimited tea and coffee",
            "Printing and scanning at the front desk",
            "Meeting-room credits with cabin plans",
            `Virtual office address at ${formatINR(BUSINESS.virtualOfficeYearly)}/year`,
          ]}
        />

        <FaqList title={`SSPACIA ${c.name}: questions people ask`} items={faqs} />

        <section className="space-y-4">
          <SectionTitle kicker="Other centres" title="SSPACIA elsewhere in Ahmedabad" />
          <div className="grid gap-4 sm:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/locations/${o.slug}`}
                className="group rounded-2xl border border-[#CFD8DC]/70 bg-white p-5 hover:border-[#1ab0bc]"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#006064]">{o.area}</span>
                <span className="mt-1 block text-lg font-bold text-[#1B1C1C] group-hover:text-[#006064]">{o.name}</span>
                <span className="block text-xs text-[#616161]">{o.landmark}</span>
              </Link>
            ))}
          </div>
        </section>

        <CtaBand
          title={`Visit ${c.name} this week`}
          text="Tours run every working day. You will see the cabins, the rooms and the pantry, and leave with a written proposal the same day."
          primary={{ label: "Book a free tour", href: "/book-online" }}
        />

        <RelatedLinks current="" />
      </LandingShell>
    </>
  );
}
