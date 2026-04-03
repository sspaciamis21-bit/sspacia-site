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
      console.error(error);
      toast.error('Failed to load your tickets.');
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#006064] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm">
             <TicketIcon size={28} />
          </div>
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight italic uppercase"
            >
              Support Inventory
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#616161] font-medium text-sm mt-1"
            >
              Track the status of your reported issues and operational requests.
            </motion.p>
          </div>
        </div>
        
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-3 px-6 py-3 bg-[var(--surface-lowest)] border border-[var(--outline-variant)] rounded-2xl text-[11px] font-bold text-[#1B1C1C] uppercase tracking-widest hover:bg-[var(--surface-low)] hover:shadow-md transition-all active:scale-95 group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          Synchronize
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-24 bg-[var(--surface-lowest)] rounded-[3rem] border border-[var(--outline-variant)] shadow-sm flex flex-col items-center">
          <div className="inline-flex p-8 rounded-[2rem] bg-[var(--surface-low)] text-[#9E9E9E] mb-6 shadow-inner">
            <TicketIcon size={48} />
          </div>
          <h2 className="text-xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">No tickets found</h2>
          <p className="text-[#757575] mt-2 max-w-xs font-medium text-sm leading-relaxed">You haven&apos;t raised any support tickets yet. If you need assistance, our team is here to help.</p>
        </div>
      ) : (
        <div className="grid gap-8">
          {tickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--surface-lowest)] rounded-[2.5rem] border border-[var(--outline-variant)] p-8 md:p-10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 blur-3xl -mr-10 -mt-10 group-hover:bg-[var(--primary)]/10 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-4 py-1.5 rounded-xl border border-[var(--primary)]/10 uppercase tracking-widest shadow-sm">
                      {ticket.ticketNumber}
                    </span>
                    <span 
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold border uppercase tracking-widest shadow-sm transition-all"
                      style={{
                        backgroundColor: (typeof ticket.status === 'object' && ticket.status?.color) ? `${ticket.status.color}15` : '#F3F4F6',
                        color: (typeof ticket.status === 'object' && ticket.status?.color) ? ticket.status.color : '#374151',
                        borderColor: (typeof ticket.status === 'object' && ticket.status?.color) ? `${ticket.status.color}30` : '#E5E7EB'
                      }}
                    >
                      {getStatusIcon(ticket.status)}
                      {typeof ticket.status === 'object' 
                        ? (ticket.status.displayName || ticket.status.name?.replace('_', ' '))
                        : ticket.status?.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl md:text-2xl font-display font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">
                      {ticket.productType?.displayName || ticket.spaceType || 'Workspace'} 
                      <span className="mx-2 text-[#9E9E9E]/30 font-light">—</span> 
                      {ticket.locationRel?.name || ticket.location || 'Unknown Location'}
                    </h3>
                    {(ticket.category || ticket.subCategory) && (
                      <p className="text-[11px] font-bold text-[var(--primary)] mt-2 uppercase tracking-[0.2em] italic flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></div>
                         {ticket.category} {ticket.subCategory ? `› ${ticket.subCategory}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-[11px] font-bold text-[#757575] flex items-center gap-2 whitespace-nowrap bg-[var(--surface-low)] px-4 py-2 rounded-xl border border-[var(--outline-variant)]/30 uppercase tracking-tighter italic">
                  <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                  {new Date(ticket.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              
              <div className="bg-[var(--surface-low)]/50 p-6 md:p-8 rounded-[2rem] text-[15px] font-medium text-[#424242] mb-8 border border-[var(--outline-variant)]/20 leading-relaxed shadow-inner">
                {ticket.description}
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="pt-6 border-t border-[var(--outline-variant)]/20">
                  <h4 className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                    <ExternalLink size={12} className="text-[var(--primary)]" />
                    Operational Assets ({ticket.attachments.length})
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {ticket.attachments.map((att, i) => (
                      <a 
                        key={att.id} 
                        href={att.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 px-5 py-3 bg-[var(--surface-lowest)] border border-[var(--outline-variant)] rounded-2xl text-[11px] font-bold text-[var(--primary)] uppercase tracking-widest hover:bg-[var(--surface-low)] hover:shadow-md transition-all active:scale-95 group/btn"
                      >
                        <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                        Asset {i + 1}
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
