import Link from "next/link";
import { siteConfig } from "../config/site";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#CFD8DC] bg-[#F8F9FA]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-full bg-[#E0F7FA] px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#006064]">
            {siteConfig.site.tagline}
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-[#424242] sm:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-[#006064]"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={siteConfig.site.externalWebsite}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#006064] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
          >
            Visit Main Site
          </a>
        </nav>
      </div>
    </header>
  );
}

