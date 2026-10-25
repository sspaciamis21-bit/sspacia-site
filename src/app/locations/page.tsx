import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { seoConfig } from "@/config/seo";
import { BUSINESS, CENTRES, formatINR, fullAddress } from "@/config/centres";
import { StructuredData } from "@/components/structured-data";
import { breadcrumbSchema, faqSchema } from "@/lib/seo-schema";
import { Breadcrumbs, CtaBand, FaqList, LandingShell, RelatedLinks, type Faq } from "@/components/seo/landing";

export const revalidate = 3600;

const PATH = "/locations";
const TITLE = "Coworking Space Locations in Ahmedabad – CG Road and SG Highway";
const DESCRIPTION =
  "SSPACIA's three coworking centres in Ahmedabad: Agarwal Complex and Mercado on CG Road, Premier House on SG Highway. Cabins, desks, hourly rooms, virtual office.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${seoConfig.baseUrl}${PATH}` },
  openGraph: {
    title: `${TITLE} | SSPACIA`,
    description: DESCRIPTION,
    url: `${seoConfig.baseUrl}${PATH}`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "SSPACIA coworking centres in Ahmedabad" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "Which SSPACIA centre is closest to the city centre?",
    a: "Agarwal Complex (Navrangpura) and Mercado (Ellisbridge) are both on C.G. Road, Ahmedabad's central commercial street, within walking distance of Municipal Market, banks and CA offices.",
  },
  {
    q: "Which centre is best for a corporate or IT team?",
    a: "Premier House on S.G. Highway in Bodakdev sits in the corporate corridor, with a 40-seat event room and a 12-seat board room on the same floor as the cabins.",
  },
  {
    q: "Do the centres share the same plans and prices?",
    a: `Desk and cabin plans are the same across centres; cabin rent varies by centre and size. Room rates differ by room: meeting rooms from ${formatINR(400)}/hour, board rooms from ${formatINR(600)}/hour, the event room ${formatINR(2000)}/hour. Day passes are ${formatINR(BUSINESS.dayPassPrice)} + GST everywhere.`,
  },
  {
    q: "Can a member use more than one centre?",
    a: "Rooms at all three centres are on the same online calendar, so anyone can book a meeting at whichever centre suits the day. Ask the front desk about desk access at a second centre.",
  },
];

export default function LocationsPage() {
  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Locations", path: PATH }])} />
      <StructuredData data={faqSchema(FAQS)} />
      <LandingShell>
        <Breadcrumbs items={[{ name: "Locations", path: PATH }]} />
        <section className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#006064]">SSPACIA · Ahmedabad</span>
          <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-[#004D40] sm:text-4xl lg:text-5xl">
            Three coworking centres in Ahmedabad
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[#424242] sm:text-lg">
            Two on C.G. Road in the city centre and one on S.G. Highway in the corporate corridor. Every centre has desks, private cabins, meeting and board rooms bookable by the hour, 24/7 member access and a commercial address for company and GST registration.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {CENTRES.map((c) => (
            <article key={c.slug} className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#CFD8DC]/70 bg-white shadow-sm">
              <div className="relative h-52">
                <Image src={c.image} alt={`SSPACIA ${c.name}, ${c.area}, Ahmedabad`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#006064]">
                  {c.area}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <h2 className="text-xl font-bold text-[#1B1C1C]">{c.name}</h2>
                <p className="text-sm text-[#424242]">{c.tagline}.</p>
                <p className="flex items-start gap-1.5 text-xs text-[#616161]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1ab0bc]" /> {fullAddress(c)}
                </p>
                <ul className="text-xs text-[#424242]">
                  {c.rooms.map((r) => (
                    <li key={r.id}>
                      {r.name} · {r.capacity} seats · {formatINR(r.pricePerHour)}/hour
                    </li>
                  ))}
                  <li>Cabins for {c.workspaces.filter((w) => w.kind.endsWith("cabin")).map((w) => w.capacity).join(", ")} people</li>
                </ul>
                <Link
                  href={`/locations/${c.slug}`}
                  className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#006064] hover:text-[#004D40]"
                >
                  Centre details, map and rooms <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <FaqList title="Choosing a centre" items={FAQS} />

        <CtaBand
          title="Not sure which centre fits?"
          text="Tell us your team size and where your clients are; we will suggest a centre and set up a tour the same week."
          primary={{ label: "Book a free tour", href: "/book-online" }}
        />

        <RelatedLinks current="" />
      </LandingShell>
    </>
  );
}
