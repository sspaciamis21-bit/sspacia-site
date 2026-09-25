"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Globe,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  Check,
  AlertCircle,
  Lock,
  LayoutDashboard,
  Calendar,
  Sparkles,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/ui/auth-modal";
import { toast } from "sonner";
import { CentreData } from "../centres-data";

interface CentreCheckoutClientProps {
  centre: CentreData;
}

export default function CentreCheckoutClient({ centre }: CentreCheckoutClientProps) {
  const { user } = useAuth();

  // Form States
  const [companyName, setCompanyName] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [usagePurpose, setUsagePurpose] = useState<string>("MAILING_ONLY");
  const [hoAddress, setHoAddress] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      if (user.name) setContactName((prev) => prev || user.name || "");
      if (user.email) setContactEmail((prev) => prev || user.email || "");
      const phone = user.phone || (user as any).contactNumber || "";
      if (phone) setContactPhone((prev) => prev || phone);
      if (user.companyName) setCompanyName((prev) => prev || user.companyName || "");
    }
  }, [user]);

  // Validation
  const validateForm = () => {
    if (!companyName.trim()) {
      setErrorMsg("Please enter your Company or Business Name");
      return false;
    }
    if (!contactName.trim()) {
      setErrorMsg("Please enter the Contact Person name");
      return false;
    }
    const cleanPhone = contactPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return false;
    }
    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      setErrorMsg("Please enter a valid business email address");
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Submit Order Execution
  const executeOrderSubmission = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/public/virtual-office/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim().toLowerCase(),
          centreKey: centre.id,
          duration: "1 Year (Annual)",
          planMonths: 12,
          rate: 24000,
          amount: 24000,
          gstPercent: 0,
          totalAmount: 24000,
          hoAddress: hoAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process Virtual Office order.");
      }

      setBookingConfirmation(data.data);
      toast.success("Virtual Office activated successfully! Welcome to SSPACIA.");
      // Scroll to confirmation top
      window.scrollTo({ top: 120, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Pay & Book Trigger
  const handlePayClick = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // If NOT logged in, require auth right at payment step
    if (!user) {
      toast.info("Please sign in or register to complete payment and activate your Virtual Office.");
      setIsAuthModalOpen(true);
      return;
    }

    // If already logged in, execute directly
    executeOrderSubmission();
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#191C1C] font-sans antialiased selection:bg-teal-100 selection:text-teal-900 pb-20">
      {/* ── TOP HEADER / BREADCRUMB ── */}
      <div className="bg-[#00382E] text-white border-b border-teal-800/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <Link
                href="/virtual-office"
                className="inline-flex items-center gap-1.5 text-xs text-teal-300 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>All 3 Virtual Office Centres</span>
              </Link>
              <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
                <span>Virtual Office • {centre.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-widest">
                  {centre.area}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[11px] text-teal-200 uppercase font-bold tracking-wider">Fixed Annual Plan</div>
                <div className="text-lg font-black text-white">₹24,000 <span className="text-xs font-normal text-teal-200/80">/ year (0% GST)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        {bookingConfirmation ? (
          /* ── SUCCESS CONFIRMATION VIEW ── */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-white rounded-2xl border border-emerald-200 shadow-xl overflow-hidden p-6 sm:p-10 space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Booking Activated
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Virtual Office Activated!
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto">
                Your annual commercial address at <strong>{centre.name}</strong> is now live under Client Master. You can manage it immediately in your dashboard.
              </p>
            </div>

            {/* Breakdown Card */}
            <div className="bg-gray-50 border border-gray-200/90 rounded-xl p-5 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-gray-200">
                <span className="text-gray-500 font-semibold">Client Master ID</span>
                <span className="font-mono font-bold text-[#004D40] text-sm">{bookingConfirmation.clientId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Company Name</span>
                <span className="font-semibold text-gray-900">{bookingConfirmation.companyName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Selected Centre</span>
                <span className="font-semibold text-gray-900">{centre.name} ({centre.area})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Commercial Address</span>
                <span className="font-medium text-gray-700 text-right max-w-[280px]">{centre.address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Billing Tenure</span>
                <span className="font-semibold text-gray-900">1 Year (Fixed Annual)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Address Rate</span>
                <span className="font-semibold text-gray-900">₹24,000 / year</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">GST for Address Usage</span>
                <span className="font-semibold text-emerald-700">₹0 (0% GST)</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 text-sm">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-black text-[#004D40] text-base">₹24,000</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-500">
              A copy of your booking and initial invoice record has been dispatched to <strong>{contactEmail}</strong> and your contact phone <strong>{contactPhone}</strong>.
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 py-3 px-4 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-300" />
                <span>Open Client Dashboard</span>
              </Link>
              <Link
                href="/dashboard/contracts"
                className="py-3 px-5 bg-emerald-50 hover:bg-emerald-100 text-[#004D40] border border-emerald-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>View Invoices &amp; Agreement</span>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ── TWO-COLUMN CHECKOUT LAYOUT ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── LEFT COLUMN (7 COLS): CENTRE SHOWCASE & MAP & INCLUDED SERVICES ── */}
            <div className="lg:col-span-7 space-y-6">
              {/* Centre Image & Address Card */}
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
                <div className="relative h-60 sm:h-72 w-full bg-gray-100">
                  <Image
                    src={centre.image}
                    alt={centre.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                      {centre.area} • Ahmedabad
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white mt-1">
                      {centre.name}
                    </h2>
                    <p className="text-xs text-white/90 truncate">{centre.landmark}</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 flex-1">
                      <div className="text-xs font-bold text-gray-900 leading-snug">
                        {centre.address}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium">
                        Landmark: {centre.landmark} • Pin: {centre.pincode}
                      </div>
                    </div>
                    <a
                      href={centre.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-300 flex items-center gap-1 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3 h-3 text-gray-500" />
                      <span>Directions</span>
                    </a>
                  </div>

                  {/* Embedded Google Map */}
                  <div className="relative h-56 w-full rounded-xl overflow-hidden border border-gray-200">
                    <iframe
                      src={centre.mapEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map - ${centre.name}`}
                      className="w-full h-full"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-md shadow-xs border border-gray-200 text-[10px] font-bold text-[#004D40] flex items-center gap-1.5 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{centre.name} • Live Coordinates</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What is Included Box */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    What&apos;s Included with this Virtual Office
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 block">Commercial Address</span>
                      <span className="text-gray-600 text-[11px]">
                        Use on website, stationery, invoices, business cards &amp; corporate branding.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 block">Mail &amp; Courier Reception</span>
                      <span className="text-gray-600 text-[11px]">
                        Front desk accepts letters &amp; parcels with instant email notification.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 block">Secure Parcel Holding</span>
                      <span className="text-gray-600 text-[11px]">
                        Items safely stored at reception desk for pickup or courier forwarding.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 block">Meeting Rooms On-Demand</span>
                      <span className="text-gray-600 text-[11px]">
                        Access to conference rooms &amp; meeting suites at member discounted rates.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Scope Notice */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <strong>Notice on Address Usage:</strong> This plan is strictly for commercial communication address presence and mail handling. It does not include Landlord NOC/electricity bills for Gujarat GST registration or MCA/ROC company incorporation filings.
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN (5 COLS): STICKY CHECKOUT & BOOKING FORM ── */}
            <div className="lg:col-span-5 lg:sticky lg:top-8">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-md overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-[#004D40] text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-300" />
                      <h3 className="text-sm font-bold tracking-tight">Book Virtual Office</h3>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded text-white uppercase tracking-wider">
                      {centre.name}
                    </span>
                  </div>
                </div>

                {/* Plan Summary Card */}
                <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-emerald-50/80 via-teal-50/30 to-white">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Billing Plan
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase tracking-wider">
                      1 Year Fixed
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Annual Address Rate:</span>
                      <span className="font-semibold text-gray-900">₹24,000 / year</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (Address Usage):</span>
                      <span className="font-semibold text-emerald-700">₹0 (0% GST)</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-emerald-200 font-bold text-[#004D40] text-sm">
                      <span>Total Amount:</span>
                      <span>₹24,000</span>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handlePayClick} className="p-5 space-y-4">
                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Auth Indicator */}
                  {user ? (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-900">
                      <span className="flex items-center gap-1.5 font-medium truncate">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Signed in: <strong>{user.name || user.email}</strong></span>
                      </span>
                      <span className="text-[9px] text-emerald-700 uppercase font-bold tracking-wider px-1.5 py-0.5 bg-emerald-100 rounded shrink-0">
                        Verified
                      </span>
                    </div>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>No account needed to fill details. Sign in or register when you proceed to pay.</span>
                    </div>
                  )}

                  {/* Fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Company / Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Technologies"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white transition-colors"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Business Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Usage Purpose
                        </label>
                        <select
                          value={usagePurpose}
                          onChange={(e) => setUsagePurpose(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white"
                        >
                          <option value="MAILING_ONLY">Mailing &amp; Address Presence</option>
                          <option value="COMMERCIAL_PRESENCE">Commercial Communication</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          City / Base Location
                        </label>
                        <input
                          type="text"
                          value={hoAddress}
                          onChange={(e) => setHoAddress(e.target.value)}
                          placeholder="Current city"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit / Pay CTA Button */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing Activation...</span>
                        </div>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
                          <span>Pay &amp; Activate Virtual Office (₹24,000)</span>
                        </>
                      )}
                    </button>

                    <p className="text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span>Instant activation under Client Master &amp; Dashboard access</span>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AUTH MODAL (SHOWN ONLY WHEN USER CLICKS PAY IF NOT LOGGED IN) ── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          toast.success("Signed in successfully! Proceeding with your booking...");
          // Automatically execute submission once logged in
          setTimeout(() => {
            executeOrderSubmission();
          }, 300);
        }}
        defaultMode="login"
        title="Sign In or Register to Pay"
        message={`Please log in or create an account to proceed with payment and activate your Virtual Office at ${centre.name}.`}
      />
    </div>
  );
}
