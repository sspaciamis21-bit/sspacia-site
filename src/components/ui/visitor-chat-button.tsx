"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface VisitorChatButtonProps {
  onClick: () => void;
}

export function VisitorChatButton({ onClick }: VisitorChatButtonProps) {
  const { user } = useAuth();
  const isAccountant =
    user?.email?.toLowerCase() === "ssinfrazone21@gmail.com" ||
    user?.role?.toUpperCase() === "ACCOUNTS" ||
    user?.role?.toUpperCase() === "ACCOUNTANT" ||
    user?.name?.toLowerCase() === "accounts";

  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    if (isAccountant) return;
    try {
      const res = await fetch("/api/admin/visitor-chats");
      if (res.ok) {
        const json = await res.json();
        const leads = json.data || [];
        
        // Count total unread messages from visitors
        let count = 0;
        leads.forEach((lead: any) => {
          const unreadVisitorMsgs = lead.chatMessages?.filter(
            (msg: any) => msg.senderType === "VISITOR" && !msg.isRead
          ).length || 0;
          count += unreadVisitorMsgs;
        });

        setUnreadCount(count);
      }
    } catch (error) {
      // Silently catch in polling
    }
  }, []);

  useEffect(() => {
    if (isAccountant) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 8000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, isAccountant]);

  if (isAccountant) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative bg-[#1ab0bc]/10 hover:bg-[#1ab0bc] text-[#1ab0bc] hover:text-white px-2.5 sm:px-3 py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-[#1ab0bc]/30 cursor-pointer shadow-xs focus:outline-none"
      title="Open Visitor Live Chat Drawer"
    >
      <MessageSquare size={14} />
      <span className="hidden sm:inline">Visitor Live Chat</span>
      <span className="sm:hidden">Chat</span>

      {/* ── LIVE UNREAD MESSAGE BADGE (Matching Bell Icon Style) ── */}
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white rounded-full animate-pulse shadow-xs">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
