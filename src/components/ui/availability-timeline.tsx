"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Check, Lock, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { StyledDatePicker } from "@/components/ui/styled-date-picker";

interface AvailabilityTimelineProps {
  productId?: number;
  selectedDate?: string;
  selectedSlots?: string[];
  onToggleSlot?: (slot: string) => void;
  onDateChange?: (newDate: string) => void;
  layout?: 'scroll' | 'wrap';
  title?: string;
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

/**
 * Shows the exact red alert popup requested by the user:
 * [ 🛡️ The slot is not available!!   ✕ ]
 */
export function showSlotUnavailableToast() {
  toast.custom((t) => (
    <div className="bg-[#d32f2f] text-white px-4 py-3 rounded-md shadow-2xl flex items-center justify-between gap-4 min-w-[280px] sm:min-w-[320px] border border-red-500/40 select-none animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="w-5 h-5 text-white shrink-0 fill-white/20" />
        <span className="text-xs sm:text-[13px] font-bold tracking-tight text-white">
          The slot is not available!!
        </span>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(t)}
        className="text-white/80 hover:text-white p-1 rounded transition-colors cursor-pointer"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ), {
    duration: 4000,
  });
}

export function AvailabilityTimeline({
  productId,
  selectedDate,
  selectedSlots = [],
  onToggleSlot,
  onDateChange,
  layout = 'scroll',
  title = 'AVAILABLE TIME SLOTS'
}: AvailabilityTimelineProps) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [myBookedSlots, setMyBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if selected date is Sunday
  const isSunday = useMemo(() => {
    if (!selectedDate || !selectedDate.includes("-")) return false;
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return false;
    const date = new Date(y, m - 1, d);
    return date.getDay() === 0;
  }, [selectedDate]);

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!productId) return;
      setLoading(true);
      try {
        const dateParam = selectedDate || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/public/bookings/booked-slots?productId=${productId}&date=${dateParam}`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setBookedSlots(data.bookedSlots || data.data || []);
          setMyBookedSlots(data.myBookedSlots || []);
        } else {
          setBookedSlots([]);
          setMyBookedSlots([]);
        }
      } catch (err) {
        console.error("Availability fetch error:", err);
        setBookedSlots([]);
        setMyBookedSlots([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBookedSlots();
  }, [productId, selectedDate]);

  const isSlotPast = (slot: string) => {
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const dateToCheck = selectedDate || today;

    if (dateToCheck < today) return true;
    if (dateToCheck === today) {
      const currentHour = now.getHours();
      const [slotHour] = slot.split(':').map(Number);
      return currentHour >= slotHour;
    }
    return false;
  };

  const handleSlotClick = (e: React.MouseEvent, slot: string, disabled: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    // If it is Sunday or the slot is otherwise unavailable, trigger "The slot is not available!!"
    if (isSunday || disabled) {
      showSlotUnavailableToast();
      return;
    }

    if (onToggleSlot) {
      onToggleSlot(slot);
    }
  };

  return (
    <div className="space-y-3 w-full relative">
      {/* Header with Title and Date Picker above time slot selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 relative z-20">
        {title && (
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.3em]">{title}</h4>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>
        )}
        {onDateChange && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-tertiary tracking-wider">Date:</span>
            <StyledDatePicker
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={onDateChange}
              triggerClassName="py-1 px-2.5 text-xs h-8 min-w-[170px]"
              align="right"
            />
          </div>
        )}
      </div>

      <div className="relative group overflow-hidden">
        {layout === 'wrap' ? (
          <div className={`flex flex-wrap gap-2 py-1 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
            {TIME_SLOTS.map((slot) => {
              const isPast = isSlotPast(slot);
              const isMine = myBookedSlots.includes(slot);
              const isBooked = bookedSlots.includes(slot);
              const disabled = isPast || isBooked;
              const isSelected = selectedSlots.includes(slot);

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={(e) => handleSlotClick(e, slot, disabled)}
                  className={`px-3 py-2 rounded-md text-[11px] font-bold font-mono flex items-center gap-1.5 transition-all border shrink-0 ${isSelected
                      ? "bg-[#1ab0bc] text-white border-[#1ab0bc] shadow-md scale-105"
                      : isMine
                        ? "bg-blue-50 text-blue-700 border-blue-200 cursor-pointer opacity-90 shadow-xs"
                        : isBooked
                          ? "bg-rose-50 text-rose-600 border-rose-200 cursor-pointer opacity-90 shadow-xs"
                          : disabled
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-pointer opacity-60"
                            : "bg-white text-gray-700 border-gray-300 hover:border-[#1ab0bc] hover:text-[#1ab0bc] hover:bg-cyan-50/50 cursor-pointer"
                    }`}
                  title={
                    isSunday
                      ? "Click slot"
                      : isMine
                        ? "🔒 Booked by You — You have already reserved this slot"
                        : isBooked
                          ? "🔒 Already Reserved — This slot is booked by another customer"
                          : isPast
                            ? "Time Passed"
                            : `Available - Click to select ${slot} slot`
                  }
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isMine ? (
                    <Lock className="w-3 h-3 text-blue-600" />
                  ) : isBooked ? (
                    <Lock className="w-3 h-3 text-rose-500" />
                  ) : disabled ? (
                    <Lock className="w-3 h-3 text-gray-400" />
                  ) : null}
                  <span>{slot}</span>
                  {isMine ? (
                    <span className="text-[8px] uppercase tracking-tighter text-blue-700 font-bold">Booked by You</span>
                  ) : isBooked ? (
                    <span className="text-[8px] uppercase tracking-tighter text-rose-600 font-bold">Reserved</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pb-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
            <div className="min-w-max flex gap-2 py-1">
              {TIME_SLOTS.map((slot) => {
                const isPast = isSlotPast(slot);
                const isMine = myBookedSlots.includes(slot);
                const isBooked = bookedSlots.includes(slot);
                const disabled = isPast || isBooked;
                const isSelected = selectedSlots.includes(slot);

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={(e) => handleSlotClick(e, slot, disabled)}
                    className={`px-3 py-2 rounded-md text-[11px] font-bold font-mono flex items-center gap-1.5 transition-all border shrink-0 ${isSelected
                        ? "bg-[#1ab0bc] text-white border-[#1ab0bc] shadow-md scale-105"
                        : isMine
                          ? "bg-blue-50 text-blue-700 border-blue-200 cursor-pointer opacity-90 shadow-xs"
                          : isBooked
                            ? "bg-rose-50 text-rose-600 border-rose-200 cursor-pointer opacity-90 shadow-xs"
                            : disabled
                              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-pointer opacity-60"
                              : "bg-white text-gray-700 border-gray-300 hover:border-[#1ab0bc] hover:text-[#1ab0bc] hover:bg-cyan-50/50 cursor-pointer"
                      }`}
                    title={
                      isSunday
                        ? "Click slot"
                        : isMine
                          ? "🔒 Booked by You — You have already reserved this slot"
                          : isBooked
                            ? "🔒 Already Reserved — This slot is booked by another customer"
                            : isPast
                              ? "Time Passed"
                              : `Available - Click to select ${slot} slot`
                    }
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : isMine ? (
                      <Lock className="w-3 h-3 text-blue-600" />
                    ) : isBooked ? (
                      <Lock className="w-3 h-3 text-rose-500" />
                    ) : disabled ? (
                      <Lock className="w-3 h-3 text-gray-400" />
                    ) : null}
                    <span>{slot}</span>
                    {isMine ? (
                      <span className="text-[8px] uppercase tracking-tighter text-blue-700 font-bold">Booked by You</span>
                    ) : isBooked ? (
                      <span className="text-[8px] uppercase tracking-tighter text-rose-600 font-bold">Reserved</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
