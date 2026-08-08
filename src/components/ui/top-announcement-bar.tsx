"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AnnouncementItem {
  id: number;
  text: string;
}

export function TopAnnouncementBar() {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/public/announcements');
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setAnnouncements(json.data);
        }
      }
    } catch (err) {
      console.error('[ANNOUNCEMENT_BAR_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in, ONLY show the top red marquee banner when they are on the home page ('/')
  if (isLoggedIn && pathname !== '/') {
    return null;
  }

  const defaultText = "MEETING ROOM EXCLUSIVE: 50% OFF* on first booking | 25% OFF * on full day booking. •";
  const labelList = announcements.length > 0 ? announcements.map(a => a.text) : [defaultText];
  const combinedMarqueeText = labelList.join("  •  ");

  return (
    <div className="bg-red-600 text-white border-b border-red-700 overflow-hidden py-2 px-4 shadow-md relative z-[100] selection:bg-white selection:text-red-600">
      <div className="relative flex overflow-x-hidden group cursor-pointer">
        {/* DUPLICATED SCROLLING TRACK FOR INFINITE MARQUEE */}
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 text-xs md:text-sm font-black uppercase tracking-[0.15em] shrink-0 font-sans">
          <span className="flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{combinedMarqueeText}</span>
          </span>
          <span className="flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{combinedMarqueeText}</span>
          </span>
        </div>

        <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-12 text-xs md:text-sm font-black uppercase tracking-[0.15em] shrink-0 font-sans">
          <span className="flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{combinedMarqueeText}</span>
          </span>
          <span className="flex items-center gap-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>{combinedMarqueeText}</span>
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes marquee2 {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
        .animate-marquee2 {
          animation: marquee2 28s linear infinite;
        }
        .group:hover .animate-marquee,
        .group:hover .animate-marquee2 {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
