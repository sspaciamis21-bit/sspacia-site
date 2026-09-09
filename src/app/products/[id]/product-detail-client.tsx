"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Wifi,
  Coffee,
  Calendar,
  ShieldCheck,
  Clock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { AuthModal } from "@/components/ui/auth-modal";
import { AvailabilityTimeline } from "@/components/ui/availability-timeline";
import { StyledDatePicker } from "@/components/ui/styled-date-picker";

// For demo purposes since actual DB images are empty []
const fallbackImages = [
  "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
  "/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG",
  "/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg",
];

// Helper to format hour (e.g. 13 -> "1 PM", 15 -> "3 PM")
function formatHour12(hour24: number): string {
  const period = hour24 >= 12 && hour24 < 24 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12} ${period}`;
}

// Helper to format slot range (e.g. ["13:00"] -> "1 PM to 2 PM", ["13:00", "14:00"] -> "1 PM to 3 PM")
function formatSlotTimeRange(slots: string[]): string {
  if (!slots || slots.length === 0) return "";
  const sorted = [...slots].sort();
  const slotHours = sorted.map(s => {
    const [h] = s.split(':').map(Number);
    return h;
  });

  const ranges: { start: number; end: number }[] = [];
  let currentRange: { start: number; end: number } | null = null;

  for (const h of slotHours) {
    if (!currentRange) {
      currentRange = { start: h, end: h + 1 };
    } else if (h === currentRange.end) {
      currentRange.end = h + 1;
    } else {
      ranges.push(currentRange);
      currentRange = { start: h, end: h + 1 };
    }
  }
  if (currentRange) ranges.push(currentRange);

  return ranges
    .map(r => `${formatHour12(r.start)} to ${formatHour12(r.end)}`)
    .join(", ");
}

// Helper to format date (e.g. "2026-09-05" -> "5 Sep 2026")
function formatDateForSlot(dateStr?: string): string {
  let d: Date;
  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date();
    }
  } else {
    d = new Date();
  }
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const images = product.images?.length > 0 ? product.images.map((img: any) => img.url) : fallbackImages;

  const initialDateFromQuery = searchParams?.get('date');
  const initialSlotsFromQuery = searchParams?.get('slots')?.split(',').filter(Boolean) || [];

  // Guest Space Booking State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDateFromQuery) return initialDateFromQuery;
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>(initialSlotsFromQuery);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [myBookedSlots, setMyBookedSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  const [isGalleryHovered, setIsGalleryHovered] = useState(false);

  // Auto-advance detail hero images every 3 seconds if multiple images exist
  useEffect(() => {
    if (images.length <= 1 || isGalleryHovered) return;
    const timer = setInterval(() => {
      setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [images.length, isGalleryHovered]);

  const isGuestSpace = product.categoryId === 2 || product.category?.slug === 'guest-space' || product.category?.name?.toLowerCase().includes('guest');

  // Assuming lowest price is hourly for guest spaces
  const hourlyRate = isGuestSpace && product.pricingPlans?.length > 0
    ? Math.min(...product.pricingPlans.map((p: any) => parseFloat(p.price)))
    : 0;

  const handleNextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const handlePrevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  /**
   * Logic to allow selecting any combination of time slots (hourly).
   */
  const toggleTimeSlot = (slot: string) => {
    setSelectedTimeSlots((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      } else {
        return [...prev, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b));
      }
    });
  };

  /**
   * Fetch already booked slots for this product on the selected date
   */
  React.useEffect(() => {
    if (selectedDate && product.id) {
      const fetchBookedSlots = async () => {
        setIsFetchingSlots(true);
        try {
          const res = await fetch(`/api/public/bookings/booked-slots?productId=${product.id}&date=${selectedDate}`, {
            credentials: 'include'
          });
          const data = await res.json();
          const slots = data.bookedSlots || data.data || [];
          setBookedSlots(slots);
          setMyBookedSlots(data.myBookedSlots || []);
        } catch (error) {
          console.error("Error fetching booked slots:", error);
          setBookedSlots([]);
          setMyBookedSlots([]);
        } finally {
          setIsFetchingSlots(false);
        }
      };
      
      fetchBookedSlots();
      // Reset selected slots when date changes
      setSelectedTimeSlots([]);
    }
  }, [selectedDate, product.id]);

  const isSlotDisabled = (slot: string) => {
    // 1. Is it already booked?
    if (bookedSlots.includes(slot)) return true;

    // 2. Is it in the past?
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    if (selectedDate === today) {
      const currentHour = now.getHours();
      const [slotHour] = slot.split(':').map(Number);
      
      // If current hour is greater than or equal to slot hour, it's disabled.
      if (currentHour >= slotHour) return true;
    }
    
    // Also disable if selectedDate is before today
    if (selectedDate < today) return true;

    return false;
  };

  const totalPrice = selectedTimeSlots.length * hourlyRate;

  const handleBooking = () => {
    if (!selectedDate || selectedTimeSlots.length === 0) {
      toast.error("Please select at least one time slot to book");
      return;
    }

    const params = new URLSearchParams({
      productId: product.id.toString(),
      date: selectedDate,
      slots: selectedTimeSlots.join(','),
      basePrice: hourlyRate.toString()
    });
    const targetUrl = `/checkout?${params.toString()}`;

    router.push(targetUrl);
  };

  const handleInquiryRequest = async () => {
    if (!isLoggedIn) {
      setPendingAction("inquiry");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmittingInquiry(true);
    const toastId = toast.loading("Submitting your workspace inquiry...");

    try {
      const plan = product.pricingPlans?.[0];
      const res = await fetch('/api/user/bookings/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          durationTypeId: plan?.durationTypeId || 1,
          startDate: new Date().toISOString()
        })
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Inquiry & Contract Request Submitted!", {
          id: toastId,
          description: "Our Community Manager has received your request and will contact you shortly."
        });
      } else {
        toast.error(json.error || "Submission failed", { id: toastId });
      }
    } catch {
      toast.error("Failed to submit inquiry. Please try again.", { id: toastId });
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  return (
    <div className="py-24 max-w-7xl mx-auto px-8 mb-32 space-y-16">

      {/* ── Breadcrumb & Title ── */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-tertiary">
          SSPACIA / {product.location.name} / {product.name}
        </p>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter text-on-surface">
          {product.name}
        </h1>
        <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-primary">
          <MapPin className="h-4 w-4" />
          {product.location.name}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-12 items-start">

        {/* ── Left Side: Images & Details ── */}
        <div className="lg:col-span-2 space-y-12">

          {/* Image Carousel */}
          <div className="relative aspect-[16/9] w-full bg-surface-lowest overflow-hidden border border-outline-variant/10 shadow-2xl group">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[currentImageIndex]}
                  alt={`${product.name} Image ${currentImageIndex + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {/* Carousel Controls */}
            {images.length > 1 && (
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <button
                  onClick={handlePrevImage}
                  className="h-12 w-12 flex justify-center items-center bg-white border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="h-12 w-12 flex justify-center items-center bg-white border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Carousel Indicators */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-1.5 transition-all duration-300 ${i === currentImageIndex ? 'w-8 bg-primary' : 'w-4 bg-white/50 backdrop-blur-md'}`}
                />
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tighter text-on-surface mb-6">About the Space</h2>
              <p className="text-lg leading-relaxed text-tertiary font-light">
                {product.description || "Experience a premium, architecturally inspired environment designed for maximum productivity and comfort. This space is equipped with modern, top-tier amenities carefully curated to meet professional needs."}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {product.capacity && (
                <div className="flex items-center gap-4 bg-surface-lowest p-6 border border-outline-variant/10 shadow-sm">
                  <div className="h-12 w-12 flex items-center justify-center bg-surface-low text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-tertiary tracking-[0.2em] mb-1">Capacity</p>
                    <p className="text-sm font-semibold text-on-surface">Up to {product.capacity} People</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 bg-surface-lowest p-6 border border-outline-variant/10 shadow-sm">
                <div className="h-12 w-12 flex items-center justify-center bg-surface-low text-primary">
                  <Wifi className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-tertiary tracking-[0.2em] mb-1">Connectivity</p>
                  <p className="text-sm font-semibold text-on-surface">Ultra-Fast WiFi</p>
                </div>
              </div>

              {product.complementaryMeetingHours && (
                <div className="flex items-center gap-4 bg-surface-lowest p-6 border border-outline-variant/10 shadow-sm">
                  <div className="h-12 w-12 flex items-center justify-center bg-surface-low text-primary">
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-tertiary tracking-[0.2em] mb-1">Perks</p>
                    <p className="text-sm font-semibold text-on-surface">{product.complementaryMeetingHours}Hrs Free Meeting Room</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 bg-surface-lowest p-6 border border-outline-variant/10 shadow-sm">
                <div className="h-12 w-12 flex items-center justify-center bg-surface-low text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-tertiary tracking-[0.2em] mb-1">Security</p>
                  <p className="text-sm font-semibold text-on-surface">24/7 Access Monitoring</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Side: Booking Widget ── */}
        <div className="bg-surface-lowest border border-outline-variant/10 shadow-[0_20px_40px_rgba(27,28,28,0.06)] p-8 sticky top-32">
          <div className="w-12 h-1 bg-primary mb-8"></div>

          <h3 className="font-display text-2xl font-bold tracking-tighter text-on-surface mb-8">
            Reserve this Space
          </h3>

          {isGuestSpace ? (
            <div className="space-y-8">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Select Date
                </label>
                <StyledDatePicker
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(newDate) => {
                    setSelectedDate(newDate);
                    setSelectedTimeSlots([]);
                  }}
                  className="w-full"
                  triggerClassName="w-full h-12 justify-between"
                />
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="space-y-3">
                  <AvailabilityTimeline
                    productId={product.id}
                    selectedDate={selectedDate}
                    selectedSlots={selectedTimeSlots}
                    onToggleSlot={toggleTimeSlot}
                    layout="wrap"
                    title="SELECT TIME SLOTS (HOURLY)"
                  />
                  <p className="text-[9px] text-tertiary italic">* Click any time slot to select or modify your reserved hours</p>
                </div>
              )}

              {/* Price Summary */}
              {selectedTimeSlots.length > 0 && (
                <div className="border-t border-outline-variant/20 pt-6 space-y-3">
                  <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-sm space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#006064] flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                      <span>{formatDateForSlot(selectedDate)}</span>
                      <span className="text-slate-300 font-normal">•</span>
                      <Clock className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                      <span>{formatSlotTimeRange(selectedTimeSlots)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono">
                      {selectedTimeSlots.length} {selectedTimeSlots.length === 1 ? 'hour' : 'hours'} @ ₹{hourlyRate.toLocaleString()}/hr
                    </p>
                  </div>
                  <div className="flex justify-between items-end pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Total Amount</span>
                    <span className="font-display text-2xl font-bold text-primary">₹{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                disabled={!selectedDate || selectedTimeSlots.length === 0}
                onClick={handleBooking}
                className="liquid-hover w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed shadow-xl cursor-pointer"
              >
                Proceed to Booking
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-sm font-light leading-relaxed text-tertiary border-l-2 border-primary pl-4">
                This premium workspace is available for long-term commitments. Reach out to our team to discuss customized options, configuration, and exclusive benefits.
              </p>

              <button
                disabled={isSubmittingInquiry}
                onClick={handleInquiryRequest}
                className="liquid-hover w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-primary-container shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingInquiry ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Submit Inquiry & Request Agreement</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* QUICK AUTH POPUP MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingAction(null);
        }}
        title="Sign In to Continue"
        message="Log in or register to complete your workspace booking."
        onSuccess={() => {
          setIsAuthModalOpen(false);
          if (pendingAction === "inquiry") {
            handleInquiryRequest();
          } else if (pendingAction) {
            router.push(pendingAction);
          }
          setPendingAction(null);
        }}
      />
    </div>
  );
}