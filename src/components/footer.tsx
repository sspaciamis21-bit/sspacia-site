"use client";

import Link from "next/link";
import Image from "next/image";
import { Youtube, Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { siteConfig } from "../config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-low/50 pt-32 pb-12 border-t border-outline-variant/5">
      <div className="mx-auto max-w-[1440px] px-8">
        <div className="grid grid-cols-1 gap-24 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="flex flex-col gap-8">
            <Link href="/" className="flex items-center gap-4">
              <Image 
                src="/SspaciaLogo.png" 
                alt="Sspacia Logo" 
                width={80} 
                height={80} 
                className="h-14 w-auto object-contain"
              />
              <span className="text-2xl font-display font-bold tracking-tighter text-on-surface">
                {siteConfig.site.name}
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-tertiary max-w-xs font-light">
              {siteConfig.site.description}
            </p>
            <div className="flex gap-6 mt-2">
              <Link
                href={siteConfig.site.social.facebook}
                target="_blank"
                className="text-tertiary hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </Link>
              <Link
                href={siteConfig.site.social.instagram}
                target="_blank"
                className="text-tertiary hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </Link>
              {siteConfig.site.social.youtube && (
                <Link
                  href={siteConfig.site.social.youtube}
                  target="_blank"
                  className="text-tertiary hover:text-primary transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube size={18} />
                </Link>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:pl-12">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-10">
              Quick Links
            </h3>
            <ul className="flex flex-col gap-6">
              {siteConfig.navigation.map((item) => (
                <li key={item.label}>
                  <Link 
                    href={item.href}
                    className="text-xs text-tertiary hover:text-primary transition-all font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Spaces */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-10">
              Our Spaces
            </h3>
            <ul className="flex flex-col gap-6">
              {siteConfig.locations.map((location) => (
                <li key={location.id}>
                  <Link 
                    href={`/products#${location.id}`}
                    className="text-xs text-tertiary hover:text-primary transition-all font-bold uppercase tracking-widest opacity-60 hover:opacity-100 flex items-start gap-3"
                  >
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {location.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface mb-10">
              Contact Us
            </h3>
            <ul className="flex flex-col gap-6">
              <li>
                <a 
                  href={`tel:${siteConfig.site.contact.phone}`}
                  className="text-xs text-tertiary hover:text-primary transition-all font-bold uppercase tracking-widest opacity-60 hover:opacity-100 flex items-center gap-3"
                >
                  <Phone size={14} />
                  +91 {siteConfig.site.contact.phone}
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${siteConfig.site.contact.email}`}
                  className="text-xs text-tertiary hover:text-primary transition-all font-bold uppercase tracking-widest opacity-60 hover:opacity-100 flex items-center gap-3"
                >
                  <Mail size={14} />
                  {siteConfig.site.contact.email}
                </a>
              </li>
              <li className="text-xs text-tertiary leading-relaxed flex items-start gap-3 uppercase tracking-widest font-bold opacity-60">
                <MapPin size={14} className="mt-1 shrink-0" />
                <span>Ahmedabad, Gujarat, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-32 pt-10 border-t border-outline-variant/10 flex flex-col items-center gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[.4em] text-tertiary/40">
            {siteConfig.site.copyright.replace("2026", year.toString())}
          </p>
        </div>
      </div>
    </footer>
  );
}


