import Link from "next/link";
import { siteConfig } from "../config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#CFD8DC] bg-[#F8F9FA]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm text-[#616161] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="space-y-1 flex items-center gap-3">
          <img src="/SspaciaLogo.png" alt="Sspacia Logo" className="h-20 w-auto" />
          <div>
            <p className="font-medium text-[#212121]">{siteConfig.site.name}</p>
            <p className="text-xs">
              {siteConfig.site.copyright.replace("2024", year.toString())}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${siteConfig.site.contact.email}`}
            className="transition-colors hover:text-[#006064]"
          >
            {siteConfig.site.contact.email}
          </a>
          <div className="h-4 w-px bg-[#CFD8DC]" />
          <div className="flex gap-3 text-xs uppercase tracking-[0.2em]">
            <Link
              href={siteConfig.site.social.facebook}
              target="_blank"
              className="transition-colors hover:text-[#006064]"
            >
              Facebook
            </Link>
            <Link
              href={siteConfig.site.social.instagram}
              target="_blank"
              className="transition-colors hover:text-[#006064]"
            >
              Instagram
            </Link>
            {/* <Link
              href={siteConfig.site.social.twitter}
              target="_blank"
              className="transition-colors hover:text-[#006064]"
            >
              X
            </Link>
            <Link
              href={siteConfig.site.social.pinterest}
              target="_blank"
              className="transition-colors hover:text-[#006064]"
            >
              Pinterest
            </Link> */}
          </div>
        </div>
      </div>
    </footer>
  );
}

