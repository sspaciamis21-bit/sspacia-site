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
      const msg = err instanceof Error ? err.message : 'Failed to fetch agreements';
      toast.error(msg);
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
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 font-sans bg-[#0A0A0F] min-h-screen text-white">
      <FadeUp>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pt-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <ShieldCheck size={20} className="text-[#7C6FFF]" />
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#7C6FFF] italic">Secure Agreement Vault</h2>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter italic uppercase">My Contracts</h1>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#5A5A72]" />
            <input 
              type="text" 
              placeholder="Search IDs or titles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-[2rem] bg-[#12121A] border border-[#2A2A3E] focus:border-[#7C6FFF] outline-none text-sm transition-all shadow-2xl"
            />
          </div>
        </div>
      </FadeUp>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center">
           <Loader2 className="h-10 w-10 text-[#7C6FFF] animate-spin mb-4" />
           <p className="text-[#5A5A72] font-bold text-xs uppercase tracking-widest italic text-center">Encrypting Connection to Vault...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Active Contracts Section */}
          <section>
            <div className="flex items-center gap-4 mb-8">
               <LayoutGrid size={18} className="text-[#7C6FFF]" />
               <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Active Matrices</h3>
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
              <div className="py-20 text-center bg-[#12121A] rounded-[3rem] border border-dashed border-[#2A2A3E]">
                 <FileText size={48} className="mx-auto text-[#2A2A3E] mb-6" />
                 <p className="text-[#5A5A72] font-bold uppercase tracking-widest text-xs italic">No active agreements found.</p>
              </div>
            )}
          </section>

          {/* Pending Requests Section */}
          {filteredRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-8">
                 <History size={18} className="text-orange-500" />
                 <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Pending Approval Flow</h3>
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
