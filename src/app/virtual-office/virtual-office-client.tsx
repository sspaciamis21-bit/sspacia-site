"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
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
  Sparkles,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  UserCheck,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/ui/auth-modal";
import { BookTourModal } from "@/components/ui/book-tour-modal";
import { toast } from "sonner";

interface CentreData {
  id: string;
  name: string;
  area: string;
  address: string;
  landmark: string;
  image: string;
  mapEmbedUrl: string;
  googleMapsUrl: string;
}

const CENTRES: CentreData[] = [
  {
    id: "agarwal-complex",
    name: "Agarwal Complex",
    area: "CG Road",
    address: "Agarwal Complex, Chimanlal Girdharlal Rd, Navrangpura, Ahmedabad, Gujarat 380009",
    landmark: "Near Municipal Market / Parimal Garden, C.G. Road",
    image: "/Pictures/Reception.jpeg",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85aa2ca9060b%3A0x5c9ab865d47d0323!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468609195!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/nv4fsViv3n5JnZKP6",
  },
  {
    id: "mercardo",
    name: "Mercado",
    area: "CG Road",
    address: "6th Floor, Mercado, Chimanlal Girdharlal Rd, opp. Municipal Market, Vasant Vihar, Ellisbridge, Ahmedabad, Gujarat 380009",
    landmark: "Opposite Municipal Market, C.G. Road, Ellisbridge",
    image: "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14686.784406449347!2d72.5413009871582!3d23.034927900000017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e85f077353eab%3A0x1ead32a902ba4157!2sSspacia%20Coworking!5e0!3m2!1sen!2sin!4v1773468526608!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/hvfuXehGcpgP1FfBA",
  },
  {
    id: "premier-house",
    name: "Premier House",
    area: "SG Highway",
    address: "Premier House, Opp. Gurudwara, SG Highway, Ahmedabad, Gujarat 380054",
    landmark: "Opposite Gurudwara, S.G. Highway Corporate Corridor",
    image: "/PH_images/ESL04996.JPG",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14685.718214362558!2d72.49659418715818!3d23.0447083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e9b6f44c62bdf%3A0x767273454104ee1e!2sSSPACIA%20-%20Coworking%20Space%20in%20Ahmedabad!5e0!3m2!1sen!2sin!4v1773468658065!5m2!1sen!2sin",
    googleMapsUrl: "https://maps.app.goo.gl/ZJ948unE5tiks47RA",
  },
];

const FAQS = [
  {
    q: "Can I use this Virtual Office address for GST Registration in Gujarat?",
    a: "Yes, 100%! SSPACIA provides all required documents including the registered commercial Lease/Rent Agreement, Landlord NOC (No Objection Certificate), and the latest paid Electricity/Utility Bill required by the GST department.",
  },
  {
    q: "Is this address accepted for MCA / ROC company incorporation?",
    a: "Absolutely. You can use our address as your Registered Office with the Registrar of Companies (ROC) for Private Limited Companies, LLPs, OPCs, and Partnership firms.",
  },
  {
    q: "What happens if a GST or ROC officer visits for physical verification?",
    a: "SSPACIA has dedicated on-site receptionists and community managers at all 3 centres during business hours (9:00 AM – 7:30 PM). Our staff greets visiting officers, verifies your firm's name on our corporate client register, and displays your company signage board.",
  },
  {
    q: "How are mail, letters, and courier parcels handled?",
    a: "All government letters, bank correspondence, and couriers received at the centre are securely logged by our reception desk. We send instant notifications via email/WhatsApp and can either hold them for pickup or forward them to your preferred address.",
  },
  {
    q: "Can I book meeting rooms or conference rooms if I have a Virtual Office?",
    a: "Yes! As an active SSPACIA Virtual Office member, you receive member-exclusive discounted hourly rates on high-tech meeting rooms and boardrooms across any of our 3 centres.",
  },
];

