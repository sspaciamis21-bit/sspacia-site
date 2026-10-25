import { seoConfig } from "@/config/seo";
import { BUSINESS, CENTRES, formatINR, fullAddress } from "@/config/centres";

export const revalidate = 3600;

/**
 * /llms.txt — a plain-text summary of SSPACIA for AI crawlers and assistants
 * (llmstxt.org convention). Facts here mirror src/config/centres.ts so they
 * always match the pages, the JSON-LD and Google Business Profiles.
 */
export function GET() {
  const base = seoConfig.baseUrl;
  const lines: string[] = [];

  lines.push("# SSPACIA Coworking, Ahmedabad");
  lines.push("");
  lines.push(
    "> SSPACIA runs three coworking and managed-office centres in Ahmedabad, Gujarat, India: Agarwal Complex and Mercado on C.G. Road, and Premier House on S.G. Highway (Bodakdev). It rents flexi desks, fixed desks, private cabins for 4–12 people, meeting rooms, board rooms, a 40-seat event room and virtual-office addresses. Rooms are bookable online by the hour; members have 24/7 access.",
  );
  lines.push("");
  lines.push(`Website: ${base}`);
  lines.push(`Phone / WhatsApp: ${BUSINESS.phoneDisplay}`);
  lines.push(`E-mail: ${BUSINESS.email}`);
  lines.push("Hours: members 24/7; rooms bookable online " + BUSINESS.roomSlotWindow);
  lines.push("Languages: English, Hindi, Gujarati");
  lines.push("");
  lines.push("## Centres");
  for (const c of CENTRES) {
    lines.push("");
    lines.push(`### ${c.name} (${c.area})`);
    lines.push(`- Page: ${base}/locations/${c.slug}`);
    lines.push(`- Address: ${fullAddress(c)}`);
    lines.push(`- Landmark: ${c.landmark}`);
    lines.push(`- Coordinates: ${c.geo.latitude}, ${c.geo.longitude}`);
    lines.push(`- Google Maps: ${c.googleMapsUrl}`);
    for (const r of c.rooms) {
      lines.push(`- ${r.name}: ${r.capacity} seats, ${formatINR(r.pricePerHour)} per hour + GST, book at ${base}/products/${r.id}`);
    }
    lines.push(
      `- Workspaces: ${c.workspaces.map((w) => `${w.name} (${w.capacity} ${w.capacity === 1 ? "seat" : "seats"})`).join(", ")} — monthly, rent quoted per cabin`,
    );
  }
  lines.push("");
  lines.push("## Prices (INR, exclusive of GST)");
  lines.push(`- Meeting rooms: ${formatINR(400)}–${formatINR(500)} per hour (4–6 seats)`);
  lines.push(`- Board rooms: ${formatINR(600)}–${formatINR(1000)} per hour (11–14 seats)`);
  lines.push(`- Event room: ${formatINR(2000)} per hour (40 seats, Premier House)`);
  lines.push(`- Day pass (flexi desk): ${formatINR(BUSINESS.dayPassPrice)}; weekly pass: ${formatINR(BUSINESS.weeklyPassPrice)}`);
  lines.push(`- Virtual office (business address, mail handling): ${formatINR(BUSINESS.virtualOfficeYearly)} per year`);
  lines.push("- Desks and private cabins: monthly plans, quoted after a tour");
  lines.push("");
  lines.push("## Key pages");
  lines.push(`- Meeting rooms on rent: ${base}/meeting-rooms-ahmedabad`);
  lines.push(`- Board rooms on rent: ${base}/board-rooms-ahmedabad`);
  lines.push(`- Event space / training room: ${base}/event-space-ahmedabad`);
  lines.push(`- Managed office space: ${base}/managed-office-space-ahmedabad`);
  lines.push(`- Coworking desks and cabins: ${base}/coworking-spaces`);
  lines.push(`- Rooms by the hour (live calendar): ${base}/guest-spaces`);
  lines.push(`- Virtual office: ${base}/virtual-office`);
  lines.push(`- Day and weekly passes: ${base}/passes`);
  lines.push(`- All centres: ${base}/locations`);
  lines.push(`- Book a tour: ${base}/book-online`);
  lines.push(`- Contact: ${base}/contact`);
  lines.push(`- Blog: ${base}/blog`);
  lines.push("");
  lines.push("## Inclusions");
  lines.push(
    "High-speed fibre Wi-Fi with backup, 24/7 access for members, air-conditioning, reception with mail and courier handling, daily housekeeping, unlimited tea and coffee, printing and scanning, meeting-room credits with cabin plans, tax invoice for every booking, commercial address usable for company and GST registration.",
  );
  lines.push("");
  lines.push("## Social");
  lines.push(`- Instagram: ${BUSINESS.social.instagram}`);
  lines.push(`- LinkedIn: ${BUSINESS.social.linkedin}`);
  lines.push(`- Facebook: ${BUSINESS.social.facebook}`);
  lines.push(`- YouTube: ${BUSINESS.social.youtube}`);
  lines.push("");
  lines.push(`Last updated: ${new Date().toISOString().slice(0, 10)}`);

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
