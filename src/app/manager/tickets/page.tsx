'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Ticket {
  id: number;
  ticketNumber: string;
  name: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  location?: string;
}

export default function ManagerTicketsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTabTickets, setSelectedTabTickets] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('OPEN');

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('manage_location_tickets')) {
        toast.error('Unauthorized to view tickets.');
        router.push('/manager/dashboard');
        return;
      }
      fetchTickets();
    }
  }, [user, authLoading, hasPermission, router]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/tickets', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-700 border border-red-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'RESOLVED': return 'bg-green-100 text-green-700 border border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-700 border border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle size={14} />;
      case 'IN_PROGRESS': return <Clock size={14} />;
      case 'RESOLVED': return <CheckCircle size={14} />;
      case 'CLOSED': return <XCircle size={14} />;
      default: return <AlertCircle size={14} />;
    }
  };

  const filteredTickets = selectedTabTickets === 'ALL' 
    ? tickets 
    : tickets.filter(t => t.status === selectedTabTickets);

  if (loading || authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex items-center gap-4 mb-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <AlertCircle size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Support Tickets</h1>
            <p className="text-[#616161] font-medium text-sm mt-1">Manage tickets from your assigned locations</p>
          </div>
        </div>

        <div className="bg-[var(--surface-lowest)] rounded-3xl p-8 border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden">
          <div className="flex gap-4 mb-10 overflow-x-auto pb-2 no-scrollbar border-b border-[var(--outline-variant)]/30">
            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTabTickets(tab as 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED')}
                className={`px-6 py-3 rounded-xl whitespace-nowrap font-bold text-[11px] uppercase tracking-widest transition-all -mb-[1px] border-2 ${
                  selectedTabTickets === tab
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/20'
                    : 'bg-transparent text-[#616161] hover:text-[var(--primary)] hover:bg-[var(--surface-low)] border-transparent'
                }`}
              >
                {tab === 'IN_PROGRESS' ? 'In Progress' : tab}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-[#9E9E9E]">
              <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
                <AlertCircle size={48} />
              </div>
              <p className="font-display font-bold text-xl text-[#1B1C1C]">No {selectedTabTickets === 'ALL' ? 'tickets' : selectedTabTickets.toLowerCase()} found</p>
              <p className="text-sm font-medium mt-2">There are currently no tickets in this category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]/30">
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Ticket #</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Name</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Location</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-[var(--surface-low)]/30 transition-colors group">
                      <td className="py-5 px-4 font-display font-bold text-[var(--primary)] group-hover:underline cursor-pointer">{ticket.ticketNumber}</td>
                      <td className="py-5 px-4 font-bold text-[#1B1C1C]">{ticket.name}</td>
                      <td className="py-5 px-4 text-[#616161] font-medium text-sm">{ticket.location || '—'}</td>
                      <td className="py-5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          {ticket.status === 'IN_PROGRESS' ? 'In Progress' : ticket.status}
                        </span>
                      </td>
                      <td className="py-5 px-4 text-[#616161] font-bold text-[11px] uppercase tracking-tighter">
                        {new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
