"use client";

import React, { useState } from "react";
import { X, Calendar, User, Mail, Phone, MapPin, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface BookTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookTourModal({ isOpen, onClose }: BookTourModalProps) {
  const [username, setUsername] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [locationName, setLocationName] = useState("Premier House (SG Highway)");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/visitor-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          mobileNo,
          locationName,
          preferredDate,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to submit tour request");
      }

      setIsSuccess(true);
      toast.success("Tour request received!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error booking tour");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl my-auto relative rounded-sm">
        
        {/* TOP HEADER */}
        <div className="bg-[#1B1C1C] text-white p-6 flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1ab0bc] flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                <span>Book a Workspace Tour</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-[10px] text-teal-300/80 font-mono">Visit our premium coworking spaces in Ahmedabad</p>
            </div>
          </div>
          <button
            onClick={() => { setIsSuccess(false); onClose(); }}
            className="text-white/60 hover:text-white p-1 font-bold"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* MODAL BODY */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-6 bg-emerald-50/50">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h4 className="font-display text-2xl font-black uppercase text-[#1B1C1C]">
                YOUR TOUR IS REQUESTED!
              </h4>
              <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                Thank you <strong>{username}</strong>! Our space manager <strong>Nikhil Dave</strong> will contact you shortly on <strong>{mobileNo}</strong> to confirm your visit.
              </p>
            </div>

            <div className="bg-white p-4 border border-emerald-200 text-xs font-mono space-y-1 text-emerald-900">
              <p><strong>Manager Contact:</strong> Nikhil Dave</p>
              <p><strong>Phone:</strong> <a href="tel:+917600393779" className="underline font-bold">+91 76003 93779</a></p>
              <p><strong>Location:</strong> {locationName}</p>
            </div>

            <button
              onClick={() => { setIsSuccess(false); onClose(); }}
              className="bg-[#1ab0bc] text-white px-8 py-3 text-xs font-black uppercase tracking-[0.2em] shadow-md hover:bg-teal-600 transition-all"
            >
              CLOSE WINDOW
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-neutral-50/50">
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#1ab0bc]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#1ab0bc]" />
                  <span>Mobile Number (+91)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#1ab0bc]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#1ab0bc]" />
                  <span>Preferred Office Location</span>
                </label>
                <select
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-bold bg-white"
                >
                  <option value="Premier House (SG Highway)">Premier House - SG Highway, Bodakdev</option>
                  <option value="Mercado (Sindhu Bhavan Marg)">Mercado - Sindhu Bhavan Marg</option>
                  <option value="Agarwal Complex (C.G. Road)">Agarwal Complex - C.G. Road, Navrangpura</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#1ab0bc]" />
                  <span>Preferred Visit Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1ab0bc] text-white py-3 text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>REQUEST TOUR VISIT NOW</span>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
