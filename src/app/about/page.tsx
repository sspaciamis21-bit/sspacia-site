import type { Metadata } from "next";
import { siteConfig } from "../../config/site";

export const metadata: Metadata = {
  title: siteConfig.pages.about.title,
  description: siteConfig.about.shortDescription,
};

export default function AboutPage() {
  const { about } = siteConfig;

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#006064]">
          About {siteConfig.site.name}
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-[#212121] sm:text-4xl">
          {about.heading}
        </h1>
        <p className="max-w-2xl text-sm text-[#616161]">
          {about.shortDescription}
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-[1.4fr,1fr]">
        <div className="space-y-6 text-sm leading-relaxed text-[#424242]">
          <p>{about.fullDescription}</p>
          <p>{about.missionStatement}</p>
        </div>
        <aside className="space-y-4 rounded-2xl border border-[#CFD8DC] bg-white p-5 text-sm">
          <h2 className="text-sm font-semibold text-[#212121]">
            Who we&apos;re built for
          </h2>
          <ul className="mt-2 space-y-2 text-[#424242]">
            {about.targetAudience.map((audience) => (
              <li key={audience} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#006064]" />
                <span>{audience}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}

