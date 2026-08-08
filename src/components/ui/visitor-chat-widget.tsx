"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, User, Mail, Phone, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface ChatMessage {
  id: number;
  senderType: 'VISITOR' | 'ADMIN' | 'MANAGER';
  senderName: string;
  message: string;
  createdAt: string;
}

export function VisitorChatWidget() {
  const { user, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [leadInfo, setLeadInfo] = useState<{ username: string; email: string; mobileNo: string } | null>(null);

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [registering, setRegistering] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hide visitor chat widget completely for any logged in user
  if (isLoggedIn) {
    return null;
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("sspacia_visitor_token");
    const savedLead = localStorage.getItem("sspacia_visitor_lead");
    if (savedToken) {
      setSessionToken(savedToken);
      if (savedLead) {
        try { setLeadInfo(JSON.parse(savedLead)); } catch (e) {}
      }
    }
  }, []);

  // Poll messages when chat is open and session exists
  useEffect(() => {
    if (!sessionToken || !isOpen) return;

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [sessionToken, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`/api/public/visitor-chat?sessionToken=${sessionToken}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.lead) {
          setLeadInfo(data.lead);
        }
      }
    } catch (err) {
      console.error("Chat poll error:", err);
    }
  };

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);

    try {
      const res = await fetch("/api/public/visitor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, mobileNo }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to initialize session");
      }

      const data = await res.json();
      const token = data.lead.sessionToken;
      setSessionToken(token);
      setLeadInfo(data.lead);

      localStorage.setItem("sspacia_visitor_token", token);
      localStorage.setItem("sspacia_visitor_lead", JSON.stringify(data.lead));

      toast.success(`Welcome ${data.lead.username}! You can now chat live with our space managers.`);
      fetchMessages();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error starting chat");
    } finally {
      setRegistering(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !sessionToken) return;

    setSending(true);
    const msgText = inputMsg.trim();
    setInputMsg("");

    try {
      const res = await fetch("/api/public/visitor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, message: msgText }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to send message");
      }

      fetchMessages();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999]">
      
      {/* ── FLOATING CHAT BUTTON ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#1ab0bc] hover:bg-teal-600 text-white p-4 rounded-full shadow-[0_10px_30px_rgba(26,176,188,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white relative group"
        title="Live Chat with SSPACIA Managers"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white"></span>
      </button>

      {/* ── CHAT WINDOW MODAL ── */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[400px] h-[520px] bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300">
          
          {/* HEADER */}
          <div className="bg-[#1B1C1C] text-white p-4 flex items-center justify-between border-b border-teal-500/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1ab0bc] flex items-center justify-center font-black text-xs text-white">
                SS
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  <span>SSPACIA Live Concierge</span>
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                </h4>
                <p className="text-[10px] text-teal-300/80 font-mono">Chat with Community Manager</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BODY: FORM VS MESSAGES */}
          {!sessionToken ? (
            /* ── PRE-CHAT VISITOR FORM ── */
            <form onSubmit={handleRegisterVisitor} className="p-6 flex-1 flex flex-col justify-between space-y-4 bg-neutral-50/50">
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-none">
                  <p className="text-xs text-teal-800 font-medium leading-relaxed">
                    👋 Welcome! Enter your contact details to instantly chat with our office space managers.
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-[#1ab0bc]" />
                    <span>Your Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#1ab0bc]" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#1ab0bc]" />
                    <span>Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full bg-[#1ab0bc] text-white py-3 text-xs font-black uppercase tracking-[0.2em] shadow-md hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
              >
                {registering ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>START LIVE CHAT</span>}
              </button>
            </form>
          ) : (
            /* ── LIVE MESSAGING INTERFACE ── */
            <div className="flex-1 flex flex-col justify-between bg-neutral-100 overflow-hidden">
              
              {/* MESSAGES LIST */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-[#1ab0bc] mx-auto opacity-50" />
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Session Active</p>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                      Ask us anything about pricing, cabin availability, or booking a tour!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isVisitor = msg.senderType === 'VISITOR';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest px-1 mb-1 font-bold">
                          {msg.senderName} ({msg.senderType})
                        </span>
                        <div
                          className={`max-w-[80%] p-3 text-xs leading-relaxed shadow-sm ${
                            isVisitor
                              ? 'bg-[#1ab0bc] text-white rounded-none'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT BOX */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                />
                <button
                  type="submit"
                  disabled={sending || !inputMsg.trim()}
                  className="bg-[#1ab0bc] text-white p-2.5 hover:bg-teal-600 transition-all disabled:opacity-50"
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
