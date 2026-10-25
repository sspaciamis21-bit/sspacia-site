import type { Metadata } from "next";
import Link from "next/link";
import { seoConfig } from "@/config/seo";
import { BUSINESS, CENTRES, cabins } from "@/config/centres";
import { StructuredData } from "@/components/structured-data";
import { breadcrumbSchema, faqSchema, serviceSchema } from "@/lib/seo-schema";
import {
  Breadcrumbs,
  CentreStrip,
  CtaBand,
  FaqList,
  Inclusions,
  LandingHero,
  LandingShell,
  RelatedLinks,
  SectionTitle,
  WorkspaceCards,
  type Faq,
} from "@/components/seo/landing";

export const revalidate = 3600;

const PATH = "/managed-office-space-ahmedabad";
const TITLE = "Managed Office Space in Ahmedabad – Private Cabins for 4 to 12 People";
const DESCRIPTION =
  "Managed office space in Ahmedabad: furnished private cabins for 4–12 people at CG Road and SG Highway with reception, internet and housekeeping on one bill.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${seoConfig.baseUrl}${PATH}` },
  openGraph: {
    title: `${TITLE} | SSPACIA`,
    description: DESCRIPTION,
    url: `${seoConfig.baseUrl}${PATH}`,
    type: "website",
    images: [{ url: `${seoConfig.baseUrl}/og-image.jpg`, width: 1200, height: 630, alt: "Managed office space in Ahmedabad – SSPACIA" }],
  },
};

const FAQS: Faq[] = [
  {
    q: "What is a managed office at SSPACIA?",
    a: "A private, lockable, furnished cabin for your team inside a SSPACIA centre, with the whole office run for you: reception, housekeeping, internet, air-conditioning, tea and coffee, printing, meeting-room credits and 24/7 access, billed as one monthly invoice. You bring laptops and people; everything else is managed.",
  },
  {
    q: "What cabin sizes are available in Ahmedabad?",
    a: "Dedicated cabins for 4 (Agarwal Complex and Premier House) and 6 (Mercado), private cabins for 8 at all three centres, and executive cabins for 10 (Agarwal Complex, Premier House) and 12 (Mercado). Larger teams can take adjoining cabins at one centre.",
  },
  {
    q: "How is a managed office different from a coworking desk?",
    a: "A desk membership gives one person a seat in a shared area. A managed office gives your team a private cabin with its own door, your name on it, storage and quiet, while sharing the centre's reception, meeting rooms and pantry. It replaces a conventional office lease with no fit-out, no vendors to manage and no long lock-in.",
  },
  {
    q: "Can I register my company or GST at the address?",
    a: "Yes. All three centres are commercial addresses on CG Road and SG Highway and are used by members for company registration, GST registration and official correspondence. The front desk receives mail and couriers in your company's name.",
  },
  {
    q: "What does a managed office cost?",
    a: "Rent is quoted per cabin and depends on the centre, cabin size and term. Book a tour, and you will have a written proposal with the monthly rent, inclusions and terms on the same day.",
  },
  {
    q: "How quickly can my team move in?",
    a: "Cabins are furnished and connected, so a team can move in within days of signing. Sign-up, agreement, invoicing and support tickets are handled on the SSPACIA online platform.",
  },
  {
    q: "Which centre should I choose?",
    a: "Agarwal Complex and Mercado are on C.G. Road in the city centre, close to CA firms, banks and courts. Premier House is on S.G. Highway in Bodakdev, the corporate and IT corridor, with the 40-seat event room on the same floor.",
  },
];

