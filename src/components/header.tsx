import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "../config/site";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#CFD8DC] bg-[#F8F9FA]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo - left */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/SspaciaLogo.png"
              alt={siteConfig.site.name}
              width={120}
              height={40}
              className="h-20 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        {/* Nav links - center */}
        <nav className="hidden sm:flex flex-1 justify-center items-center gap-6 text-md font-medium text-[#424242]">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative transition-colors hover:text-[#006064] group"
            >
              <span className="relative z-10">
                {item.label}
              </span>
              <span className="absolute left-0 bottom-0 w-full h-[2px] bg-[#006064] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
            </Link>
          ))}
        </nav>
        {/* Button - right */}
        <div className="hidden sm:flex">
          <a
            href={'/book-online'}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#006064] px-4 py-2 text-md font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
          >
            Book Now
          </a>
        </div>
      </div>
    </header>
  );
}