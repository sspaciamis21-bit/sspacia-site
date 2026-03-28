"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Ticket as TicketIcon, Clock, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface TicketAttachment {
  id: number;
  url: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  name: string;
  spaceType: string | null;
  location: string | null;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  attachments: TicketAttachment[];
  createdAt: string;
}

export default function UserTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load your tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'RESOLVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
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
    <div className="pb-8">
      <div className="mb-8 pl-2 flex justify-between items-end">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-[#004D40]"
          >
            My Support Tickets
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#616161] mt-2"
          >
            Track the status of your reported issues and requests.
          </motion.p>
        </div>
        <button 
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#CFD8DC] rounded-xl text-sm font-semibold text-[#424242] hover:bg-[#F8F9FA] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#CFD8DC] shadow-sm">
          <TicketIcon className="w-16 h-16 text-[#CFD8DC] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#424242]">No tickets found</h2>
          <p className="text-[#757575] mt-2">You haven't raised any support tickets yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-[#006064] bg-[#E0F7FA] px-3 py-1 rounded-full">
                      {ticket.ticketNumber}
                    </span>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#212121]">{ticket.spaceType || 'General Issue'} - {ticket.location || 'Unknown Location'}</h3>
                </div>
                <div className="text-sm text-[#757575] flex items-center gap-1.5 whitespace-nowrap">
                  <Clock className="w-4 h-4" />
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="bg-[#F8F9FA] p-4 rounded-xl text-sm text-[#424242] mb-4">
                {ticket.description}
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-2">Attachments ({ticket.attachments.length})</h4>
                  <div className="flex flex-wrap gap-3">
                    {ticket.attachments.map((att, i) => (
                      <a 
                        key={att.id} 
                        href={att.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-[#CFD8DC] rounded-lg text-xs font-medium text-[#006064] hover:bg-[#E0F7FA] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Attachment {i + 1}
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
