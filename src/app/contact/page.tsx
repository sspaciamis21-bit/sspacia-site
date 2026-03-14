"use client";

import { siteConfig } from "../../config/site";
import Image from "next/image";
import { FadeUp } from "../../components/ui/fade-up";
import { SectionLabel } from "../../components/ui/section-label";
import { Mail, Phone, MapPin, Send, Instagram, Facebook, Twitter, Linkedin, ExternalLink } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="space-y-24 py-12">
      {/* ── Header ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E0F7FA] via-[#F8F9FA] to-[#E0F2F1] px-6 py-16 sm:px-12 sm:py-24">
        {/* Decorative blur orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#006064]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#4DB6AC]/15 blur-3xl" />
        
        <div className="relative z-10 text-center space-y-6">
          <FadeUp className="flex justify-center">
            <SectionLabel>
              <Mail className="h-3 w-3" /> Get In Touch
            </SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40] sm:text-6xl">
              Contact Us
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto max-w-2xl text-lg text-[#616161]">
              Have questions or want to book a tour? We&apos;d love to hear from you. 
              Reach out to our team or visit one of our prime locations in Ahmedabad.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <section className="grid gap-12 lg:grid-cols-2">
        {/* Contact Form */}
        <FadeUp>
          <div className="rounded-3xl border border-[#CFD8DC] bg-white p-8 shadow-2xl shadow-[#006064]/5 lg:p-12 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-[#006064]/5 pointer-events-none group-hover:text-[#006064]/10 transition-colors">
              <Send className="h-32 w-32 -rotate-12" />
            </div>
            
            <h2 className="mb-8 text-3xl font-bold text-[#212121]">Send us a Message</h2>
            <form className="space-y-6 relative z-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-semibold text-[#424242]">First Name</label>
                  <input id="firstName" type="text" className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition-all focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/10" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-semibold text-[#424242]">Last Name</label>
                  <input id="lastName" type="text" className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition-all focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/10" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-[#424242]">Email Address</label>
                <input id="email" type="email" className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition-all focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/10" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-semibold text-[#424242]">Subject</label>
                <input id="subject" type="text" className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition-all focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/10" placeholder="How can we help?" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-semibold text-[#424242]">Message</label>
                <textarea id="message" rows={5} className="w-full resize-none rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3.5 text-sm outline-none transition-all focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/10" placeholder="Your message here..."></textarea>
              </div>
              <button type="button" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#006064] px-6 py-4 text-base font-bold text-white shadow-xl shadow-[#006064]/30 transition-all hover:bg-[#007C91] hover:scale-[1.02] active:scale-[0.98]">
                Send Message
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </form>
          </div>
        </FadeUp>

        {/* Contact Info & Socials */}
        <div className="flex flex-col justify-between py-4">
          <FadeUp delay={0.2} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-[#212121]">Connect Directly</h3>
              <p className="text-lg text-[#616161]">
                Our team is here to help you find the perfect workspace.
              </p>
            </div>
            
            <div className="grid gap-6">
              <div className="group flex items-center gap-6 rounded-3xl border border-[#CFD8DC] bg-white p-6 transition-all hover:border-[#006064] hover:shadow-xl hover:shadow-[#006064]/5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#E0F2F1] text-[#006064] transition-all group-hover:bg-[#006064] group-hover:text-white group-hover:scale-110">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#757575]">Write to us</p>
                  <a href={`mailto:${siteConfig.site.contact.email}`} className="text-xl font-semibold text-[#212121] hover:text-[#006064]">
                    {siteConfig.site.contact.email}
                  </a>
                </div>
              </div>
              
              <div className="group flex items-center gap-6 rounded-3xl border border-[#CFD8DC] bg-white p-6 transition-all hover:border-[#006064] hover:shadow-xl hover:shadow-[#006064]/5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eceff1] text-[#455a64] transition-all group-hover:bg-[#455a64] group-hover:text-white group-hover:scale-110">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#757575]">Call us</p>
                  <p className="text-xl font-semibold text-[#212121]">
                    +91 (635) 949 9244
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 space-y-6">
              <h4 className="text-lg font-bold text-[#212121]">Follow Ahmedabad&apos;s best work community</h4>
              <div className="flex gap-4">
                {Object.entries(siteConfig.site.social).map(([network, url], i) => (
                  <FadeUp key={network} delay={0.3 + (i * 0.1)}>
                    <a href={url as string} target="_blank" rel="noreferrer" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#CFD8DC] text-[#424242] transition-all hover:border-[#006064] hover:text-[#006064] hover:shadow-2xl hover:scale-110">
                      <span className="sr-only">{network}</span>
                      {network === 'facebook' && <Facebook className="h-6 w-6" />}
                      {network === 'instagram' && <Instagram className="h-6 w-6" />}
                      {network === 'twitter' && <Twitter className="h-6 w-6" />}
                      {network === 'linkedin' && <Linkedin className="h-6 w-6" />}
                    </a>
                  </FadeUp>
                ))}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.5} className="mt-12 rounded-3xl bg-[#E0F7FA] p-8 text-[#006064]">
             <p className="font-bold">Available 24/7 for Members</p>
             <p className="mt-1 text-sm text-[#006064]/80">Our support team is available Mon-Sat, 9 AM - 8 PM for visitor tours and inquiries.</p>
          </FadeUp>
        </div>
      </section>

      {/* ── Locations with Maps ── */}
      <section className="space-y-12 pt-12 border-t border-[#CFD8DC]">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold tracking-tight text-[#212121]">Our Spaces in Ahmedabad</h2>
          <p className="mx-auto max-w-2xl text-lg text-[#616161]">
            Find us in the most connected hubs of the city.
          </p>
        </div>

        <div className="grid gap-20 pt-8">
          {siteConfig.locations.map((location, index) => (
            <FadeUp key={location.id} delay={index * 0.1} className={`flex flex-col gap-12 lg:items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
              
              {/* Info Side */}
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#006064]/20 bg-[#E0F7FA] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#006064]">
                    <MapPin className="h-4 w-4" />
                    <span>{location.name}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-[#212121]">{location.name}</h3>
                  <p className="text-lg leading-relaxed text-[#616161]">{location.description}</p>
                </div>
                
                <div className="group relative overflow-hidden rounded-3xl shadow-xl shadow-[#006064]/5 border border-[#CFD8DC]">
                  <Image 
                    src={location.image.src}
                    alt={location.image.alt}
                    width={600}
                    height={400}
                    className="h-64 w-full object-cover sm:h-80 transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <a 
                  href={location.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-center gap-2 text-base font-bold text-[#006064] hover:text-[#004D40]"
                >
                  <ExternalLink className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  Open in Google Maps
                </a>
              </div>
              
              {/* Map Embed Side */}
              <div className="w-full lg:w-[50%]">
                <div 
                  className="overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white p-4 shadow-2xl shadow-[#006064]/5 [&>iframe]:w-full [&>iframe]:h-[400px] lg:[&>iframe]:h-[550px] [&>iframe]:rounded-2xl"
                  dangerouslySetInnerHTML={{ __html: location.link.embed }}
                />
              </div>

            </FadeUp>
          ))}
        </div>
      </section>
    </div>
  );
}
