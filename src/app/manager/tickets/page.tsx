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
  status: {
    name: string;
    displayName: string;
  };
  createdAt: string;
  locationRel?: {
    name: string;
  };
}

export default function ManagerTicketsPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('tickets.view')) {
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
      const response = await fetch('/api/admin/tickets', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setTickets(data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: number, statusName: string) => {
    try {
      setUpdatingStatus(ticketId);
      const response = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticketId, status: statusName }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      
      // Update local state
      setTickets((prev) => 
        prev.map((t) => t.id === ticketId ? { ...t, status: data.data.status } : t)
      );
      
      toast.success(`Ticket status updated to ${statusName.replace('_', ' ')}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update ticket status');
    } finally {
      setUpdatingStatus(null);
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

  const filteredTickets = statusFilter === 'ALL' 
    ? tickets 
    : tickets.filter(t => t.status.name === statusFilter);

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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 overflow-x-auto pb-2 no-scrollbar border-b border-[var(--outline-variant)]/30">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Filter By Status:</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED')}
                className="bg-[var(--surface-low)] text-[#1B1C1C] border border-[var(--outline-variant)]/30 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-[var(--primary)] outline-none"
              >
                <option value="ALL">All Tickets</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div className="text-[11px] font-bold text-[#616161] uppercase tracking-widest bg-[var(--surface-low)] px-4 py-2 rounded-xl">
              Showing {filteredTickets.length} {statusFilter === 'ALL' ? '' : statusFilter.replace('_', ' ')} Tickets
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-[#9E9E9E]">
              <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
                <AlertCircle size={48} />
              </div>
              <p className="font-display font-bold text-xl text-[#1B1C1C]">No {statusFilter === 'ALL' ? 'tickets' : statusFilter.toLowerCase()} found</p>
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
                      <td className="py-5 px-4 text-[#616161] font-medium text-sm">{ticket.locationRel?.name || '—'}</td>
                      <td className="py-5 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${getStatusColor(ticket.status.name)}`}>
                          {updatingStatus === ticket.id ? (
                            <Loader size={12} className="animate-spin" />
                          ) : (
                            getStatusIcon(ticket.status.name)
                          )}
                          <select
                            value={ticket.status.name}
                            disabled={updatingStatus === ticket.id}
                            onChange={(e) => handleStatusUpdate(ticket.id, e.target.value)}
                            className="bg-transparent border-none p-0 ml-1 text-[10px] font-bold uppercase focus:ring-0 cursor-pointer outline-none active:outline-none"
                          >
                            <option value="OPEN" className="bg-white text-black">Open</option>
                            <option value="IN_PROGRESS" className="bg-white text-black">In Progress</option>
                            <option value="RESOLVED" className="bg-white text-black">Resolved</option>
                            <option value="CLOSED" className="bg-white text-black">Closed</option>
                          </select>
                        </div>
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
