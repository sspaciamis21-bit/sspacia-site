'use client';

import { useState, useEffect } from 'react';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  FileText, 
  ShieldCheck,
  Search,
  History,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';

import UserContractCard from '@/components/clm/UserContractCard';
import { userContractsApi } from '@/lib/clm/api';
import type { ContractRequest, ContractSummary } from '@/types/clm';
import '@/components/clm/clm.css';

export default function UserContractsListPage() {
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      // For users, we need to show both active contracts AND pending requests
      // Note: userContractsApi.list() should return both or we fetch both
      const [conData, reqData] = await Promise.all([
        userContractsApi.list(),
        // We fetch the pending agreement requests separately
        fetch('/api/user/contracts/request').then(r => r.json()).then(j => j.data || [])
      ]);

      setContracts(conData);
      setRequests(reqData);
    } catch (err: unknown) {
      console.error('Contracts fetch error:', err);
      // Suppress toast for new users
      setContracts([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredContracts = contracts.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = requests.filter(r => 
    r.booking?.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 font-sans min-h-screen">
      <FadeUp>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pt-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="h-1 w-1 bg-[var(--primary)]"></div>
               <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Legal Repository</h2>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] tracking-tight uppercase">My Contracts</h1>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
            <input 
              type="text" 
              placeholder="Search contracts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-none bg-[var(--surface-low)] border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-xs font-bold text-[#1B1C1C] transition-all"
            />
          </div>
        </div>
      </FadeUp>

      {loading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Active Contracts Section */}
          <section>
            <div className="flex items-center gap-4 mb-8">
               <LayoutGrid size={16} className="text-[#1B1C1C]" />
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B1C1C]/30">Active Agreements</h3>
            </div>
            
            {filteredContracts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredContracts.map((con) => (
                  <FadeUp key={con.id}>
                    <UserContractCard contract={con} />
                  </FadeUp>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-[var(--surface-low)]/30 rounded-none border border-[var(--outline-variant)]">
                 <div className="inline-flex p-8 bg-white border border-[var(--outline-variant)] text-[#9E9E9E] mb-6">
                    <FileText size={40} />
                 </div>
                 <p className="text-[#1B1C1C] font-display font-bold uppercase tracking-tight text-xl">No contracts found</p>
                 <p className="text-[#9E9E9E] font-bold uppercase tracking-widest text-[10px] mt-2">You don&apos;t have any active legal documents yet.</p>
              </div>
            )}
          </section>

          {/* Pending Requests Section */}
          {filteredRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-8">
                 <History size={16} className="text-[#1B1C1C]" />
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B1C1C]/40">Approval Workflow</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRequests.map((req) => (
                  <FadeUp key={req.id}>
                    <UserContractCard request={req} />
                  </FadeUp>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