export default function ManagedOfficePage() {
  const allCabins = cabins();

  return (
    <>
      <StructuredData data={breadcrumbSchema([{ name: "Managed office space in Ahmedabad", path: PATH }])} />
      <StructuredData
        data={serviceSchema({
          name: "Managed office space in Ahmedabad",
          serviceType: "Managed office space / serviced office",
          description: DESCRIPTION,
          path: PATH,
          offers: allCabins.map(({ centre, workspace }) => ({
            name: `${workspace.name} for ${workspace.capacity} – ${centre.name}, ${centre.area}`,
            url: `${seoConfig.baseUrl}/products/${workspace.id}`,
          })),
        })}
      />
      <StructuredData data={faqSchema(FAQS)} />

      <LandingShell>
        <Breadcrumbs items={[{ name: "Managed office space in Ahmedabad", path: PATH }]} />

        <LandingHero
          eyebrow="SSPACIA · Ahmedabad"
          title="Managed office space in Ahmedabad for teams of 4 to 12"
          intro="SSPACIA runs fully managed offices at three centres in Ahmedabad: private, furnished cabins for 4, 6, 8, 10 and 12 people at Agarwal Complex and Mercado on C.G. Road and at Premier House on S.G. Highway. Reception, housekeeping, fibre internet, air-conditioning, tea and coffee, meeting-room credits and 24/7 access are included in one monthly bill, and the address can carry your company and GST registration."
          primary={{ label: "Book a tour", href: "/book-online" }}
          secondary={{ label: "Browse all cabins", href: "/coworking-spaces" }}
          facts={["Furnished private cabins", "4 to 12 seats", "One monthly invoice", "GST-registrable address", "Move in within days"]}
        />

        <section className="space-y-6">
          <SectionTitle
            kicker="Inventory"
            title="Nine cabin options across three centres"
            intro="Every cabin is a private glass office with a lockable door, inside a staffed centre. Rent is quoted per cabin; the proposal follows your tour the same day."
          />
          <WorkspaceCards items={allCabins} />
        </section>

        <div className="overflow-x-auto rounded-2xl border border-[#CFD8DC]/70 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#616161]">
              Managed office cabins in Ahmedabad at SSPACIA, by centre and team size
            </caption>
            <thead className="bg-[#E0F7FA]/50 text-xs uppercase tracking-wider text-[#004D40]">
              <tr>
                <th scope="col" className="px-5 py-3">Centre</th>
                <th scope="col" className="px-5 py-3">Dedicated cabin</th>
                <th scope="col" className="px-5 py-3">Private cabin</th>
                <th scope="col" className="px-5 py-3">Executive cabin</th>
                <th scope="col" className="px-5 py-3">Rooms on the floor</th>
              </tr>
            </thead>
            <tbody>
              {CENTRES.map((c) => {
                const size = (kind: string) => c.workspaces.find((w) => w.kind === kind)?.capacity;
                return (
                  <tr key={c.slug} className="border-t border-[#CFD8DC]/60">
                    <td className="px-5 py-3 font-semibold text-[#1B1C1C]">
                      <Link href={`/locations/${c.slug}`} className="hover:text-[#006064]">
                        {c.name}, {c.area}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#424242]">{size("dedicated-cabin")} seats</td>
                    <td className="px-5 py-3 text-[#424242]">{size("private-cabin")} seats</td>
                    <td className="px-5 py-3 text-[#424242]">{size("executive-cabin")} seats</td>
                    <td className="px-5 py-3 text-[#424242]">
                      {c.rooms.map((r) => `${r.name} (${r.capacity})`).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Inclusions
          title="Included in every managed office"
          items={[
            "Furnished cabin: desks, ergonomic chairs, storage, lockable door",
            "Reception and front desk: visitors, mail and couriers handled in your name",
            "Daily housekeeping and maintenance",
            "High-speed fibre internet with backup line",
            "Air-conditioning, electricity and common-area upkeep",
            "Meeting-room credits every month; extra hours at member rates",
            "Unlimited tea and coffee; printing and scanning at the front desk",
            "24/7 access for your team",
            "Commercial address for company and GST registration",
            "Online member platform for agreements, invoices and support tickets",
          ]}
        />

        <CentreStrip title="Choose your centre" />

        <FaqList title="Managed offices in Ahmedabad: questions people ask" items={FAQS} />

        <CtaBand
          title="See the cabins this week"
          text={`Tours run every working day at all three centres. Call ${BUSINESS.phoneDisplay} or book online; you will have a written proposal with rent and inclusions the same day.`}
          primary={{ label: "Book a tour", href: "/book-online" }}
        />

        <RelatedLinks current={PATH} />
      </LandingShell>
    </>
  );
}
