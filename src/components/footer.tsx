import Link from "next/link";
import Image from "next/image";
import { Youtube } from "lucide-react";
import { siteConfig } from "../config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#CFD8DC] bg-[#F8F9FA]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 text-sm text-[#616161] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Image 
            src="/SspaciaLogo.png" 
            alt="Sspacia Logo" 
            width={80} 
            height={80} 
            className="h-16 w-auto object-contain"
          />
          <div>
            <p className="font-bold text-[#212121] text-base">{siteConfig.site.name}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#9E9E9E] mt-0.5">
              {siteConfig.site.copyright.replace("2024", year.toString())}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <a
            href={`mailto:${siteConfig.site.contact.email}`}
            className="transition-colors hover:text-[#006064] font-semibold text-[#424242]"
          >
            {siteConfig.site.contact.email}
          </a>
          <div className="hidden sm:block h-4 w-px bg-[#CFD8DC]" />
          <div className="flex gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#006064]">
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
            {siteConfig.site.social.youtube && (
              <Link
                href={siteConfig.site.social.youtube}
                target="_blank"
                className="transition-colors hover:text-[#006064]"
              >
                YouTube
              </Link>
            )}
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

