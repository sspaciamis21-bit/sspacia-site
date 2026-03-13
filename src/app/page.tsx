import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "../config/site";
import { NewsletterForm } from "../components/newsletter-form";

export default function Home() {
  const { hero, about, locations, features, blog, newsletter } = siteConfig;

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="grid gap-10 md:grid-cols-[1.1fr,0.9fr] md:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
            <span>{hero.brand}</span>
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            <span>Ahmedabad</span>
          </div>
          <div className="space-y-4">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-[#212121] sm:text-5xl md:text-6xl">
              {hero.heading}
            </h1>
            <p className="text-lg text-[#424242] sm:text-xl">
              {hero.subheading}
            </p>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[#616161]">
            {about.shortDescription}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={hero.ctaHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-[#006064] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
            >
              {hero.ctaLabel}
            </a>
            <Link
              href="/book-online"
              className="text-sm font-medium text-[#006064] underline-offset-4 hover:text-[#004D40] hover:underline"
            >
              Book a tour
            </Link>
          </div>
          <dl className="mt-4 grid gap-6 text-sm text-[#424242] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[#212121]">Perfect for</dt>
              <dd className="mt-1 text-[#616161]">
                {about.targetAudience.join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#212121]">Prime locations</dt>
              <dd className="mt-1 text-[#616161]">
                {locations.map((l) => l.name).join(" · ")}
              </dd>
            </div>
          </dl>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl bg-[#006064]/10 blur-3xl" />
          <div className="overflow-hidden rounded-3xl border border-[#006064]/30 bg-white shadow-2xl">
            <Image
              src={hero.heroImage.src}
              alt={hero.heroImage.alt}
              width={800}
              height={540}
              className="h-full w-full object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#212121] sm:text-3xl">
              Ahmedabad&apos;s premium coworking locations
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#616161]">
              Choose from three thoughtfully designed spaces across the city,
              each offering its own character while keeping the same SSPACIA
              warmth and professionalism.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {locations.map((location) => (
            <article
              key={location.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/10 transition hover:-translate-y-1 hover:border-[#006064] hover:shadow-lg"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={location.image.src}
                  alt={location.image.alt}
                  width={400}
                  height={260}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#000000]/30 via-transparent to-transparent" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
                <h3 className="text-sm font-semibold text-[#212121]">
                  {location.name}
                </h3>
                <p className="text-xs text-[#616161]">
                  {location.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#212121] sm:text-3xl">
              {siteConfig.featuresSection.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#616161]">
              {siteConfig.featuresSection.description}
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.features.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-col gap-2 rounded-2xl border border-[#CFD8DC] bg-white p-4 text-sm text-[#212121] shadow-sm shadow-[#006064]/5"
            >
              <p className="font-semibold">{feature.title}</p>
              <p className="text-xs text-[#616161]">
                Designed to support focused work, warm hospitality, and
                professional presence every day.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Blog */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#212121] sm:text-3xl">
              {blog.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#616161]">
              Learn more about coworking, community, and how SSPACIA can support
              your business growth.
            </p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {blog.posts.map((post) => (
            <a
              key={post.id}
              href={post.href}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#CFD8DC] bg-white shadow-sm shadow-[#006064]/5 transition hover:-translate-y-1 hover:border-[#006064] hover:shadow-lg"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={post.image.src}
                  alt={post.image.alt}
                  width={640}
                  height={360}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#000000]/30 via-transparent to-transparent" />
              </div>
              <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[#757575]">
                  <span>{post.author}</span>
                  <span className="h-[1px] w-6 bg-zinc-700" />
                  <span>{post.readTime}</span>
                </div>
                <h3 className="text-sm font-semibold text-[#212121] group-hover:text-[#006064]">
                  {post.title}
                </h3>
                <p className="text-xs text-[#616161]">{post.excerpt}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="rounded-2xl border border-[#B2EBF2] bg-gradient-to-r from-[#E0F7FA] via-[#E0F2F1] to-[#E0F7FA] px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-[#004D40] sm:text-2xl">
              {newsletter.heading}
            </h2>
            <p className="max-w-xl text-sm text-[#006064]">
              Get updates about new spaces, community events, and coworking
              insights straight to your inbox.
            </p>
          </div>
          <NewsletterForm newsletter={newsletter} />
        </div>
      </section>
    </div>
  );
}
