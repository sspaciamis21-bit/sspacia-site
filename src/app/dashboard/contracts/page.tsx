'use client';

import { useState, useEffect } from 'react';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  FileText, 
  ShieldCheck,
  Search,
  History,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';

import { motion } from 'motion/react';
import UserContractCard from '@/components/clm/UserContractCard';
import { userContractsApi } from '@/lib/clm/api';
import type { ContractRequest, ContractSummary } from '@/types/clm';
import '@/components/clm/clm.css';

export default function UserContractsListPage() {
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

  const fetchData = async () => {
    try {
      const [conData, reqData] = await Promise.all([
        userContractsApi.list(),
        fetch('/api/user/contracts/request').then(r => r.json()).then(j => j.data || [])
      ]);

      setContracts(conData);
      setRequests(reqData);
    } catch (err: unknown) {
      console.error('Contracts fetch error:', err);
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
    (r.status === 'PENDING') &&
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

      {/* Tabs */}
      <div className="flex items-center gap-8 mb-12 border-b border-[var(--outline-variant)]/20 px-4">
        {[
          { id: 'active', label: 'Active Agreements', count: filteredContracts.length },
          { id: 'pending', label: 'Pending Requests', count: filteredRequests.length },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'active' | 'pending')}
            className={`pb-6 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[#9E9E9E] hover:text-[#1B1C1C]'
            }`}
          >
            {tab.label}
            <span className="ml-2 opacity-40">({tab.count})</span>
            {activeTab === tab.id && (
              <motion.div layoutId="userContractTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--primary)] rounded-none" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {activeTab === 'active' ? (
            <section>
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
                   <p className="text-[#1B1C1C] font-display font-bold uppercase tracking-tight text-xl">No active contracts</p>
                   <p className="text-[#9E9E9E] font-bold uppercase tracking-widest text-[10px] mt-2">You don&apos;t have any active legal documents yet.</p>
                </div>
              )}
            </section>
          ) : (
            <section>
              {filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredRequests.map((req) => (
                    <FadeUp key={req.id}>
                      <div className="bg-white border border-[var(--outline-variant)] p-10 shadow-sm rounded-none relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4">
                            <span className="text-[8px] font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1 border border-orange-100">
                              PENDING
                            </span>
                         </div>
                         <div className="mb-6">
                            <p className="text-[8px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] mb-1">Contract Request</p>
                            <h4 className="text-xl font-bold text-[#1B1C1C] uppercase tracking-tight italic">REQ/{req.id}</h4>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-center gap-3">
                               <FileText size={14} className="text-[#9E9E9E]"/>
                               <p className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-widest">{req.booking?.bookingNumber || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <ShieldCheck size={14} className="text-[#9E9E9E]"/>
                               <p className="text-[10px] font-bold text-[#616161] uppercase tracking-tight">{req.booking?.product?.name || 'Inquiry Service'}</p>
                            </div>
                         </div>
                         <div className="mt-10 pt-6 border-t border-neutral-100">
                            <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest leading-relaxed">
                               Awaiting validation from management node. <br/>
                               Submitted: {new Date(req.createdAt).toLocaleDateString()}
                            </p>
                         </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center bg-[var(--surface-low)]/30 rounded-none border border-[var(--outline-variant)]">
                   <div className="inline-flex p-8 bg-white border border-[var(--outline-variant)] text-[#9E9E9E] mb-6">
                      <Clock size={40} />
                   </div>
                   <p className="text-[#1B1C1C] font-display font-bold uppercase tracking-tight text-xl">No pending requests</p>
                   <p className="text-[#9E9E9E] font-bold uppercase tracking-widest text-[10px] mt-2">All your agreement requests have been processed.</p>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
