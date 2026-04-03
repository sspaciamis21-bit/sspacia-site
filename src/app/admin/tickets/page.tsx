"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Ticket as TicketIcon, Clock, CheckCircle, AlertCircle, ExternalLink, RefreshCw, User as UserIcon } from 'lucide-react';

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
  status: any; // Object ({ name: 'OPEN', color: '#F59E0B', displayName: 'Open' })
  attachments: TicketAttachment[];
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
}

export default function AdminTicketsPage() {
  const { isRole } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const json = await res.json();
      // Extract tickets from 'data' property of the standardized response
      setTickets(json.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load tickets.');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRole('ADMIN')) {
      fetchTickets();
    }
  }, [isRole]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/tickets`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      toast.success('Ticket status updated');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: { name: newStatus } } : t));
    } catch (error) {
      console.error(error);
      toast.error('Could not update ticket status');
    }
  };



  const getStatusIcon = (statusInput: any) => {
    const status = typeof statusInput === 'object' && statusInput !== null ? statusInput.name : statusInput;
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-4 h-4" />;
      case 'IN_PROGRESS': return <RefreshCw className="w-4 h-4 animate-spin-slow" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4" />;
      default: return <TicketIcon className="w-4 h-4" />;
    }
  };

  if (!isRole('ADMIN')) return null;

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
            Support Tickets
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#616161] mt-2"
          >
            Manage and respond to member support requests.
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
          <p className="text-[#757575] mt-2">All clear! There are no support tickets in the system.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {tickets.map((ticket, idx) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-[#CFD8DC] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div 
                className="absolute top-0 left-0 w-1.5 h-full" 
                style={{ backgroundColor: (typeof ticket.status === 'object' && ticket.status?.color) ? ticket.status.color : '#9CA3AF' }}
              />
              
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-bold text-[#006064] bg-[#E0F7FA] px-3 py-1 rounded-full">
                      {ticket.ticketNumber}
                    </span>
                    <span 
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
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
                    <div className="text-sm text-[#757575] flex items-center gap-1.5 whitespace-nowrap ml-auto">
                      <Clock className="w-4 h-4" />
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-[#212121] mb-1">
                    {ticket.productType?.displayName || ticket.spaceType || 'Workspace'} - {ticket.locationRel?.name || ticket.location || 'Unknown Location'}
                  </h3>

                  {(ticket.category || ticket.subCategory) && (
                    <p className="text-xs font-bold text-[#006064] uppercase tracking-wider mb-3 bg-[#E0F7FA]/50 inline-block px-2 py-0.5 rounded">
                       {ticket.category} {ticket.subCategory ? `› ${ticket.subCategory}` : ''}
                    </p>
                  )}
                  
                  <div className="bg-[#F8F9FA] p-4 rounded-xl text-sm text-[#424242] mb-4 border border-[#CFD8DC]/50 leading-relaxed">
                    {ticket.description}
                  </div>

                  {ticket.attachments && ticket.attachments.length > 0 && (
                    <div className="mb-4">
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
                            View Attachment {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:w-72 shrink-0 space-y-4">
                  <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#CFD8DC]/50">
                    <h4 className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-3">Reporter Info</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-sm text-[#424242]">
                        <UserIcon className="w-4 h-4 text-[#006064] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{ticket.name}</p>
                          {ticket.organization && <p className="text-xs text-[#757575]">{ticket.organization}</p>}
                          {ticket.user && <p className="text-xs text-[#006064]">{ticket.user.email}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-[#CFD8DC]/50">
                    <label className="block text-xs font-bold text-[#757575] uppercase tracking-wider mb-2">Update Status</label>
                    <select
                      value={typeof ticket.status === 'object' && ticket.status !== null ? ticket.status.name : ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className="w-full text-sm rounded-lg border border-[#CFD8DC] bg-white px-3 py-2 outline-none transition-all focus:border-[#006064] focus:ring-1 focus:ring-[#006064]/20"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
