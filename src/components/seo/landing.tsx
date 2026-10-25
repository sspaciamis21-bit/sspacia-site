import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, MapPin, MessageCircle, Phone, Users } from "lucide-react";
import { BUSINESS, CENTRES, Centre, Room, Workspace, formatINR, fullAddress } from "@/config/centres";

/*
 * Server-rendered building blocks for the SEO landing pages
 * (/meeting-rooms-ahmedabad, /board-rooms-ahmedabad, /event-space-ahmedabad,
 * /managed-office-space-ahmedabad, /locations/<centre>).
 *
 * No client-side state: every heading, price, address and FAQ answer is in the
 * HTML that Googlebot and AI crawlers receive on the first request.
 */

export interface Faq {
  q: string;
  a: string;
}

export interface Crumb {
  name: string;
  path: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-[#616161]">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-[#006064]">Home</Link>
        </li>
        {items.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {i === items.length - 1 ? (
              <span className="font-semibold text-[#004D40]" aria-current="page">{c.name}</span>
            ) : (
              <Link href={c.path} className="hover:text-[#006064]">{c.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LandingHero({
  eyebrow,
  title,
  intro,
  primary,
  secondary,
  facts,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  facts: string[];
}) {
  return (
    <section className="rounded-[2rem] border border-[#CFD8DC]/70 bg-white p-6 sm:p-10 shadow-sm">
      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#006064]">{eyebrow}</span>
      <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#004D40] leading-[1.1]">
        {title}
      </h1>
      <p className="mt-5 max-w-3xl text-base sm:text-lg leading-relaxed text-[#424242]">{intro}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={primary.href}
          className="inline-flex items-center gap-2 rounded-full bg-[#006064] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#004D40]"
        >
          {primary.label} <ArrowUpRight className="h-4 w-4" />
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#006064] bg-white px-6 py-3 text-sm font-bold text-[#006064] transition-colors hover:bg-[#E0F7FA]"
          >
            {secondary.label}
          </Link>
        )}
        <a
          href={BUSINESS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[#CFD8DC] bg-white px-5 py-3 text-sm font-semibold text-[#1B1C1C] transition-colors hover:border-[#1ab0bc]"
        >
          <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp {BUSINESS.phoneDisplay}
        </a>
      </div>
      <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#616161]">
        {facts.map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#1ab0bc]" /> {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SectionTitle({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  return (
    <div className="space-y-2">
      {kicker && <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#006064]">{kicker}</span>}
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#004D40]">{title}</h2>
      {intro && <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-[#616161]">{intro}</p>}
    </div>
  );
}

export function RoomCards({ items }: { items: { centre: Centre; room: Room }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ centre, room }) => (
        <article
          key={room.id}
          className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#CFD8DC]/70 bg-white shadow-sm"
        >
          <div className="relative h-52">
            <Image
              src={room.image}
              alt={`${room.name} for ${room.capacity} people at SSPACIA ${centre.name}, ${centre.area}, Ahmedabad`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#006064]">
              {centre.name} · {centre.area}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-[#1B1C1C]">
                {room.name} · {room.capacity} seater
              </h3>
              <p className="shrink-0 text-right">
                <span className="block text-xl font-black text-[#004D40]">{formatINR(room.pricePerHour)}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#616161]">per hour + GST</span>
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-[#616161]">
              <MapPin className="h-3.5 w-3.5 text-[#1ab0bc]" /> {centre.landmark}
            </p>
            <ul className="space-y-1.5 text-sm text-[#424242]">
              {room.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" /> {h}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Link
                href={`/products/${room.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#006064] px-4 py-2 text-xs font-bold text-white hover:bg-[#004D40]"
              >
                Book a slot <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/locations/${centre.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#CFD8DC] px-4 py-2 text-xs font-semibold text-[#004D40] hover:border-[#1ab0bc]"
              >
                About {centre.name}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function PriceTable({
  caption,
  rows,
}: {
  caption: string;
  rows: { centre: Centre; room: Room }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#CFD8DC]/70 bg-white">
      <table className="w-full text-left text-sm">
        <caption className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#616161]">
          {caption}
        </caption>
        <thead className="bg-[#E0F7FA]/50 text-xs uppercase tracking-wider text-[#004D40]">
          <tr>
            <th scope="col" className="px-5 py-3">Room</th>
            <th scope="col" className="px-5 py-3">Centre</th>
            <th scope="col" className="px-5 py-3">Seats</th>
            <th scope="col" className="px-5 py-3">Price per hour</th>
            <th scope="col" className="px-5 py-3">Booking</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ centre, room }) => (
            <tr key={room.id} className="border-t border-[#CFD8DC]/60">
              <td className="px-5 py-3 font-semibold text-[#1B1C1C]">{room.name}</td>
              <td className="px-5 py-3 text-[#424242]">
                <Link href={`/locations/${centre.slug}`} className="hover:text-[#006064]">
                  {centre.name}, {centre.area}
                </Link>
              </td>
              <td className="px-5 py-3 text-[#424242]">{room.capacity}</td>
              <td className="px-5 py-3 font-bold text-[#004D40]">{formatINR(room.pricePerHour)} + GST</td>
              <td className="px-5 py-3">
                <Link href={`/products/${room.id}`} className="font-semibold text-[#006064] hover:underline">
                  Book online
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WorkspaceCards({ items }: { items: { centre: Centre; workspace: Workspace }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ centre, workspace }) => (
        <article
          key={workspace.id}
          className="flex flex-col overflow-hidden rounded-[1.75rem] border border-[#CFD8DC]/70 bg-white shadow-sm"
        >
          <div className="relative h-48">
            <Image
              src={workspace.image}
              alt={`${workspace.name} for ${workspace.capacity} at SSPACIA ${centre.name}, ${centre.area}, Ahmedabad`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#006064]">
              {centre.name} · {centre.area}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-[#1B1C1C]">
              {workspace.name}
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E0F7FA] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#006064]">
                <Users className="h-3 w-3" /> {workspace.capacity} {workspace.capacity === 1 ? "seat" : "seats"}
              </span>
            </h3>
            <ul className="space-y-1.5 text-sm text-[#424242]">
              {workspace.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" /> {h}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <Link
                href={`/products/${workspace.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#006064] px-4 py-2 text-xs font-bold text-white hover:bg-[#004D40]"
              >
                View and enquire <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function Inclusions({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-[1.75rem] border border-[#CFD8DC]/70 bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold text-[#004D40]">{title}</h2>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 text-sm text-[#424242]">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1ab0bc]" /> {i}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CentreStrip({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <SectionTitle kicker="Three centres" title={title} />
      <div className="grid gap-5 md:grid-cols-3">
        {CENTRES.map((c) => (
          <Link
            key={c.slug}
            href={`/locations/${c.slug}`}
            className="group flex flex-col gap-2 rounded-2xl border border-[#CFD8DC]/70 bg-white p-5 transition-colors hover:border-[#1ab0bc]"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#006064]">{c.area}</span>
            <span className="text-lg font-bold text-[#1B1C1C] group-hover:text-[#006064]">{c.name}</span>
            <span className="text-xs leading-relaxed text-[#616161]">{fullAddress(c)}</span>
            <span className="mt-1 text-xs font-semibold text-[#006064]">
              {c.rooms.length} bookable rooms · {c.workspaces.filter((w) => w.kind.endsWith("cabin")).length} cabin sizes
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FaqList({ title, items }: { title: string; items: Faq[] }) {
  return (
    <section className="space-y-5">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#004D40]">{title}</h2>
      <div className="divide-y divide-[#CFD8DC]/70 rounded-2xl border border-[#CFD8DC]/70 bg-white">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[#1B1C1C] marker:content-none">
              <span>{f.q}</span>
              <span className="text-[#1ab0bc] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[#424242]">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand({ title, text, primary }: { title: string; text: string; primary: { label: string; href: string } }) {
  return (
    <section className="rounded-[2rem] bg-gradient-to-br from-[#004D40] to-[#006064] px-6 py-10 text-white sm:px-10">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm sm:text-base text-[#B2EBF2]">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={primary.href}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#004D40] hover:bg-[#B2EBF2]"
        >
          {primary.label} <ArrowUpRight className="h-4 w-4" />
        </Link>
        <a
          href={`tel:${BUSINESS.phoneE164}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
        >
          <Phone className="h-4 w-4" /> Call {BUSINESS.phoneDisplay}
        </a>
        <a
          href={BUSINESS.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
    </section>
  );
}

export const SERVICE_LINKS = [
  { label: "Meeting rooms on rent", href: "/meeting-rooms-ahmedabad" },
  { label: "Board rooms on rent", href: "/board-rooms-ahmedabad" },
  { label: "Event and training room", href: "/event-space-ahmedabad" },
  { label: "Managed office space", href: "/managed-office-space-ahmedabad" },
  { label: "Coworking desks and cabins", href: "/coworking-spaces" },
  { label: "Virtual office with GST address", href: "/virtual-office" },
  { label: "Day and weekly passes", href: "/passes" },
];

export function RelatedLinks({ current }: { current: string }) {
  return (
    <nav aria-label="Other SSPACIA services" className="rounded-2xl border border-[#CFD8DC]/70 bg-white p-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#006064]">Also at SSPACIA Ahmedabad</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SERVICE_LINKS.filter((l) => l.href !== current).map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex items-center gap-1 rounded-full border border-[#CFD8DC] px-3 py-1.5 text-xs font-semibold text-[#1B1C1C] hover:border-[#1ab0bc] hover:text-[#006064]"
            >
              {l.label} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function LandingShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-6 sm:px-6 lg:px-8 sm:py-10">{children}</div>;
}
