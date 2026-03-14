"use client";

import { siteConfig } from "../config/site";

export function BookOnlineForm() {
  const { locations } = siteConfig;

  return (
    <form
      className="space-y-6 rounded-3xl border border-[#CFD8DC] bg-white p-8 lg:p-12 text-sm shadow-xl shadow-[#006064]/5"
      onSubmit={(event) => {
        event.preventDefault();
        alert("Thank you! We will get back to you shortly.");
      }}
    >
      <h2 className="mb-6 text-2xl font-semibold text-[#212121]">Booking Request</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-[#424242]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[#424242]">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-[#424242]">
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
            placeholder="+91 ..."
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="company"
            className="text-sm font-medium text-[#424242]"
          >
            Company / Brand (optional)
          </label>
          <input
            id="company"
            name="company"
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
            placeholder="Your company name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="location"
          className="text-sm font-medium text-[#424242]"
        >
          Preferred location
        </label>
        <select
          id="location"
          name="location"
          className="w-full appearance-none rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
          defaultValue=""
        >
          <option value="" disabled>Select a location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium text-[#424242]">
            Preferred Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="time" className="text-sm font-medium text-[#424242]">
            Preferred Time
          </label>
          <input
            id="time"
            name="time"
            type="time"
            className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="requirements"
          className="text-sm font-medium text-[#424242]"
        >
          Requirements & Message
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={4}
          className="w-full resize-none rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 text-sm text-[#212121] placeholder:text-[#9E9E9E] outline-none transition focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
          placeholder="Share if you need dedicated desks, private cabins, meeting rooms, team size, dates, and any special needs."
        />
      </div>

      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-[#006064] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-[#006064]/30 transition hover:bg-[#007C91]"
      >
        Submit Request
      </button>

      <p className="text-[11px] text-[#757575]">
        By submitting, you agree to be contacted by the SSPACIA team about
        coworking options and availability.
      </p>
    </form>
  );
}

