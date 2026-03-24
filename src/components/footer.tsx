"use client";

import Link from "next/link";
import Image from "next/image";
import { Youtube, Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "../config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#CFD8DC] bg-[#F8F9FA] pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image 
                src="/SspaciaLogo.png" 
                alt="Sspacia Logo" 
                width={60} 
                height={60} 
                className="h-12 w-auto object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-[#212121]">
                {siteConfig.site.name}
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-[#616161] max-w-xs">
              {siteConfig.site.description}
            </p>
            <div className="flex gap-4 mt-2">
              <Link
                href={siteConfig.site.social.facebook}
                target="_blank"
                className="text-[#9E9E9E] hover:text-[#006064] transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </Link>
              <Link
                href={siteConfig.site.social.instagram}
                target="_blank"
                className="text-[#9E9E9E] hover:text-[#006064] transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </Link>
              {siteConfig.site.social.youtube && (
                <Link
                  href={siteConfig.site.social.youtube}
                  target="_blank"
                  className="text-[#9E9E9E] hover:text-[#006064] transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube size={20} />
                </Link>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#212121] mb-6">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-4">
              {siteConfig.navigation.map((item) => (
                <li key={item.label}>
                  <Link 
                    href={item.href}
                    className="text-sm text-[#616161] hover:text-[#006064] transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Spaces */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#212121] mb-6">
              Our Spaces
            </h3>
            <ul className="flex flex-col gap-4">
              {siteConfig.locations.map((location) => (
                <li key={location.id}>
                  <Link 
                    href={`/products#${location.id}`}
                    className="text-sm text-[#616161] hover:text-[#006064] transition-colors font-medium flex items-start gap-2"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    {location.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#212121] mb-6">
              Contact Us
            </h3>
            <ul className="flex flex-col gap-4">
              <li>
                <a 
                  href={`tel:${siteConfig.site.contact.phone}`}
                  className="text-sm text-[#616161] hover:text-[#006064] transition-colors font-medium flex items-center gap-2"
                >
                  <Phone size={16} />
                  +91 {siteConfig.site.contact.phone}
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${siteConfig.site.contact.email}`}
                  className="text-sm text-[#616161] hover:text-[#006064] transition-colors font-medium flex items-center gap-2"
                >
                  <Mail size={16} />
                  {siteConfig.site.contact.email}
                </a>
              </li>
              <li className="text-sm text-[#616161] leading-relaxed flex items-start gap-2">
                <MapPin size={16} className="mt-1 shrink-0" />
                <span>Ahmedabad, Gujarat, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-[#CFD8DC] flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#9E9E9E]">
            {siteConfig.site.copyright.replace("2026", year.toString())}
          </p>
        </div>
      </div>
    </footer>
  );
}


