"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Ticket as TicketIcon, Clock, CheckCircle, AlertCircle, ExternalLink, RefreshCw, User as UserIcon, MapPin, Layers, ChevronRight } from 'lucide-react';

interface TicketAttachment {
  id: number;
  url: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  name: string;
  organization: string | null;
  spaceType: string | null;
  location: string | null;
  locationRel: { id: number; name: string } | null;
  productTypeId: number | null;
  productType: { id: number; name: string; displayName: string } | null;
  category: string | null;
  subCategory: string | null;
  description: string;
  status: any;
  attachments: TicketAttachment[];
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-black text-[#616161] uppercase tracking-[0.2em] mb-2">
      {children} {required && <span className="text-[var(--primary)]">*</span>}
    </label>
  );
}

export default function AdminTicketsPage() {
  const { isRole } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets`);
      const json = await res.json();
      setTickets(json.data ?? []);
    } catch (error) {
      toast.error('Direct link failed: Signal lost');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRole('ADMIN')) fetchTickets();
  }, [isRole]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success('System state updated');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: { ...t.status, name: newStatus } } : t));
    } catch {
      toast.error('Command rejected: Handshake unsuccessful');
    }
  };

  if (!isRole('ADMIN')) return null;

  return (
    <div className="space-y-12 pb-20">
       {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
            <TicketIcon size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Support Terminal</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">Processing inbound requests and structural reports</p>
          </div>
        </div>

        <button 
          onClick={fetchTickets}
          className="flex items-center justify-center gap-4 px-10 py-5 bg-[var(--primary)] text-white rounded-none text-[11px] font-black uppercase tracking-[0.3em] hover:bg-neutral-900 transition-all shadow-2xl border border-transparent group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Poll Registry
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-[var(--outline-variant)]/40 rounded-none shadow-2xl px-10 py-40 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-6" />
            <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em] animate-pulse">Establishing Secure Uplink...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-[var(--outline-variant)]/40 rounded-none shadow-2xl px-10 py-40 text-center">
           <TicketIcon size={48} className="mx-auto mb-6 text-[#1B1C1C] opacity-20" />
           <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Zero Tickets Detected</p>
           <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-2 opacity-60 italic">Terminal is in standby mode. No urgent transmissions.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-none border border-[var(--outline-variant)]/40 p-8 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-[var(--primary)]" />
              
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-[10px] font-black text-[#1B1C1C] bg-neutral-100 px-4 py-1.5 rounded-none tracking-widest border border-[var(--outline-variant)]/40 shadow-sm uppercase">
                      ID: {ticket.ticketNumber}
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white text-[var(--primary)] text-[9px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/40">
                      <div className={`h-2 w-2 rounded-none ${ticket.status.name === 'OPEN' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-[#4DB6AC]'}`} />
                      {ticket.status.displayName || ticket.status.name}
                    </span>
                    <div className="ml-auto flex items-center gap-2 text-[10px] font-black text-[#9E9E9E] uppercase tracking-widest opacity-60">
                      <Clock className="w-4 h-4 opacity-40" />
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase mb-2">
                       {ticket.productType?.displayName || ticket.spaceType || 'Unknown Asset'} › {ticket.locationRel?.name || ticket.location || 'Unknown Sector'}
                    </h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest bg-white px-3 py-1 border border-[var(--outline-variant)]/40 shadow-sm">
                         {ticket.category || 'GENERAL_REPORT'}
                       </span>
                       {ticket.subCategory && (
                         <span className="text-[9px] font-black text-[#616161] uppercase tracking-widest bg-neutral-100 px-3 py-1">
                           {ticket.subCategory}
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-6 border border-[var(--outline-variant)]/20 text-sm font-bold text-[#424242] leading-relaxed uppercase tracking-wide">
                    {ticket.description}
                  </div>

                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Payload Attachments ({ticket.attachments.length})</h4>
                      <div className="flex flex-wrap gap-2">
                        {ticket.attachments.map((att, i) => (
                          <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 bg-white border border-[var(--outline-variant)]/40 text-[9px] font-black text-[#1B1B1B] uppercase tracking-widest hover:bg-[#1B1B1B] hover:text-[var(--primary)] transition-all shadow-sm">
                            <ExternalLink size={12} /> SCAN_ATTACHMENT_0{i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Panel */}
                <div className="lg:w-80 space-y-6">
                  <div className="p-6 bg-neutral-50 border border-[var(--outline-variant)]/20 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-[var(--outline-variant)]/10">Reporter Profile</h4>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white text-[var(--primary)] flex items-center justify-center border border-[var(--outline-variant)]/40 shadow-sm">
                            <UserIcon size={18} />
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-wider">{ticket.name}</p>
                            {ticket.organization && <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest opacity-60 mt-0.5">{ticket.organization}</p>}
                          </div>
                        </div>
                        {ticket.user && (
                          <div className="p-3 bg-white border border-[var(--outline-variant)]/20 text-[10px] font-mono text-[#616161] lowercase italic break-all">
                             {ticket.user.email}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-[var(--outline-variant)]/10">
                      <Label htmlFor={`status-${ticket.id}`} required>Override Status</Label>
                      <div className="relative">
                        <select
                          id={`status-${ticket.id}`}
                          value={ticket.status.name}
                          onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-[var(--outline-variant)]/40 rounded-none text-[10px] font-black text-[#1B1B1B] uppercase tracking-widest focus:outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer"
                        >
                          <option value="OPEN">SIGNAL_OPEN</option>
                          <option value="IN_PROGRESS">IN_TRANSMISSION</option>
                          <option value="RESOLVED">SYNC_COMPLETE</option>
                          <option value="CLOSED">COMM_CLOSED</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#9E9E9E] pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>
                  
                  <button className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#1B1B1B] text-[#1B1B1B] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all opacity-40 hover:opacity-100">
                    Terminal Log Access
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
