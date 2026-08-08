"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Phone, Mail, Loader2, Sparkles } from "lucide-react";
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
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-[#1B1C1C] text-white p-5 flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#1ab0bc]" />
            <div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                <span>Visitor Live Concierge Desk</span>
                <span className="bg-[#1ab0bc] text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest">
                  {leads.length} LEADS
                </span>
              </h3>
              <p className="text-[10px] text-teal-300/80 font-mono">Live chats with prospective unregistered website visitors</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY SPLIT: LEADS SIDEBAR + CHAT CONVERSATION */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEADS LIST SIDEBAR */}
          <div className="w-80 border-r border-gray-200 bg-neutral-50 overflow-y-auto divide-y divide-gray-200">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-wider">
                No active visitor chats yet
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
                    className={`w-full text-left p-4 transition-all flex items-start justify-between gap-2 ${
                      isSelected ? "bg-white border-l-4 border-[#1ab0bc] shadow-sm" : "hover:bg-neutral-100"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 truncate">{lead.username}</span>
                        {unreadCount > 0 && (
                          <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{lead.email}</p>
                      {lastMsg && (
                        <p className="text-[11px] text-gray-600 truncate mt-1 italic">
                          "{lastMsg.message}"
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* CHAT MESSAGES DISPLAY */}
          {selectedLead ? (
            <div className="flex-1 flex flex-col justify-between bg-white overflow-hidden">
              
              {/* VISITOR LEAD DETAILS TOP BAR */}
              <div className="p-4 bg-neutral-100 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 font-bold text-gray-800">
                    <User className="w-4 h-4 text-[#1ab0bc]" />
                    <span>{selectedLead.username}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 font-mono">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedLead.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600 font-mono">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedLead.mobileNo}</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-gray-400 uppercase">
                  Session: {selectedLead.sessionToken.slice(0, 10)}...
                </span>
              </div>

              {/* MESSAGES */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/50">
                {selectedLead.chatMessages.map((msg) => {
                  const isVisitor = msg.senderType === "VISITOR";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}
                    >
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        {msg.senderName} ({msg.senderType})
                      </span>
                      <div
                        className={`max-w-[75%] p-3.5 text-xs leading-relaxed ${
                          isVisitor
                            ? "bg-white text-gray-800 border border-gray-200 shadow-xs"
                            : "bg-[#1ab0bc] text-white shadow-xs"
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
                  placeholder={`Reply to ${selectedLead.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="bg-[#1ab0bc] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-teal-600 transition-all flex items-center gap-2"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Reply</span>
                </button>
              </form>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-xs font-bold uppercase tracking-wider">
              Select a visitor lead from the left to view conversation
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
