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

  // Hide visitor chat & whatsapp widget completely for any logged in user
  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 font-sans">
      
      {/* ── FLOATING LIVE CHAT BUTTON ── */}
      <div className="relative group">
        {/* Dynamic Light Span Glowing Border Ring */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#1ab0bc] via-cyan-400 to-teal-300 opacity-75 blur-[3px] animate-pulse group-hover:opacity-100 transition duration-300"></span>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-11 h-11 sm:w-12 sm:h-12 bg-[#1ab0bc] hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white relative z-10 cursor-pointer"
          title="Live Chat with SSPACIA Managers"
        >
          {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-ping"></span>
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>

      {/* ── WHATSAPP BUTTON (BELOW LIVE CHAT) ── */}
      <div className="relative group">
        {/* Dynamic Light Span Glowing Border Ring */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-300 opacity-80 blur-[3px] animate-pulse group-hover:opacity-100 transition duration-300"></span>

        <a
          href="https://wa.me/917600393779"
          target="_blank"
          rel="noopener noreferrer"
          className="w-11 h-11 sm:w-12 sm:h-12 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white relative z-10 cursor-pointer"
          title="Chat on WhatsApp (+91 7600393779)"
        >
          <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      </div>

      {/* ── CHAT WINDOW MODAL ── */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[360px] sm:w-[400px] h-[520px] bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300 rounded-none z-50">
          
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
                          {isVisitor ? 'You' : `${msg.senderName} (${msg.senderType})`}
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
                  className="bg-[#1ab0bc] text-[#fff] p-2.5 hover:bg-teal-600 transition-all disabled:opacity-50"
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
