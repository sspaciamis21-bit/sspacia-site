"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import productsData from "@/config/products.json";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageSquare,
  Briefcase,
  ArrowRight,
  ChevronDown
} from "lucide-react";

interface CommitmentPeriods {
  [key: string]: number | null;
}

interface Workspace {
  type: string;
  commitment_periods: CommitmentPeriods;
  access_time: string;
  complementary_meeting_room: string | null;
  image: string;
}

interface GuestSpace {
  type: string;
  capacity: string;
  commitment_periods: CommitmentPeriods;
  image: string;
}

interface LocationData {
  location: string;
  workspaces: Workspace[];
  guest_spaces: GuestSpace[];
}

const locations = productsData as unknown as LocationData[];

interface BookOnlineFormProps {
  initialLocation?: string;
  initialSpaceType?: string;
  onSuccess?: () => void;
}

export function BookOnlineForm({ initialLocation = "", initialSpaceType = "", onSuccess }: BookOnlineFormProps) {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedSpaceType, setSelectedSpaceType] = useState(initialSpaceType);

  const spaceOptions = useMemo(() => {
    if (!selectedLocation) return [];
    const locationData = locations.find(l => l.location === selectedLocation);
    if (!locationData) return [];

    const workspaces = locationData.workspaces.map(w => ({
      label: w.type,
      category: "Professional Workspace"
    }));
    const guestSpaces = locationData.guest_spaces.map(g => ({
      label: g.type,
      category: "Meeting & Event Space"
    }));

    return [...workspaces, ...guestSpaces];
  }, [selectedLocation]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if(submitBtn) submitBtn.disabled = true;

    try {
      const response = await fetch('/api/book-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (response.ok) {
        toast.success("Thank you! Our community manager will reach out to you within 24 hours to confirm your booking.");
        form.reset();
        setSelectedLocation("");
        setSelectedSpaceType("");
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send');
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again later or contact us directly via email.");
    } finally {
      if(submitBtn) submitBtn.disabled = false;
    }
  };

  return (
    <form
      className="relative overflow-hidden group space-y-8 rounded-[2.5rem] border border-[#CFD8DC] bg-white p-8 lg:p-12 shadow-2xl shadow-[#006064]/10 transition-all duration-500"
      onSubmit={handleSubmit}
    >
      {/* Decorative Orbs */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#E0F2F1] blur-3xl opacity-50 group-hover:bg-[#B2DFDB] transition-colors duration-700" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-[#E0F7FA] blur-3xl opacity-50 group-hover:bg-[#B2EBF2] transition-colors duration-700" />

      <div className="relative z-10 space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#004D40]">Inquiry Form</h2>
        <p className="text-sm text-[#616161]">Tell us about your requirements and we&apos;ll craft the perfect plan for you.</p>
      </div>

      <div className="relative z-10 space-y-6">
        {/* Row 1: Name & Email */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 placeholder:text-[#BDBDBD]"
                placeholder="John Doe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 placeholder:text-[#BDBDBD]"
                placeholder="john@example.com"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Phone & Company */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 placeholder:text-[#BDBDBD]"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="company" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Company (Optional)
            </label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="company"
                name="company"
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 placeholder:text-[#BDBDBD]"
                placeholder="Inc. Company"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Location & Space Type */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="location" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Preferred Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <select
                id="location"
                name="location"
                required
                className="w-full appearance-none rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-10 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5"
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setSelectedSpaceType(""); // Reset space type when location changes
                }}
              >
                <option value="" disabled>Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.location} value={loc.location}>
                    {loc.location}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E] pointer-events-none" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="spaceType" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Interested Space
            </label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <select
                id="spaceType"
                name="spaceType"
                required
                disabled={!selectedLocation}
                className="w-full appearance-none rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-10 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 disabled:opacity-50"
                value={selectedSpaceType}
                onChange={(e) => setSelectedSpaceType(e.target.value)}
              >
                <option value="" disabled>
                  {!selectedLocation ? "Select Location First" : "Select Space Type"}
                </option>
                {spaceOptions.map((opt) => (
                  <option key={opt.label} value={opt.label}>
                    {opt.label} ({opt.category})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 4: Date & Time */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="date" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Visit Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="date"
                name="date"
                type="date"
                required
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="time" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
              Preferred Time
            </label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9E9E]" />
              <input
                id="time"
                name="time"
                type="time"
                required
                className="w-full rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5"
              />
            </div>
          </div>
        </div>

        {/* Row 5: Message */}
        <div className="space-y-2">
          <label htmlFor="message" className="text-[11px] font-bold uppercase tracking-wider text-[#00796B] ml-1">
            Additional Details
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-4 top-5 h-4 w-4 text-[#9E9E9E]" />
            <textarea
              id="message"
              name="message"
              rows={4}
              className="w-full resize-none rounded-2xl border border-[#CFD8DC] bg-[#F8F9FA] pl-11 pr-4 py-4 text-sm text-[#212121] outline-none transition focus:border-[#006064] focus:ring-4 focus:ring-[#006064]/5 placeholder:text-[#BDBDBD]"
              placeholder="Tell us about your team size, duration, or specific needs..."
            />
          </div>
        </div>

        <button
          type="submit"
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[1.25rem] bg-[#006064] px-6 py-5 text-base font-bold text-white shadow-xl shadow-[#006064]/20 transition-all hover:bg-[#004D40] hover:shadow-2xl active:scale-[0.98]"
        >
          <span className="relative z-10">Submit Inquiry</span>
          <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>

        <p className="px-2 text-[11px] text-[#757575] leading-relaxed text-center">
          By submitting, you agree to our terms. Our team will process your personal data in accordance with our Privacy Policy.
        </p>
      </div>
    </form>
  );
}
