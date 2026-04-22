'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Loader2, 
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing Registry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="inline-flex p-4 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[var(--primary)]">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">Legal Registry</h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">Lease contracts and member protocol agreements</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-lowest)] rounded-none border border-[var(--outline-variant)] shadow-sm overflow-hidden">
          {/* Internal Filters Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-8 gap-6 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-low)]/20">
            <div className="relative w-full lg:max-w-lg">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
              <input 
                type="text"
                placeholder="REGISTRY SEARCH: TITLE OR CUSTOMER..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[var(--outline-variant)] rounded-none pl-14 pr-6 py-4 text-[10px] font-bold uppercase tracking-widest focus:border-[var(--primary)] outline-none"
              />
            </div>
            
            <div className="flex items-center gap-px bg-[var(--outline-variant)]/30 border border-[var(--outline-variant)]/30 p-px">
              {(['ALL', 'ACTIVE', 'PENDING', 'EXPIRED'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-6 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white text-[#616161] hover:text-[var(--primary)]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-32 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No registry entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]/30 bg-neutral-50/50">
                    <th className="py-6 px-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Protocol Title</th>
                    <th className="py-6 px-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Node Subscriber</th>
                    <th className="py-6 px-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Effective Date</th>
                    <th className="py-6 px-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Legal State</th>
                    <th className="py-6 px-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10 bg-white">
                  {filtered.map((agr) => (
                    <tr key={agr.id} className="hover:bg-[var(--surface-low)]/20 transition-all group">
                      <td className="py-8 px-8">
                        <div>
                          <p className="font-bold text-[#1B1C1C] text-[15px] uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors mb-1">{agr.title}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-[var(--primary)] font-bold uppercase opacity-60">
                             REF: #ID-{agr.id}
                          </div>
                        </div>
                      </td>
                      <td className="py-8 px-8">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-neutral-100 flex items-center justify-center text-[#1B1C1C] border border-[var(--outline-variant)] text-[10px] font-bold uppercase">
                            {agr.customer.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#1B1C1C] text-[12px] uppercase tracking-tight">{agr.customer.name}</p>
                            <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-tighter">{agr.customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 px-8">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#616161] uppercase tracking-widest">
                            <Calendar size={12} className="opacity-40" />
                            {new Date(agr.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-8 px-8">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[8px] font-black uppercase tracking-widest border transition-all ${
                          agr.status.name === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          agr.status.name === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-neutral-50 text-neutral-400 border-neutral-200'
                        }`}>
                          {agr.status.displayName}
                        </span>
                      </td>
                      <td className="py-8 px-8 text-right">
                        <div className="flex items-center justify-end gap-2 text-[var(--primary)]">
                          <a 
                            href={agr.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-white text-[9px] font-bold uppercase tracking-widest border border-[var(--outline-variant)] hover:bg-[var(--primary)] hover:text-white transition-all"
                          >
                            Inspection
                          </a>
                          <button 
                             onClick={() => window.open(agr.fileUrl, '_blank')}
                             className="px-4 py-2 bg-[var(--primary)] text-white text-[9px] font-bold uppercase tracking-widest border border-[var(--primary)] hover:bg-black transition-all"
                          >
                            Archive
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
