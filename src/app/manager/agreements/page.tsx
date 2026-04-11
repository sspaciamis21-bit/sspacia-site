'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Loader, 
  Calendar, 
  User, 
  MapPin, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye,
  Filter
} from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Agreement {
  id: number;
  title: string;
  customer: {
    name: string;
    email: string;
  };
  status: {
    name: string;
    displayName: string;
    color: string;
  };
  fileUrl: string;
  fileName: string;
  createdAt: string;
  expiresAt: string | null;
  category: { slug: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerAgreementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'EXPIRED'>('ALL');

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/documents');
      const json = await res.json();
      if (res.ok) {
          // Filter only agreements for this specialized view
          const data = (json.data as Agreement[]).filter(d => 
              d.category.slug.includes('agreement') || d.category.slug.includes('contract')
          );
          setAgreements(data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return agreements.filter(agr => {
      const matchesSearch = agr.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           agr.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || agr.status.name === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agreements, searchQuery, statusFilter]);

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="inline-flex p-4 rounded-3xl bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/10">
              <FileText size={28} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Legal Agreements</h1>
              <p className="text-[#616161] font-medium text-sm mt-1">Manage lease contracts, membership agreements, and legal documentation</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-lowest)] rounded-[2.5rem] p-4 md:p-10 border border-[var(--outline-variant)]/40 shadow-sm">
          {/* Internal Filters Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
            <div className="relative w-full lg:max-w-lg">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={20} />
              <input 
                type="text"
                placeholder="Search agreements by title or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/30 rounded-[1.25rem] pl-14 pr-6 py-4.5 text-sm font-medium focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm transition-all"
              />
            </div>
            
            <div className="flex items-center gap-3 p-1.5 bg-[var(--surface-low)]/50 rounded-2xl border border-[var(--outline-variant)]/30">
              {(['ALL', 'ACTIVE', 'PENDING', 'EXPIRED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status
                      ? 'bg-white text-[var(--primary)] shadow-sm border border-[var(--primary)]/10'
                      : 'text-[#616161] hover:text-[var(--primary)]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-32 text-[#9E9E9E] border-2 border-dashed border-[var(--outline-variant)]/30 rounded-3xl">
              <div className="inline-flex p-10 rounded-full bg-[var(--surface-low)] text-[#1B1C1C]/10 mb-8">
                <FileText size={64} strokeWidth={1} />
              </div>
              <p className="font-display font-bold text-2xl text-[#1B1C1C]">No agreements found</p>
              <p className="text-sm font-medium mt-3">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:-mx-10 px-4 md:px-10">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]/30">
                    <th className="pb-6 px-4 text-[11px] font-black text-[#9E9E9E] uppercase tracking-widest leading-none">Agreement</th>
                    <th className="pb-6 px-4 text-[11px] font-black text-[#9E9E9E] uppercase tracking-widest leading-none">Customer</th>
                    <th className="pb-6 px-4 text-[11px] font-black text-[#9E9E9E] uppercase tracking-widest leading-none">Duration</th>
                    <th className="pb-6 px-4 text-[11px] font-black text-[#9E9E9E] uppercase tracking-widest leading-none">Status</th>
                    <th className="pb-6 px-4 text-[11px] font-black text-[#9E9E9E] uppercase tracking-widest leading-none text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10">
                  {filtered.map((agr) => (
                    <tr key={agr.id} className="hover:bg-[var(--surface-low)]/20 transition-all group">
                      <td className="py-8 px-4">
                        <div>
                          <p className="font-black text-[#1B1C1C] text-lg leading-tight group-hover:text-[var(--primary)] transition-colors mb-1.5">{agr.title}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#616161] font-medium uppercase tracking-tight">
                            <span className="text-[var(--primary)] opacity-50">#ID-{agr.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[var(--surface-low)] flex items-center justify-center text-[#1B1C1C] border border-[var(--outline-variant)]/40 font-display font-medium">
                            {agr.customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#1B1C1C] text-sm leading-none mb-1">{agr.customer.name}</p>
                            <p className="text-[11px] text-[#9E9E9E] font-medium">{agr.customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1B1C1C] uppercase tracking-tighter">
                            <Calendar size={12} className="text-[var(--primary)]" />
                            {new Date(agr.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          agr.status.name === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          agr.status.name === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-gray-50 text-gray-700 border-gray-100'
                        }`}>
                          {agr.status.name === 'ACTIVE' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {agr.status.displayName}
                        </span>
                      </td>
                      <td className="py-8 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <a 
                            href={agr.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 rounded-2xl bg-[var(--surface-low)] text-[#1B1C1C] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 border border-[var(--outline-variant)]/50 transition-all shadow-sm"
                            title="View Agreement"
                          >
                            <Eye size={18} />
                          </a>
                          <button 
                             onClick={() => window.open(agr.fileUrl, '_blank')}
                             className="p-3 rounded-2xl bg-[var(--primary)]/5 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white border border-[var(--primary)]/10 transition-all shadow-sm"
                             title="Download PDF"
                          >
                            <Download size={18} />
                          </button>
                        </div>
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
