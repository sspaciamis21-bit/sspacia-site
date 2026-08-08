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

// For demo purposes since actual DB images are empty []
const fallbackImages = [
  "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg",
  "/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG",
  "/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg",
];

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"
];

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);

  const isGuestSpace = product.categoryId === 1;

  // Assuming lowest price is hourly for guest spaces
  const hourlyRate = isGuestSpace && product.pricingPlans?.length > 0
    ? Math.min(...product.pricingPlans.map((p: any) => parseFloat(p.price)))
    : 0;

  const handleNextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const handlePrevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  /**
   * Logic to ensure only consecutive time slots can be selected.
   * If a non-adjacent slot is clicked, it resets the selection to that new slot.
   */
  const toggleTimeSlot = (slot: string) => {
    const slotIndex = TIME_SLOTS.indexOf(slot);

    // 1. Initial selection
    if (selectedTimeSlots.length === 0) {
      setSelectedTimeSlots([slot]);
      return;
    }

    // Get current min and max indices of selected slots
    const selectedIndices = selectedTimeSlots
      .map((s) => TIME_SLOTS.indexOf(s))
      .sort((a, b) => a - b);

    const minIndex = selectedIndices[0];
    const maxIndex = selectedIndices[selectedIndices.length - 1];

    // 2. Deselection logic
    if (selectedTimeSlots.includes(slot)) {
      // If clicking the only selected slot, remove it
      if (selectedTimeSlots.length === 1) {
        setSelectedTimeSlots([]);
      }
      // Only allow deselecting from the edges to maintain a solid block
      else if (slotIndex === minIndex || slotIndex === maxIndex) {
        setSelectedTimeSlots(prev => prev.filter(s => s !== slot));
      }
      // If clicking in the middle, reset to just that slot to avoid a gap
      else {
        setSelectedTimeSlots([slot]);
      }
      return;
    }

    // 3. Selection logic (Expansion)
    // Check if the clicked slot is immediately before the start or after the end
    if (slotIndex === minIndex - 1 || slotIndex === maxIndex + 1) {
      const newIndices = [...selectedIndices, slotIndex].sort((a, b) => a - b);
      const newSlots = newIndices.map(i => TIME_SLOTS[i]);
      setSelectedTimeSlots(newSlots);
    }
    // 4. Reset logic (Jumping)
    // If clicking a non-adjacent slot, start a new range from that slot
    else {
      setSelectedTimeSlots([slot]);
    }
  };

  /**
   * Fetch already booked slots for this product on the selected date
   */
  React.useEffect(() => {
    if (selectedDate && product.id) {
      const fetchBookedSlots = async () => {
        setIsFetchingSlots(true);
        try {
          const res = await fetch(`/api/public/bookings/booked-slots?productId=${product.id}&date=${selectedDate}`);
          const data = await res.json();
          if (data.bookedSlots) {
            setBookedSlots(data.bookedSlots);
          }
        } catch (error) {
          console.error("Error fetching booked slots:", error);
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
    if (!selectedDate || selectedTimeSlots.length === 0) return;

    if (!isLoggedIn) {
      const returnUrl = encodeURIComponent(`/products/${product.id}`);
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }

    const params = new URLSearchParams({
      productId: product.id.toString(),
      date: selectedDate,
      slots: selectedTimeSlots.join(','),
      basePrice: totalPrice.toString()
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const handleInquiryRequest = async () => {
    if (!isLoggedIn) {
      const returnUrl = encodeURIComponent(`/products/${product.id}`);
      router.push(`/login?redirect=${returnUrl}`);
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
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-surface-high border-b-2 border-outline-variant/30 px-4 py-4 text-sm font-bold text-on-surface transition-all focus:border-primary focus:outline-none"
                />
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Select Time Slots (Hourly)
                  </label>
                  <p className="text-[9px] text-tertiary italic">* Only consecutive hours can be booked together</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 border border-outline-variant/10 p-4 bg-surface-high relative">
                    {isFetchingSlots && (
                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center z-10 backdrop-blur-[1px]">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {TIME_SLOTS.map(slot => {
                      const disabled = isSlotDisabled(slot);
                      const isBooked = bookedSlots.includes(slot);
                      
                      return (
                        <button
                          key={slot}
                          disabled={disabled}
                          onClick={() => toggleTimeSlot(slot)}
                          className={`py-2 text-[10px] font-bold transition-all border relative flex flex-col items-center justify-center gap-0.5 ${selectedTimeSlots.includes(slot)
                            ? 'bg-primary border-primary text-white shadow-md'
                            : disabled
                              ? 'bg-outline-variant/10 border-outline-variant/30 text-outline cursor-not-allowed grayscale'
                              : 'bg-white border-outline-variant/20 text-tertiary hover:border-primary/50'
                            }`}
                        >
                          <span>{slot}</span>
                          {isBooked && (
                            <span className="text-[7px] leading-[1] opacity-60 uppercase font-black">Booked</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Summary */}
              {selectedTimeSlots.length > 0 && (
                <div className="border-t border-outline-variant/20 pt-6 space-y-2">
                  <div className="flex justify-between text-sm text-tertiary">
                    <span>{selectedTimeSlots.length} Hours × ₹{hourlyRate}</span>
                    <span>₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Total Amount</span>
                    <span className="font-display text-2xl font-bold text-primary">₹{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                disabled={!selectedDate || selectedTimeSlots.length === 0}
                onClick={handleBooking}
                className="liquid-hover w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
              >
                {isLoggedIn ? "Proceed to Booking" : "Login to Continue"}
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
                className="liquid-hover w-full bg-primary text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-primary-container shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingInquiry ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isLoggedIn ? "Submit Inquiry & Request Agreement" : "Login to Submit Inquiry"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}