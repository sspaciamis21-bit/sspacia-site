import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../config/site";
import { BookOnlineForm } from "../../components/book-online-form";

export const metadata: Metadata = {
  title: siteConfig.pages.bookOnline.title,
  description:
    "Book your desk, cabin, or meeting room at SSPACIA's premium coworking spaces in Ahmedabad.",
};

export default function BookOnlinePage() {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006064]">
          Book Online
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl">
          Book a tour or workspace at SSPACIA
        </h1>
        <p className="max-w-2xl text-sm text-[#616161]">
          Share your details and preferred location, and our team will get in
          touch to confirm availability, pricing, and the best plan for your
          work style.
        </p>
      </header>

      <section className="grid gap-10 md:grid-cols-[1.1fr,0.9fr]">
        <BookOnlineForm />

        <aside className="space-y-6 rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] p-6 text-sm">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-[#212121]">
              Prefer to reach out directly?
            </h2>
            <p className="text-[#616161]">
              Email us and we&apos;ll help you choose the right plan for your
              work.
            </p>
          </div>
          <Link
            href={`mailto:${siteConfig.site.contact.email}`}
            className="inline-flex w-fit items-center justify-center rounded-full border border-[#006064] px-4 py-2 text-xs font-medium text-[#006064] transition hover:bg-[#E0F7FA]"
          >
            {siteConfig.site.contact.email}
          </Link>

          <div className="space-y-3 pt-3 text-xs text-[#616161]">
            <p className="font-semibold text-[#212121]">
              What happens after you submit
            </p>
            <ol className="space-y-1.5">
              <li>1. Our team reviews your requirements.</li>
              <li>2. We share available options and pricing.</li>
              <li>3. We schedule a tour or confirm your booking.</li>
            </ol>
          </div>
        </aside>
      </section>
    </div>
  );
}

