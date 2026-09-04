'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Clock, 
  XCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import StatusBadge from '@/components/clm/StatusBadge';
import { adminRequestsApi, adminContractsApi } from '@/lib/clm/api';
import type { ContractRequest, ContractSummary, ContractStatusName } from '@/types/clm';
import '@/components/clm/clm.css';

// Local interfaces removed in favor of @/types/clm

export default function ManagerContractsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname?.startsWith('/admin') ? '/admin/contracts' : '/manager/contracts';
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'active'>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [reqData, conData] = await Promise.all([
        adminRequestsApi.list(),
        adminContractsApi.list()
      ]);
      setRequests(reqData);
      setContracts(conData);
      // If there are pending requests, stay on requests tab, otherwise switch to active if no requests
      if (reqData.length === 0 && conData.length > 0) {
        setActiveTab('active');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProcessRequest = async (requestId: number, action: 'ACCEPT' | 'REJECT') => {
    const tid = toast.loading(`${action === 'ACCEPT' ? 'Accepting' : 'Rejecting'} request...`);
    try {
      if (action === 'ACCEPT') {
        await adminRequestsApi.accept(requestId);
      } else {
        await adminRequestsApi.reject(requestId, 'Request declined by manager.');
      }
      toast.success(`Request ${action === 'ACCEPT' ? 'Accepted' : 'Rejected'}`, { id: tid });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      toast.error(msg, { id: tid });
    }
  };

  const filteredRequests = requests.filter(r => 
    r.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.booking?.bookingNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContracts = contracts.filter(c => 
    c.contractNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 font-sans">
      <FadeUp>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <ShieldCheck size={20} className="text-[var(--primary)]" />
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--primary)] italic">Agreement Review</h2>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-[#1B1C1C] tracking-tighter italic uppercase">Agreements</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-80">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9E9E9E]" />
                <input 
                  type="text" 
                  placeholder="Search agreements..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-[2rem] bg-[var(--surface-low)] border border-[var(--outline-variant)]/30 focus:border-[var(--primary)] outline-none text-sm transition-all shadow-inner"
                />
             </div>
             <button className="p-4 rounded-[2rem] bg-white border border-[var(--outline-variant)]/50 text-[#1B1C1C] hover:bg-gray-50 transition-all shadow-sm">
                <Filter size={20} />
             </button>
          </div>
        </div>
      </FadeUp>

      <div className="flex items-center gap-8 mb-10 border-b border-[var(--outline-variant)]/20 px-4">
        {[
          { id: 'requests', label: 'Pending Agreement Requests', count: requests.filter(r => (r.status as string) === 'PENDING').length, badgeColor: 'bg-amber-500 text-white' },
          { id: 'active', label: 'Active Contracts & Agreements', count: contracts.length, badgeColor: 'bg-gray-100 text-gray-700' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'requests' | 'active')}
            className={`pb-4 text-xs font-black uppercase tracking-wider transition-all relative flex items-center gap-2 ${
              activeTab === tab.id ? 'text-[#1ab0bc]' : 'text-gray-400 hover:text-gray-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tab.badgeColor}`}>
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#1ab0bc] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white border border-[var(--outline-variant)] rounded-none gap-4">
           <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin" />
           <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing Protocol Matrix...</p>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredRequests.map((req, idx) => (
             <FadeUp key={req.id} delay={idx * 0.05}>
               <div className="group bg-white rounded-none border border-[var(--outline-variant)] p-10 hover:border-[var(--primary)] transition-all duration-500 relative h-full flex flex-col">
                  <div className="mb-8 flex justify-between items-start">
                     <div className="p-3 bg-orange-50 text-orange-600 border border-orange-100">
                        <Clock size={20} />
                     </div>
                      <span className="text-[8px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1 border border-orange-100">
                        PENDING
                      </span>
                  </div>

                  <div className="space-y-6 flex-1">
                     <div>
                        <h3 className="text-xl font-bold text-[#1B1C1C] tracking-tight mb-1 uppercase">{req.customer?.name || 'Unknown associate'}</h3>
                        <p className="text-[9px] text-[var(--primary)] font-bold uppercase tracking-widest">{req.customer?.organization || 'Private Associate'}</p>
                     </div>

                     <div className="p-6 bg-[var(--surface-low)] border border-[var(--outline-variant)] space-y-4">
                        <div className="flex items-center gap-3">
                           <FileText size={14} className="text-[#9E9E9E]"/>
                           <p className="text-[10px] font-bold text-[#1B1C1C] uppercase tracking-widest">{req.booking?.bookingNumber || 'No Linked Booking'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={14} className="text-[#9E9E9E]"/>
                           <p className="text-[10px] font-bold text-[#616161] uppercase tracking-tight">{req.booking?.product?.name || 'Inquiry Service'} @ {req.booking?.location?.name || 'External'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-px border border-[var(--outline-variant)] bg-[var(--outline-variant)]">
                     <button 
                       onClick={() => handleProcessRequest(req.id, 'REJECT')}
                       className="flex items-center justify-center gap-2 py-4 bg-white text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all rounded-none"
                     >
                       REJECT
                     </button>
                      <button 
                        onClick={() => handleProcessRequest(req.id, 'ACCEPT')}
                        className="flex items-center justify-center gap-2 py-4 bg-[var(--primary)] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all rounded-none"
                      >
                        APPROVE
                      </button>
                  </div>
               </div>
             </FadeUp>
           ))}
           {filteredRequests.length === 0 && (
             <div className="col-span-full py-20 text-center bg-white border border-[var(--outline-variant)] rounded-none">
                <p className="text-[#9E9E9E] font-bold uppercase tracking-[0.4em] text-[10px]">Processing queue clear</p>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white rounded-none border border-[var(--outline-variant)] overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]">
                    <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">ID</th>
                    <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">User</th>
                    <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-center">Status</th>
                    <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Date</th>
                    <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Action</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]/10">
                 {filteredContracts.map(con => (
                   <tr key={con.id} className="hover:bg-neutral-50 transition-colors group cursor-pointer" onClick={() => router.push(`${basePath}/${con.id}`)}>
                      <td className="p-8">
                         <p className="text-sm font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors uppercase tracking-tight">{con.contractNumber}</p>
                         <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-widest mt-1 italic">{con.booking?.product?.name || 'GENERIC ASSET'}</p>
                      </td>
                      <td className="p-8">
                         <p className="text-sm font-bold text-[#1B1C1C] uppercase tracking-tight">{con.customer?.name || 'Unknown ассоciate'}</p>
                         <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-widest mt-1 italic">{con.booking?.location?.name || 'Node alpha'}</p>
                      </td>
                      <td className="p-8">
                         <div className="flex justify-center">
                            <StatusBadge 
                              status={(con.status?.name || 'PENDING') as ContractStatusName} 
                              size="sm" 
                            />
                         </div>
                      </td>
                      <td className="p-8 text-[10px] font-bold text-[#616161] uppercase tracking-widest">
                         {new Date(con.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-8 text-right">
                         <button className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest border border-[var(--outline-variant)] text-[#1B1C1C] group-hover:bg-[#1B1B1B] group-hover:text-white transition-all rounded-none">
                            VIEW
                         </button>
                      </td>
                    </tr>
                 ))}
              </tbody>
           </table>
           {filteredContracts.length === 0 && (
              <div className="py-24 text-center bg-white">
                 <p className="text-[#9E9E9E] font-bold uppercase tracking-[0.4em] text-[10px]">No protocol records identified</p>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
