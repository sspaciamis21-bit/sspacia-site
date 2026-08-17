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
        setAnnouncements(json.data || []);
      }
    } catch (err) {
      console.error('[ANNOUNCEMENT_BAR_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  // If loading, or no active announcements exist, or logged in on subpages, hide the bar completely
  if (loading || announcements.length === 0) {
    return null;
  }

  if (isLoggedIn && pathname !== '/') {
    return null;
  }

  const labelList = announcements.map(a => a.text);
  const combinedMarqueeText = labelList.join("  •  ");

  return (
    <div className="bg-[#1ab0bc] text-white border-b border-teal-600 overflow-hidden py-2 px-4 shadow-md relative z-[100] selection:bg-white selection:text-[#1ab0bc]">
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
