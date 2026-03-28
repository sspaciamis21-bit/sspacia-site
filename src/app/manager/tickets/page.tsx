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
      const response = await fetch('/api/manager/dashboard', {
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
        <Loader size={48} className="text-[#006064] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeUp>
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#006064]/10">
            <AlertCircle size={32} className="text-[#006064]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#004D40]">Support Tickets</h1>
            <p className="text-[#616161]">Manage tickets from your assigned locations</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E0E0E0] shadow-sm">
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-[#E0E0E0]">
            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTabTickets(tab as 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED')}
                className={`px-5 py-2.5 rounded-t-lg whitespace-nowrap font-bold text-sm transition-all -mb-[1px] ${
                  selectedTabTickets === tab
                    ? 'bg-[#006064] text-white'
                    : 'bg-white text-[#616161] hover:bg-[#F5F5F5] border border-transparent'
                }`}
              >
                {tab === 'IN_PROGRESS' ? 'In Progress' : tab}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-[#9E9E9E]">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-semibold text-lg">No {selectedTabTickets === 'ALL' ? 'tickets' : selectedTabTickets.toLowerCase()} found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E0E0E0]">
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Ticket #</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Name</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Location</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Status</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="p-4 font-bold text-[#006064]">{ticket.ticketNumber}</td>
                      <td className="p-4 font-semibold text-[#004D40]">{ticket.name}</td>
                      <td className="p-4 text-[#616161]">{ticket.location || '—'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          {ticket.status === 'IN_PROGRESS' ? 'In Progress' : ticket.status}
                        </span>
                      </td>
                      <td className="p-4 text-[#616161] font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString()}
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
