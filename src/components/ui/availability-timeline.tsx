"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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
          setBookedSlots(data.bookedSlots || []);
        } else {
          // Fallback static booked slots for demo
          setBookedSlots(["08:00", "09:00", "12:00", "13:00", "16:00"]);
        }
      } catch (err) {
        console.error("Availability fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchBookedSlots();
  }, [productId, selectedDate]);

  const isSlotDisabled = (slot: string) => {
    if (bookedSlots.includes(slot)) return true;
    
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const dateToCheck = selectedDate || today;

    if (dateToCheck === today) {
      const currentHour = now.getHours();
      const [slotHour] = slot.split(':').map(Number);
      if (currentHour >= slotHour) return true;
    }
    
    if (dateToCheck < today) return true;
    return false;
  };

  return (
    <div className="space-y-4 w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.4em]">AVAILABLE TIME SLOT</h4>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      </div>

      <div className="relative group overflow-hidden">
        <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pb-4 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
          <div className="min-w-fit flex flex-col gap-3">
             {/* Slot Row */}
             <div className="flex border border-outline-variant/30 rounded-none overflow-hidden h-10">
                {TIME_SLOTS.map((slot) => {
                  const disabled = isSlotDisabled(slot);
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedSlots.includes(slot);
                  
                  return (
                    <div 
                      key={slot}
                      onClick={() => !disabled && onToggleSlot?.(slot)}
                      className={`min-w-[64px] flex flex-col items-center justify-center border-r border-outline-variant/30 last:border-r-0 transition-all cursor-pointer ${
                        disabled 
                          ? "bg-surface-container-high/40 grayscale cursor-not-allowed" 
                          : isSelected 
                            ? "bg-primary text-white z-10 shadow-lg" 
                            : "bg-white hover:bg-primary/5"
                      }`}
                    >
                      <span className={`text-[12px] ${
                        isSelected ? "text-white font-black" : isBooked || disabled ? "text-red-500 font-bold" : "text-primary/60 font-medium"
                      }`}>
                        {isBooked || disabled ? "x" : "|"}
                      </span>
                    </div>
                  );
                })}
             </div>
             
             {/* Label Row */}
             <div className="flex">
                {TIME_SLOTS.map((slot) => (
                  <div key={`label-${slot}`} className="min-w-[64px] text-center text-[8px] font-bold text-tertiary/40 uppercase tracking-tighter">
                    {slot}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
