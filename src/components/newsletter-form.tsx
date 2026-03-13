"use client";

import type { SiteConfig } from "../config/site";

type NewsletterConfig = SiteConfig["newsletter"];

interface NewsletterFormProps {
  newsletter: NewsletterConfig;
}

export function NewsletterForm({ newsletter }: NewsletterFormProps) {
  return (
    <form
      className="flex w-full flex-col gap-3 text-sm sm:w-auto sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        alert(newsletter.successMessage);
      }}
    >
      <input
        type="email"
        required
        placeholder={newsletter.placeholder}
        className="h-10 flex-1 rounded-full border border-[#80DEEA] bg-white px-4 text-sm text-[#212121] placeholder:text-[#006064]/70 focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40 sm:w-72"
      />
      <button
        type="submit"
        className="h-10 rounded-full bg-[#006064] px-5 text-sm font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
      >
        {newsletter.ctaLabel}
      </button>
    </form>
  );
}

