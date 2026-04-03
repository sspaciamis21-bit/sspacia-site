"use client";

import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import { FadeUp } from "@/components/ui/fade-up";
import { Send, Facebook, Instagram, Youtube, ExternalLink } from "lucide-react";

export default function ContactClient() {
  return (
    <div className="space-y-24 py-24 pb-12 max-w-7xl mx-auto px-6 md:px-12">
      {/* ── Hero: Reach Out ── */}
      <section className="relative min-h-[50vh] flex items-center">
        <div className="relative z-10 w-full">
            <FadeUp className="space-y-10">
              <div className="flex items-center gap-4">
                <span className="h-[1px] w-12 bg-primary"></span>
                <span className="font-sans text-[10px] uppercase tracking-[0.6em] text-primary font-bold">
                  Connection Points
                </span>
              </div>
              
              <h1 className="font-display text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-on-surface max-w-4xl">
                Reach <br />
                <span className="text-primary italic">Out.</span>
              </h1>
              
              <div className="grid lg:grid-cols-2 gap-16 pt-8">
                <p className="text-xl md:text-2xl leading-tight text-on-surface font-medium max-w-xl">
                  Have questions or want to book a tour? Ahmedabad&apos;s most dynamic support team is ready.
                </p>
                <div className="flex items-start">
                  <p className="text-lg leading-relaxed text-tertiary font-light max-w-md border-l-2 border-primary/20 pl-8">
                    Visit our workspace environments or connect digitally for a guided spatial overview.
                  </p>
                </div>
              </div>
            </FadeUp>
        </div>
      </section>

      {/* ── Main Interface: Tonal Contrast ── */}
      <section className="relative">
        <div className="grid gap-16 md:grid-cols-2 lg:items-start">
          {/* Contact form */}
          <div className="order-2 md:order-1">
            <FadeUp>
              <div className="bg-white p-8 lg:p-16 shadow-[0_40px_100px_rgba(0,105,111,0.06)] relative overflow-hidden group border border-outline-variant/10 rounded-sm">
                <h2 className="font-display text-4xl font-bold tracking-tighter text-on-surface mb-2">Send a Message</h2>
                <p className="text-tertiary mb-12 font-light uppercase tracking-widest text-[9px]">Response Target / 24 Hours</p>

                <form 
                  className="space-y-10 relative z-10"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    
                    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
                    if(submitBtn) submitBtn.disabled = true;

                    try {
                      const response = await fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                      });
                      
                      if (response.ok) {
                        toast.success("Thank you! Your message has been sent.");
                        form.reset();
                      } else {
                        throw new Error('Failed to send');
                      }
                    } catch {
                      toast.error("Something went wrong. Please try again.");
                    } finally {
                      if(submitBtn) submitBtn.disabled = false;
                    }
                  }}
                >
                  <div className="grid gap-10 sm:grid-cols-2">
                    <div className="space-y-1 group">
                      <label htmlFor="firstName" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 transition-colors font-sans">First Name</label>
                      <input id="firstName" name="firstName" required type="text" className="w-full rounded-none border-b border-outline-variant/30 bg-transparent px-0 py-3 text-lg outline-none transition-all focus:border-primary text-on-surface placeholder:text-tertiary/20" placeholder="John" />
                    </div>
                    <div className="space-y-1 group">
                      <label htmlFor="lastName" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 transition-colors font-sans">Last Name</label>
                      <input id="lastName" name="lastName" type="text" className="w-full rounded-none border-b border-outline-variant/30 bg-transparent px-0 py-3 text-lg outline-none transition-all focus:border-primary text-on-surface placeholder:text-tertiary/20" placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-1 group">
                    <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 transition-colors font-sans">Digital Handle (Email)</label>
                    <input id="email" name="email" required type="email" className="w-full rounded-none border-b border-outline-variant/30 bg-transparent px-0 py-3 text-lg outline-none transition-all focus:border-primary text-on-surface placeholder:text-tertiary/20" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1 group">
                    <label htmlFor="message" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 transition-colors font-sans">Inquiry Context</label>
                    <textarea id="message" name="message" required rows={3} className="w-full resize-none rounded-none border-b border-outline-variant/30 bg-transparent px-0 py-3 text-lg outline-none transition-all focus:border-primary text-on-surface placeholder:text-tertiary/20" placeholder="Describe your spatial needs..."></textarea>
                  </div>
                  
                  <button type="submit" className="flex items-center justify-center gap-6 bg-primary px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] text-white shadow-xl transition-all hover:bg-primary-container disabled:opacity-50 active:scale-95 rounded-sm">
                    Dispatch Message
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </FadeUp>
          </div>

          {/* Info Panels */}
          <div className="order-1 md:order-2 space-y-12 md:pl-10">
            <FadeUp delay={0.2} className="space-y-10">
              <div className="space-y-6">
                <h3 className="font-display text-5xl font-bold tracking-tighter text-on-surface">Let&apos;s talk.</h3>
                <p className="text-xl text-tertiary font-light leading-relaxed">
                  Our ecosystem thrives on direct communication. Select your preferred channel for immediate engagement.
                </p>
              </div>
              
              <div className="grid gap-10">
                <div className="space-y-2">
                   <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary">Direct Mail</p>
                   <a href={`mailto:${siteConfig.site.contact.email}`} className="text-xl font-display font-medium text-on-surface hover:text-primary transition-colors">
                      {siteConfig.site.contact.email}
                   </a>
                </div>
                
                <div className="space-y-2">
                   <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-primary">Voice Comms</p>
                   <a href="tel:+917600393779" className="text-2xl font-display font-bold text-on-surface hover:text-primary transition-colors">
                      +91 76003 93779
                   </a>
                </div>
              </div>

              <div className="pt-8 space-y-6">
                <h4 className="font-sans text-[10px] uppercase tracking-[0.4em] font-bold text-tertiary/70">Social Network</h4>
                <div className="flex gap-4">
                  {Object.entries(siteConfig.site.social).map(([network, url]) => (
                    <a key={network} href={url as string} target="_blank" rel="noreferrer" className="flex h-12 w-12 items-center justify-center bg-white border border-outline-variant/10 text-tertiary transition-all hover:bg-primary hover:text-white rounded-none">
                      {network === 'facebook' && <Facebook className="h-4 w-4" />}
                      {network === 'instagram' && <Instagram className="h-4 w-4" />}
                      {network === 'youtube' && <Youtube className="h-4 w-4" />}
                    </a>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Locations: Physical Coordinates ── */}
      <section className="space-y-16">
        <FadeUp className="space-y-6">
           <div className="flex items-center gap-4">
            <span className="h-[1px] w-12 bg-primary"></span>
            <span className="font-sans text-[10px] uppercase tracking-[0.6em] text-primary font-bold">Physical Coordinates</span>
          </div>
          <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter text-on-surface leading-none">Our Hubs.</h2>
        </FadeUp>

        <div className="grid gap-32">
          {siteConfig.locations.map((location, index) => (
            <FadeUp key={location.id} delay={0.1} className={`grid gap-16 lg:grid-cols-12 lg:items-center`}>
              {/* Map Embed */}
              <div className={`lg:col-span-8 ${index % 2 !== 0 ? 'lg:order-2' : ''}`}>
                 <div className="relative aspect-video shadow-[0_40px_100px_rgba(0,105,111,0.1)] rounded-none overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 border border-outline-variant/10">
                    <div className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: location.link.embed }}
                    />
                 </div>
              </div>
              
              {/* Info Block */}
              <div className={`lg:col-span-4 space-y-8 ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
                <div className="space-y-6">
                  <span className="text-[10px] font-sans font-bold text-primary tracking-[0.4em]">LOC / 0{index + 1}</span>
                  <h3 className="font-display text-4xl font-bold tracking-tighter text-on-surface">{location.name}</h3>
                  <p className="text-lg leading-relaxed text-tertiary font-light">{location.description}</p>
                </div>
                
                <a 
                  href={location.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface border-b-2 border-primary/20 hover:border-primary transition-all py-2"
                >
                  Navigate to Space
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>
    </div>
  );
}
