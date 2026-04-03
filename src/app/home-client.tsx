"use client";

import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "../config/site";
import { Hero } from "../components/ui/hero-with-group-of-images-text-and-two-buttons";
import { FaqSection } from "../components/faq-section";
import { motion } from "motion/react";
import {
  MapPin, Clock, Users, Coffee,
  Home as HomeIcon, Cpu, Tag, Wifi,
  ArrowUpRight, BookOpen,
} from "lucide-react";
import { FadeUp } from "../components/ui/fade-up";
import { SectionLabel } from "../components/ui/section-label";

const iconMap: Record<string, React.ReactNode> = {
  MapPin: <MapPin className="h-5 w-5" />,
  Clock: <Clock className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  Coffee: <Coffee className="h-5 w-5" />,
  Home: <HomeIcon className="h-5 w-5" />,
  Cpu: <Cpu className="h-5 w-5" />,
  Tag: <Tag className="h-5 w-5" />,
  Wifi: <Wifi className="h-5 w-5" />,
};

export default function HomeClient() {
  const { locations, features, blog } = siteConfig;

  return (
    <div className="space-y-24">
      {/* ── Hero ── */}
      <section className="relative left-1/2 -translate-x-1/2 w-screen">
        <Hero />
      </section>

      {/* ── LOCATIONS (Strategic Clusters) ── */}
      <section className="bg-surface-low py-48 relative mt-32">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex flex-col lg:flex-row gap-24 relative min-h-screen">
            {/* Vertical Timeline Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary-container/30 hidden lg:block"></div>
            
            <div className="w-full lg:w-1/2 lg:pr-24 lg:text-right">
              <div className="sticky top-48">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-8 text-on-surface leading-none">Strategic<br/>Clusters</h2>
                  <p className="text-tertiary max-w-sm lg:ml-auto text-base font-light">
                    Ahmedabad&apos;s premium coworking locations. Choose from three thoughtfully designed spaces across the city.
                  </p>
                </motion.div>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 flex flex-col gap-48 pb-32">
              {locations.map((location, i) => (
                <motion.div
                  key={location.id}
                  className={`relative group ${i % 2 !== 0 ? "lg:mt-32" : ""}`}
                  initial={{ opacity: 0, y: 100 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                >
                  <div className="absolute -left-[53px] top-4 w-10 h-10 bg-surface rounded-full border-2 border-primary-container z-10 hidden lg:flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary-container rounded-full pulse-node"></div>
                  </div>
                  <div className="bg-surface p-10 shadow-[0_20px_50px_rgba(27,28,28,0.05)] hover:shadow-[0_40px_80px_rgba(0,105,111,0.15)] transition-all duration-700 transform hover:-translate-y-4 border border-outline-variant/5">
                    <span className="text-[10px] font-sans uppercase tracking-[0.3em] text-primary mb-4 block font-bold">Cluster 0{i+1}</span>
                    <h3 className="font-display text-2xl md:text-3xl font-bold mb-4 text-on-surface group-hover:text-primary transition-colors">{location.name}</h3>
                    <p className="text-tertiary mb-8 text-sm font-light leading-relaxed">{location.description}</p>
                    <div className="relative overflow-hidden mb-10 h-64 grayscale group-hover:grayscale-0 transition-all duration-1000">
                      <Image
                        src={location.image.src}
                        alt={location.image.alt}
                        fill
                        className="object-cover transform group-hover:scale-110 transition-transform duration-[2000ms]"
                      />
                    </div>
                    <a href={location.link.href} target="_blank" rel="noreferrer" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 group/btn text-primary border-b border-primary/20 pb-1 w-fit">
                      Explore Cluster <ArrowUpRight className="text-sm group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (Refined Amenities) ── */}
      <section className="max-w-6xl mx-auto px-8 mb-64 mt-48">
        <div className="flex flex-col lg:flex-row gap-24 items-start">
          <div className="lg:w-1/3 relative lg:sticky lg:top-48">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl"></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <Image 
                src="/Pictures/Reception.jpeg" 
                alt="Premium amenities" 
                width={500} height={600} 
                className="w-full aspect-[4/5] object-cover shadow-[0_30px_60px_rgba(27,28,28,0.15)]"
              />
              <div className="absolute -bottom-10 -right-10 bg-surface-lowest p-8 md:p-10 max-w-[230px] shadow-[0_30px_60px_rgba(0,105,111,0.15)] border-l-4 border-primary z-10">
                <p className="text-xs font-sans leading-relaxed text-on-surface font-bold italic tracking-wide">
                  &quot;Engineered for cognitive focus. Our sensory environments include bespoke blend bars.&quot;
                </p>
              </div>
            </motion.div>
          </div>
          
          <div className="lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.4em] text-primary mb-6 block font-bold">Refined Amenities</span>
              <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-10 text-on-surface">
                {siteConfig.featuresSection.heading}
              </h2>
              <p className="text-lg text-tertiary font-light mb-12 max-w-lg">
                {siteConfig.featuresSection.description}
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-y-24">
              {features.map((feature: { id: string, icon: string, title: string, description: string }, i: number) => (
                <motion.div 
                  key={feature.id} 
                  className={`border-l border-primary-container/20 pl-8 py-4 ${i % 2 !== 0 ? "lg:translate-y-24" : ""}`}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                >
                  <h4 className="font-display text-xl font-bold mb-4 text-on-surface flex items-center gap-3">
                    <span className="text-primary">{iconMap[feature.icon] ?? <span className="h-5 w-5" />}</span>
                    {feature.title}
                  </h4>
                  <p className="text-tertiary text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MEMBERSHIP MODELS ── */}
      {/* <section className="max-w-6xl mx-auto px-8 py-32">
        <motion.h2 
          className="font-display text-4xl font-bold mb-16 tracking-tighter text-on-surface"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
        >
          Membership Models
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-1 md:grid-rows-2 gap-4 h-auto md:h-[700px]">
          <motion.div 
            className="md:col-span-2 md:row-span-2 bg-primary text-white p-12 flex flex-col justify-between"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <span className="text-[10px] font-sans uppercase tracking-widest opacity-60 font-bold">Professional</span>
              <h3 className="font-display text-4xl md:text-5xl font-bold mt-4 leading-none">The Studio <br/>Resident</h3>
            </div>
            <div className="space-y-6 mt-12 md:mt-0">
              <p className="text-base opacity-80 max-w-sm">Full access to all clusters, dedicated desk, and priority boardroom booking.</p>
              <button className="liquid-hover bg-white text-primary px-8 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Join Network</button>
            </div>
          </motion.div>
          <motion.div 
            className="md:col-span-2 md:row-span-1 bg-surface-container-high p-10 flex flex-col justify-between border border-outline-variant/10"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="font-display text-2xl font-bold text-on-surface">Flex Nomad</h3>
            <div className="flex justify-between items-end mt-8 md:mt-0">
              <p className="text-xs text-tertiary max-w-[200px]">Hot-desk privileges across any Sspacia location for 10 days/month.</p>
              <span className="font-display text-3xl font-light text-primary-container">/01</span>
            </div>
          </motion.div>
          <motion.div 
            className="md:col-span-1 md:row-span-1 bg-secondary-container p-8 flex flex-col justify-between border border-outline-variant/10"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="font-display text-xl font-bold text-on-secondary-container">Virtual Office</h3>
            <p className="text-[10px] text-on-secondary-container/70 mt-4 md:mt-0 leading-relaxed">Premium mailing address and monthly lobby access.</p>
          </motion.div>
          <motion.div 
            className="md:col-span-1 md:row-span-1 bg-surface-lowest p-8 flex flex-col justify-between border-t-4 border-t-primary-container border border-outline-variant/10"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="font-display text-xl font-bold text-on-surface">Corporate</h3>
            <p className="text-[10px] text-tertiary mt-4 md:mt-0 leading-relaxed">Custom suites for teams of 10 to 50 members.</p>
          </motion.div>
        </div>
      </section> */}

      {/* ── FINAL CTA ── */}
      <section className="py-48 px-8 text-center bg-surface-lowest border-y border-outline-variant/10 mb-32">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-6xl md:text-8xl font-bold tracking-tighter mb-10 text-on-surface">Built Different.</h2>
          <p className="text-lg text-tertiary mb-16 font-light">Join the architectural shift in workspace design.</p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button className="liquid-hover bg-primary-container text-on-primary-container px-10 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Schedule Walkthrough</button>
            <button className="px-10 py-4 border border-outline font-display font-bold uppercase tracking-widest text-[10px] hover:bg-surface-container-high transition-colors text-on-surface">Contact Relations</button>
          </div>
        </motion.div>
      </section>

      {/* ── BLOG ── */}
      <section className="max-w-6xl mx-auto px-8 space-y-12">
        <FadeUp className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <SectionLabel>
              <BookOpen className="h-3 w-3" /> Articles
            </SectionLabel>
            <h2 className="font-display text-4xl font-bold tracking-tight text-on-surface sm:text-5xl lg:ml-[-1rem]">
              {blog.heading}
            </h2>
            <p className="max-w-xl text-base text-tertiary">
              Learn more about coworking, community, and how SSPACIA can support
              your business growth.
            </p>
          </div>
          <Link
            href="/blog"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-sm bg-primary-container px-6 py-3 text-sm font-bold text-on-primary-container transition-all hover:bg-primary hover:text-white"
          >
            All articles <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </FadeUp>

        <div className="grid gap-8 lg:grid-cols-2">
          {blog.posts.slice(0, 2).map((post, i) => (
            <FadeUp key={post.id} delay={i * 0.1} className={i % 2 !== 0 ? "lg:mt-16" : ""}>
              <motion.a
                href={post.href}
                className="group flex flex-col overflow-hidden rounded-sm bg-surface-lowest shadow-[0_20px_50px_rgba(27,28,28,0.05)] transition-all"
                whileHover={{ y: -6, boxShadow: "0 30px 60px -12px rgba(0,105,111,0.15)" }}
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={post.image.src}
                    alt={post.image.alt}
                    width={720}
                    height={400}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-8">
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-outline-variant">
                    <span>{post.author}</span>
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <span>{post.readTime}</span>
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <span>
                      {new Date(post.date).toLocaleString("en-US", {
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight text-on-surface transition group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-tertiary">
                    {post.excerpt}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    Read article <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </span>
                </div>
              </motion.a>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-6xl mx-auto px-8">
        <FaqSection />
      </section>
    </div>
  );
}
