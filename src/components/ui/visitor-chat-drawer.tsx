"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Phone, Mail, Loader2, Sparkles, Circle } from "lucide-react";
import { toast } from "sonner";

interface VisitorLead {
  id: number;
  username: string;
  email: string;
  mobileNo: string;
  sessionToken: string;
  createdAt: string;
  chatMessages: {
    id: number;
    senderType: string;
    senderName: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }[];
}

export function VisitorChatDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [leads, setLeads] = useState<VisitorLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      const interval = setInterval(fetchLeads, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedLeadId, leads]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/visitor-chats");
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
        if (json.data?.length > 0 && !selectedLeadId) {
          setSelectedLeadId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !replyText.trim()) return;

    setSending(true);
    const msg = replyText.trim();
    setReplyText("");

    try {
      const res = await fetch("/api/admin/visitor-chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unregisteredCustomerId: selectedLeadId, message: msg }),
      });

      if (!res.ok) throw new Error("Failed to send reply");

      fetchLeads();
      toast.success("Reply sent to visitor!");
    } catch (err) {
      console.error(err);
      toast.error("Error sending reply");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* TOP CONCIERGE DRAWER HEADER */}
        <div className="bg-[#1B1C1C] text-white p-5 flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1ab0bc] flex items-center justify-center text-white font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-3">
                <span>Unregistered Users</span>
                <span className="bg-[#1ab0bc]/20 text-[#1ab0bc] border border-[#1ab0bc]/40 text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest">
                  {leads.length} VISITOR THREADS
                </span>
              </h3>
              <p className="text-[10px] text-teal-300/80 font-mono">WhatsApp-style live concierge chat with unregistered website leads</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY SPLIT: WHATSAPP-STYLE SIDEBAR + CONVERSATION WINDOW */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* WHATSAPP-STYLE THREAD LIST SIDEBAR */}
          <div className="w-80 md:w-96 border-r border-gray-200 bg-neutral-100/70 overflow-y-auto divide-y divide-gray-200/60">
            <div className="p-3 bg-neutral-200/50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
              Active Visitors ({leads.length})
            </div>

            {leads.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-wider space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-gray-400" />
                <p>No unregistered visitor chats yet</p>
              </div>
            ) : (
              leads.map((lead) => {
                const isSelected = lead.id === selectedLeadId;
                const unreadCount = lead.chatMessages.filter((m) => m.senderType === "VISITOR" && !m.isRead).length;
                const lastMsg = lead.chatMessages[lead.chatMessages.length - 1];

                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative group ${
                      isSelected ? "bg-white border-l-4 border-[#1ab0bc] shadow-sm" : "hover:bg-white/80"
                    }`}
                  >
                    {/* AVATAR WITH HOVER TOOLTIP (Username • Email • Mobile Number) */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-teal-700 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 uppercase tracking-tighter border border-teal-500">
                        {lead.username.charAt(0)}
                      </div>

                      {/* TOOLTIP ON LOGO HOVER */}
                      <div className="absolute left-12 top-0 hidden group-hover:block z-[9999] bg-[#1B1C1C] text-white text-[11px] p-2.5 shadow-2xl rounded-none whitespace-nowrap font-mono border border-teal-500/50 pointer-events-none animate-in fade-in">
                        <p className="font-bold text-[#1ab0bc] text-xs uppercase">{lead.username}</p>
                        <p className="text-gray-300">✉ {lead.email}</p>
                        <p className="text-gray-300">📞 {lead.mobileNo}</p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 truncate">{lead.username}</span>
                        {unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      {/* MOBILE NO IN SMALL LETTERS */}
                      <p className="text-[10px] text-gray-500 font-mono truncate font-semibold">
                        📞 {lead.mobileNo}
                      </p>

                      {lastMsg && (
                        <p className="text-[11px] text-gray-600 truncate italic mt-1">
                          "{lastMsg.message}"
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ACTIVE CHAT CONVERSATION WINDOW */}
          {selectedLead ? (
            <div className="flex-1 flex flex-col justify-between bg-white overflow-hidden">
              
              {/* VISITOR HEADER WITH HOVER TOOLTIP ON USER LOGO */}
              <div className="p-4 bg-neutral-100 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  
                  {/* USER LOGO AVATAR WITH HOVER TOOLTIP */}
                  <div className="relative group">
                    <div className="w-10 h-10 rounded-full bg-[#1ab0bc] text-white font-bold flex items-center justify-center uppercase cursor-pointer border border-teal-600 shadow-xs">
                      {selectedLead.username.charAt(0)}
                    </div>

                    {/* TOOLTIP ON HOVER */}
                    <div className="absolute left-0 top-12 hidden group-hover:block z-[9999] bg-[#1B1C1C] text-white text-[11px] p-3 shadow-2xl rounded-none whitespace-nowrap font-mono border border-teal-500/50 pointer-events-none animate-in fade-in">
                      <p className="font-bold text-[#1ab0bc] text-xs uppercase">{selectedLead.username}</p>
                      <p className="text-gray-300">Email: {selectedLead.email}</p>
                      <p className="text-gray-300">Mobile: {selectedLead.mobileNo}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <span>{selectedLead.username}</span>
                      <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-1">
                        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Active Lead
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500 font-mono font-semibold">
                      📞 {selectedLead.mobileNo} • ✉ {selectedLead.email}
                    </p>
                  </div>
                </div>

                <span className="text-[9px] font-mono text-gray-400 uppercase hidden sm:inline">
                  Token: {selectedLead.sessionToken.slice(0, 12)}...
                </span>
              </div>

              {/* MESSAGES DISPLAY */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/50">
                {selectedLead.chatMessages.map((msg) => {
                  const isVisitor = msg.senderType === "VISITOR";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}
                    >
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1 px-1">
                        {isVisitor ? `${selectedLead.username} (VISITOR)` : `${msg.senderName} (${msg.senderType})`}
                      </span>
                      <div
                        className={`max-w-[75%] p-3.5 text-xs leading-relaxed shadow-xs ${
                          isVisitor
                            ? "bg-white text-gray-800 border border-gray-200 rounded-none"
                            : "bg-[#1ab0bc] text-white rounded-none"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* REPLY FORM */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 bg-white flex items-center gap-3">
                <input
                  type="text"
                  placeholder={`Reply to ${selectedLead.username} (${selectedLead.mobileNo})...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="bg-[#1ab0bc] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Reply</span>
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-xs font-bold uppercase tracking-wider">
              Select an unregistered visitor lead from the left to start chatting
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