export default function VirtualOfficeClient() {
  const { user } = useAuth();
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [bookingCentre, setBookingCentre] = useState<string>("agarwal-complex");
  const [duration, setDuration] = useState<string>("12 Months");
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [tourLocation, setTourLocation] = useState<string>("Premier House (SG Highway)");

  const getTourLocationName = (centreId?: string) => {
    if (centreId === "agarwal-complex") return "Agarwal Complex (CG Road)";
    if (centreId === "mercardo") return "Mercado (CG Road)";
    if (centreId === "premier-house") return "Premier House (SG Highway)";
    return "Premier House (SG Highway)";
  };

  const handleOpenTour = (centreId?: string) => {
    if (centreId) {
      setTourLocation(getTourLocationName(centreId));
    }
    setIsTourModalOpen(true);
  };

  // Form states
  const [companyName, setCompanyName] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [gstType, setGstType] = useState<string>("NEW_REGISTRATION");
  const [gstNo, setGstNo] = useState<string>("");
  const [hoAddress, setHoAddress] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<any | null>(null);

  // Pre-fill user profile info if logged in
  React.useEffect(() => {
    if (user) {
      if (user.name) setContactName((prev) => prev || user.name || "");
      if (user.email) setContactEmail((prev) => prev || user.email || "");
      const phone = user.phone || (user as any).contactNumber || "";
      if (phone) setContactPhone((prev) => prev || phone);
    }
  }, [user]);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleOpenBooking = (centreId?: string) => {
    if (centreId) setBookingCentre(centreId);
    if (!user) {
      toast.info("Please sign in or create an account to book your Virtual Office.");
      setIsAuthModalOpen(true);
      return;
    }
    setErrorMsg(null);
    setBookingConfirmation(null);
    setIsBookingOpen(true);
  };

  const handleCloseBooking = () => {
    if (isSubmitting) return;
    setIsBookingOpen(false);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      toast.info("Please sign in or create an account to confirm your Virtual Office booking.");
      setIsAuthModalOpen(true);
      return;
    }

    if (!companyName.trim()) {
      setErrorMsg("Please enter your Company or Business Name");
      return;
    }
    if (!contactName.trim()) {
      setErrorMsg("Please enter the Contact Person name");
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number");
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const monthsNumber = duration === "1 Month" ? 1 : duration === "6 Months" ? 6 : 12;

      const res = await fetch("/api/public/virtual-office/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          contactPhone,
          contactEmail,
          centreKey: bookingCentre,
          duration,
          planMonths: monthsNumber,
          gstStatus: gstType === "EXISTING_GST" ? "REGISTERED" : "UNREGISTERED",
          gstNo: gstType === "EXISTING_GST" ? gstNo : null,
          hoAddress: hoAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit Virtual Office booking.");
      }

      setBookingConfirmation(data.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#191C1C] font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* ── 1. COMPACT HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#00382E] via-[#004D40] to-[#003028] text-white pt-10 pb-12 sm:pt-14 sm:pb-16">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-teal-400/15 border border-teal-300/25 rounded-full text-[11px] font-bold tracking-wider uppercase text-teal-200">
              <Globe className="w-3.5 h-3.5 text-teal-300" />
              <span>SSPACIA Virtual Office // 3 Prime Ahmedabad Centres</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
              Prestigious Business Address & GST Registration in Ahmedabad
            </h1>

            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              100% compliant documentation for <strong>GST Registration</strong>, <strong>MCA / ROC Company Incorporation</strong>, and corporate mailing presence. Includes Landlord NOC, Electricity Bill, and dedicated reception desk support across our 3 commercial centres.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => handleOpenBooking()}
                className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#00382E] font-black text-xs uppercase tracking-wider rounded-lg shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <span>Book Virtual Office</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleOpenTour()}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-lg border border-white/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                <span>Book a Tour</span>
              </button>

              <a
                href="#centres-section"
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white/90 hover:text-white font-semibold text-xs tracking-wider rounded-lg border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-300" />
                <span>View 3 Centres & Maps</span>
              </a>
            </div>

            {/* Quick Benefits Ticker */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-teal-500/30 text-[11px] text-teal-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% GST & ROC NOC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Paid Electricity Bill</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Mail & Courier Reception</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Registered Agreement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. ALL 3 CENTRES WITH STYLISH COMPACT GOOGLE MAPS (ALL VISIBLE) ── */}
      <section id="centres-section" className="py-8 sm:py-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/70 text-teal-800 text-[10px] font-extrabold uppercase tracking-widest">
            <MapPin className="w-3 h-3 text-teal-600" />
            <span>3 Prime Ahmedabad Locations</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-[#004D40] tracking-tight">
            Our 3 Prime Business Centres
          </h2>
          <p className="text-xs text-gray-500">
            Official registered addresses with live embedded Google Maps. Book your virtual office or schedule an in-person tour.
          </p>
        </div>

        {/* Stack of all 3 Centres - stylish and compact cards */}
        <div className="space-y-5">
          {CENTRES.map((centre, index) => (
            <div
              key={centre.id}
              id={centre.id}
              className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12"
            >
              {/* Left Column: Photo Thumbnail, Address & Action Buttons */}
              <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-white">
                <div className="space-y-3">
                  {/* Top Thumbnail + Title + Area */}
                  <div className="flex items-start gap-3">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden shrink-0 shadow-xs border border-gray-200 bg-gray-100">
                      <Image
                        src={centre.image}
                        alt={centre.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <span className="absolute bottom-1 left-1.5 text-[9px] font-bold uppercase tracking-wider text-white bg-black/60 px-1 rounded">
                        0{index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1 border border-emerald-200/60">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span>{centre.area}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-snug">
                        {centre.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                        {centre.landmark}
                      </p>
                    </div>
                  </div>

                  {/* Address Box */}
                  <div className="bg-gray-50/90 rounded-xl p-2.5 border border-gray-200/70 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-800 font-medium leading-relaxed">
                        {centre.address}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t border-gray-200/60 text-[10px] text-gray-600">
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Gujarat GST & ROC
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Landlord NOC & Bill
                      </span>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Verification Reception Desk
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenBooking(centre.id)}
                    className="flex-1 min-w-[170px] py-2 px-3 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Book Virtual Office</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
                  </button>

                  <button
                    onClick={() => handleOpenTour(centre.id)}
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#004D40] border border-emerald-300/80 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Schedule a visit"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Book a Tour</span>
                  </button>

                  <a
                    href={centre.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                    title="Open in Google Maps"
                  >
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                    <span className="hidden sm:inline">Directions</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Embedded Google Map (Stylish & Compact) */}
              <div className="lg:col-span-6 relative h-[210px] sm:h-[225px] lg:h-full min-h-[210px] sm:min-h-[225px] bg-gray-100 border-t lg:border-t-0 lg:border-l border-gray-200">
                <iframe
                  src={centre.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, height: "100%", minHeight: "210px" }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Google Map - ${centre.name}`}
                  className="w-full h-full"
                />
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-md shadow-xs border border-gray-200/90 text-[10px] font-bold text-[#004D40] flex items-center gap-1.5 pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{centre.name} • Live Map</span>
                </div>
                <a
                  href={centre.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-white/95 hover:bg-white backdrop-blur-md px-2 py-0.5 rounded shadow-xs border border-gray-300 text-[10px] font-semibold text-gray-700 flex items-center gap-1 transition-colors"
                >
                  <span>Full Map</span>
                  <ExternalLink className="w-2.5 h-2.5 text-gray-500" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. FAQS SECTION ── */}
      <section className="py-10 sm:py-14 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 space-y-1">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#006064]">
            FAQS
          </span>
          <h2 className="text-lg sm:text-xl font-display font-black text-[#004D40] tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 font-semibold text-xs text-gray-800 hover:text-[#004D40] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-[#004D40]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. BOOKING MODAL (COMPACT & PROPORTIONATE) ── */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden my-6"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-[#004D40] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-300" />
                  <h3 className="text-sm font-bold tracking-tight">Book Virtual Office</h3>
                </div>
                <button
                  onClick={handleCloseBooking}
                  disabled={isSubmitting}
                  className="p-1 text-teal-200 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              {bookingConfirmation ? (
                /* Confirmation Screen */
                <div className="p-5 sm:p-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-gray-900">
                      Booking Received!
                    </h4>
                    <p className="text-xs text-gray-600">
                      Your Virtual Office registration has been recorded under Client Master.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                      <span className="text-gray-500 font-semibold">Client ID</span>
                      <span className="font-mono font-bold text-[#004D40]">{bookingConfirmation.clientId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Company Name</span>
                      <span className="font-semibold text-gray-900">{bookingConfirmation.companyName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Selected Centre</span>
                      <span className="font-semibold text-gray-900">{bookingConfirmation.centre}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Duration</span>
                      <span className="font-semibold text-gray-900">{bookingConfirmation.duration}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Our team will connect with you on <strong>{contactPhone}</strong> to assist with documentation.
                  </p>

                  <button
                    onClick={handleCloseBooking}
                    className="w-full py-2.5 bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#00382E] transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Booking Form */
                <form onSubmit={handleSubmitBooking} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {user && (
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-900">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Booking as <strong>{user.name || user.email}</strong></span>
                      </span>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider px-1.5 py-0.5 bg-emerald-100 rounded">
                        Verified Account
                      </span>
                    </div>
                  )}

                  {/* 1. Select Centre */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">
                      Centre Location *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CENTRES.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setBookingCentre(c.id)}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            bookingCentre === c.id
                              ? "bg-teal-50 border-[#004D40] ring-1 ring-[#004D40]"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-xs font-bold text-gray-900 leading-tight">{c.name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{c.area}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Duration */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">
                      Preferred Duration
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["1 Month", "6 Months", "12 Months"].map((dur) => (
                        <button
                          type="button"
                          key={dur}
                          onClick={() => setDuration(dur)}
                          className={`p-2 rounded-lg border text-center text-xs font-semibold transition-all cursor-pointer ${
                            duration === dur
                              ? "bg-teal-50 border-[#004D40] text-[#004D40] font-bold"
                              : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          {dur}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Company & Contact Details */}
                  <div className="space-y-2.5 pt-2 border-t border-gray-100">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                        Company / Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Enterprises"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                          Purpose
                        </label>
                        <select
                          value={gstType}
                          onChange={(e) => setGstType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40] bg-white"
                        >
                          <option value="NEW_REGISTRATION">New GST Registration</option>
                          <option value="ROC_INCORPORATION">Company Incorporation (ROC)</option>
                          <option value="EXISTING_GST">Existing GST Amendment</option>
                          <option value="MAILING_ONLY">Mailing Address Only</option>
                        </select>
                      </div>

                      {gstType === "EXISTING_GST" ? (
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                            GST Number
                          </label>
                          <input
                            type="text"
                            value={gstNo}
                            onChange={(e) => setGstNo(e.target.value)}
                            placeholder="24AAAAA0000A1Z5"
                            className="w-full px-2.5 py-1.5 text-xs uppercase rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">
                            City / Location
                          </label>
                          <input
                            type="text"
                            value={hoAddress}
                            onChange={(e) => setHoAddress(e.target.value)}
                            placeholder="Current city"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#004D40]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#004D40] hover:bg-[#00382E] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Booking...</span>
                      </div>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-300" />
                        <span>Confirm Virtual Office Booking</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 6. MANDATORY AUTH MODAL (LOGIN / SIGN UP REQUIRED BEFORE BOOKING) ── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsBookingOpen(true);
        }}
        defaultMode="login"
        title="Sign In to Book Virtual Office"
        message="Please sign in or create an account to book your Virtual Office and manage compliance documents."
      />

      {/* ── 7. BOOK A TOUR MODAL ── */}
      <BookTourModal
        isOpen={isTourModalOpen}
        onClose={() => setIsTourModalOpen(false)}
        initialLocation={tourLocation}
      />
    </div>
  );
}
