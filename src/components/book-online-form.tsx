"use client";

import { siteConfig } from "../config/site";

export function BookOnlineForm() {
  const { locations } = siteConfig;

  return (
    <form
      className="space-y-4 rounded-2xl border border-[#CFD8DC] bg-white p-6 text-sm shadow-sm shadow-[#006064]/10"
      onSubmit={(event) => {
        event.preventDefault();
        alert("Thank you! We will get back to you shortly.");
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-xs font-medium text-[#424242]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            className="h-9 w-full rounded-md border border-[#CFD8DC] bg-white px-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-medium text-[#424242]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="h-9 w-full rounded-md border border-[#CFD8DC] bg-white px-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-medium text-[#424242]">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            required
            className="h-9 w-full rounded-md border border-[#CFD8DC] bg-white px-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
            placeholder="+91 ..."
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="company"
            className="text-xs font-medium text-[#424242]"
          >
            Company / Brand (optional)
          </label>
          <input
            id="company"
            name="company"
            className="h-9 w-full rounded-md border border-[#CFD8DC] bg-white px-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
            placeholder="Your company"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="location"
          className="text-xs font-medium text-[#424242]"
        >
          Preferred location
        </label>
        <select
          id="location"
          name="location"
          className="h-9 w-full rounded-md border border-[#CFD8DC] bg-white px-3 text-sm text-[#212121] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
          defaultValue={locations[0]?.id}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="requirements"
          className="text-xs font-medium text-[#424242]"
        >
          Requirements
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={4}
          className="w-full rounded-md border border-[#CFD8DC] bg-white px-3 py-2 text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:border-[#006064] focus:outline-none focus:ring-2 focus:ring-[#006064]/40"
          placeholder="Share if you need dedicated desks, private cabins, meeting rooms, team size, dates, and any special needs."
        />
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-[#006064] px-6 text-sm font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
      >
        Submit enquiry
      </button>

      <p className="text-[11px] text-[#757575]">
        By submitting, you agree to be contacted by the SSPACIA team about
        coworking options and availability.
      </p>
    </form>
  );
}

