"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check, Lock } from "lucide-react";

interface AvailabilityTimelineProps {
  productId?: number;
  selectedDate?: string;
  selectedSlots?: string[];
  onToggleSlot?: (slot: string) => void;
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export function AvailabilityTimeline({ 
  productId,
  selectedDate,
  selectedSlots = [],
  onToggleSlot
}: AvailabilityTimelineProps) {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!productId) return;
      setLoading(true);
      try {
        const dateParam = selectedDate || new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/public/bookings/booked-slots?productId=${productId}&date=${dateParam}`);
        if (res.ok) {
          const data = await res.json();
          setBookedSlots(data.bookedSlots || data.data || []);
        } else {
          setBookedSlots([]);
        }
      } catch (err) {
        console.error("Availability fetch error:", err);
        setBookedSlots([]);
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

  return (
    <div className="space-y-3 w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.3em]">AVAILABLE TIME SLOTS</h4>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      </div>

      <div className="relative group overflow-hidden">
        <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pb-2 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <div className="min-w-max flex gap-2 py-1">
            {TIME_SLOTS.map((slot) => {
              const isPast = isSlotPast(slot);
              const isBooked = bookedSlots.includes(slot);
              const disabled = isPast || isBooked;
              const isSelected = selectedSlots.includes(slot);
              
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && onToggleSlot) {
                      onToggleSlot(slot);
                    }
                  }}
                  className={`px-3 py-2 rounded-md text-[11px] font-bold font-mono flex items-center gap-1.5 transition-all border ${
                    isSelected
                      ? "bg-[#1ab0bc] text-white border-[#1ab0bc] shadow-md scale-105"
                      : isBooked
                      ? "bg-rose-50 text-rose-600 border-rose-200 cursor-not-allowed opacity-90 shadow-xs"
                      : disabled
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                      : "bg-white text-gray-700 border-gray-300 hover:border-[#1ab0bc] hover:text-[#1ab0bc] hover:bg-cyan-50/50 cursor-pointer"
                  }`}
                  title={isBooked ? "🔒 Already Reserved - This slot is booked by another customer" : isPast ? "Time Passed" : `Available - Click to select ${slot} slot`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isBooked ? (
                    <Lock className="w-3 h-3 text-rose-500" />
                  ) : disabled ? (
                    <Lock className="w-3 h-3 text-gray-400" />
                  ) : null}
                  <span>{slot}</span>
                  {isBooked && <span className="text-[8px] uppercase tracking-tighter text-rose-600 font-bold">Reserved</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

