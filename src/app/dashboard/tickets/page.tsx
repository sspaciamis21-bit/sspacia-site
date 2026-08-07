"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Ticket as TicketIcon, Clock, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface TicketAttachment {
  id: number;
  url: string;
}

interface SupportTicketStatus {
  name: string;
  color?: string;
  displayName?: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  name: string;
  spaceType: string | null;
  location: string | null;
  locationRel: { id: number; name: string } | null;
  productTypeId: number | null;
  productType: { id: number; name: string; displayName: string } | null;
  category: string | null;
  subCategory: string | null;
  description: string;
  status: string | SupportTicketStatus;
  attachments: TicketAttachment[];
  createdAt: string;
}

export default function UserTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const json = await res.json();
      if (json.data) setTickets(json.data);
    } catch (error) {
      console.error('Tickets fetch error:', error);
      // Suppress toast for new users who might not have tickets yet
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);



  const getStatusIcon = (statusInput: string | SupportTicketStatus) => {
    const status = typeof statusInput === 'object' ? statusInput.name : statusInput;
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-4 h-4" />;
      case 'IN_PROGRESS': return <RefreshCw className="w-4 h-4 animate-spin-slow" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="inline-flex p-3 bg-[var(--primary)] text-white shadow-sm">
             <TicketIcon size={22} />
          </div>
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight uppercase"
            >
              My Tickets
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#616161] font-bold text-[10px] uppercase tracking-widest mt-1 opacity-50"
            >
              Track and manage your support tickets below.
            </motion.p>
          </div>
        </div>
        
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-3 px-6 py-4 bg-white border border-[var(--outline-variant)] rounded-none text-[10px] font-black text-[#1B1C1C] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all group"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-24 bg-[var(--surface-lowest)] rounded-none border border-[var(--outline-variant)] flex flex-col items-center">
          <div className="inline-flex p-8 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[#9E9E9E] mb-6">
            <TicketIcon size={40} />
          </div>
          <h2 className="text-xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">No tickets found</h2>
          <p className="text-[#9E9E9E] mt-2 max-w-xs font-bold text-[10px] uppercase tracking-widest leading-relaxed">You haven&apos;t raised any support tickets yet.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {tickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-none border border-[var(--outline-variant)] p-10 md:p-12 transition-all hover:border-[var(--primary)] group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-3xl -mr-10 -mt-10 group-hover:bg-[var(--primary)]/10 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[9px] font-black text-white bg-black px-3 py-1.5 rounded-none uppercase tracking-widest">
                      {ticket.ticketNumber}
                    </span>
                    <span 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[9px] font-black border uppercase tracking-widest transition-all"
                      style={{
                        backgroundColor: (typeof ticket.status === 'object' && ticket.status?.color) ? `${ticket.status.color}05` : '#FFFFFF',
                        color: (typeof ticket.status === 'object' && ticket.status?.color) ? ticket.status.color : '#374151',
                        borderColor: (typeof ticket.status === 'object' && ticket.status?.color) ? `${ticket.status.color}20` : '#E5E7EB'
                      }}
                    >
                      {getStatusIcon(ticket.status)}
                      {typeof ticket.status === 'object' 
                        ? (ticket.status.displayName || ticket.status.name?.replace('_', ' '))
                        : ticket.status?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-[#1B1C1C]">
                      {ticket.productType?.displayName || ticket.spaceType || 'Workspace'} 
                      <span className="mx-2 text-[#9E9E9E]/20 font-light">—</span> 
                      {ticket.locationRel?.name || ticket.location || 'Unknown Location'}
                    </h3>
                    {(ticket.category || ticket.subCategory) && (
                      <p className="text-[10px] font-black text-[var(--primary)] mt-2 uppercase tracking-[0.15em] flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-[var(--primary)]"></div>
                         {ticket.category} {ticket.subCategory ? `› ${ticket.subCategory}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-[10px] font-black text-[#9E9E9E] flex items-center gap-2 uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                  {new Date(ticket.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              
              <div className="bg-[var(--surface-low)]/30 p-8 rounded-none text-[14px] font-bold text-[#424242] mb-8 border border-[var(--outline-variant)]/30 leading-relaxed">
                {ticket.description}
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="pt-6 border-t border-[var(--outline-variant)]/20">
                  <h4 className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ExternalLink size={12} className="text-[var(--primary)]" />
                    Attachments ({ticket.attachments.length})
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {ticket.attachments.map((att, i) => (
                      <a 
                        key={att.id} 
                        href={att.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-low)] border border-[var(--outline-variant)] rounded-none text-[9px] font-black text-[#1B1C1C] uppercase tracking-widest hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        File {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
