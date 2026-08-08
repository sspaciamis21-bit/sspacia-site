'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Ticket, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';

interface UserNotif {
  id: number;
  title: string;
  message: string;
  ticketId: number | null;
  isRead: boolean;
  createdAt: string;
}

export function UserNotificationBell() {
  const [notifications, setNotifications] = useState<UserNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch {
      // Quiet fail during server reload
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // poll every 20s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      setLoading(true);
      await fetch('/api/user/notifications', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white border border-[var(--outline-variant)] shadow-xs hover:border-[var(--primary)] hover:bg-[var(--surface-low)] transition-all flex items-center justify-center text-[#1B1C1C]"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-[#616161]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-[var(--outline-variant)] shadow-2xl z-[150] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-[#006064] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-300" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[9px] font-bold uppercase tracking-wider text-emerald-200 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 transition-colors"
                >
                  <Check className="w-3 h-3" /> Mark All Read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs uppercase tracking-widest font-bold">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 transition-colors ${!n.isRead ? 'bg-teal-50/60 border-l-4 border-l-[#006064]' : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-[12px] font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-[#006064] shrink-0" />
                        {n.title}
                      </h4>
                      <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1 font-medium leading-normal">
                      {n.message}
                    </p>
                    {n.ticketId && (
                      <Link
                        href="/dashboard/tickets"
                        onClick={() => setIsOpen(false)}
                        className="inline-block mt-2 text-[10px] font-black text-[#006064] uppercase tracking-wider hover:underline"
                      >
                        View Ticket & Chat →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
