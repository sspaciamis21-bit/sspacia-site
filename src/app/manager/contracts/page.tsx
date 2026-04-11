'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'active' | 'archived'>('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [reqData, conData] = await Promise.all([
        adminRequestsApi.list(),
        adminContractsApi.list()
      ]);
      setRequests(reqData);
      setContracts(conData);
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
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--primary)] italic">Protocol Management node</h2>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-[#1B1C1C] tracking-tighter italic uppercase">Contract Lifecycle</h1>
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
          { id: 'requests', label: 'Processing', count: requests.filter(r => (r.status as string) === 'PENDING').length },
          { id: 'active', label: 'Active Matrix', count: contracts.length },
          { id: 'archived', label: 'Legacy Vault', count: 0 }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'requests' | 'active' | 'archived')}
            className={`pb-6 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-[var(--primary)]' : 'text-[#9E9E9E] hover:text-[#1B1C1C]'
            }`}
          >
            {tab.label}
            <span className="ml-2 opacity-40">({tab.count})</span>
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center">
           <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" />
           <p className="text-[#9E9E9E] font-bold text-xs uppercase tracking-widest italic">Synchronizing Fleet Data...</p>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredRequests.map((req, idx) => (
             <FadeUp key={req.id} delay={idx * 0.05}>
               <div className="group bg-white rounded-[2.5rem] border border-[var(--outline-variant)]/30 p-10 hover:shadow-2xl hover:shadow-[var(--primary)]/10 transition-all duration-500 relative overflow-hidden h-full flex flex-col">
                  {/* Glowing Accent */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[var(--primary)]/5 blur-[40px] group-hover:bg-[var(--primary)]/20 transition-all duration-700" />
                  
                  <div className="mb-8 flex justify-between items-start">
                     <div className="p-3.5 rounded-2xl bg-orange-100/50 text-orange-600">
                        <Clock size={24} />
                     </div>
                     <span className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest italic bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                        Pending Admin Signal
                     </span>
                  </div>

                  <div className="space-y-6 flex-1">
                     <div>
                        <h3 className="text-xl font-bold text-[#1B1C1C] tracking-tight mb-1">{req.customer?.name || 'Unknown Associate'}</h3>
                        <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-widest">{req.customer?.organization || 'Private Associate'}</p>
                     </div>

                     <div className="p-6 rounded-2xl bg-[var(--surface-low)] border border-[var(--outline-variant)]/20 space-y-4 shadow-inner">
                        <div className="flex items-center gap-3">
                           <FileText size={14} className="text-[#9E9E9E]"/>
                           <p className="text-[11px] font-bold text-[#1B1C1C] uppercase tracking-tighter italic">{req.booking?.bookingNumber || 'No Linked Booking'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={14} className="text-[#9E9E9E]"/>
                           <p className="text-[11px] font-bold text-[#616161]">{req.booking?.product?.name || 'Inquiry Service'} @ {req.booking?.location?.name || 'External'}</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 grid grid-cols-2 gap-4">
                     <button 
                       onClick={() => handleProcessRequest(req.id, 'REJECT')}
                       className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                     >
                       <XCircle size={16} /> Reject
                     </button>
                     <button 
                       onClick={() => handleProcessRequest(req.id, 'ACCEPT')}
                       className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#1B1B1B] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--primary)] transition-all shadow-lg"
                     >
                       <Plus size={16} /> Accept
                     </button>
                  </div>
               </div>
             </FadeUp>
           ))}
           {filteredRequests.length === 0 && (
             <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">Queue is currently clear.</p>
             </div>
           )}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-[var(--outline-variant)]/30 overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-[var(--outline-variant)]/20">
                  <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Identification</th>
                  <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">contractor</th>
                  <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-center">Lifecycle status</th>
                  <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">creation sync</th>
                  <th className="p-8 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]/10">
                 {filteredContracts.map(con => (
                   <tr key={con.id} className="hover:bg-gray-50/30 transition-colors group cursor-pointer" onClick={() => router.push(`/manager/contracts/${con.id}`)}>
                      <td className="p-8">
                         <p className="text-sm font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">{con.contractNumber}</p>
                         <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest mt-1 italic">{con.booking?.product?.name || 'Product Detail Offline'}</p>
                      </td>
                      <td className="p-8">
                         <p className="text-sm font-bold text-[#1B1C1C]">{con.customer?.name || 'Unknown'}</p>
                         <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest mt-1 italic">{con.booking?.location?.name || 'HQ location'}</p>
                      </td>
                      <td className="p-8">
                         <div className="flex justify-center">
                            <StatusBadge 
                              status={(con.status?.name || 'PENDING') as ContractStatusName} 
                              size="sm" 
                            />
                         </div>
                      </td>
                      <td className="p-8 text-[11px] font-bold text-[#616161] uppercase tracking-tighter">
                         {new Date(con.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-8 text-right">
                         <button className="p-3 rounded-xl bg-[var(--surface-low)] text-[#1B1C1C] group-hover:bg-[#1B1B1B] group-hover:text-white transition-all">
                            <ChevronRight size={18} />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
           {filteredContracts.length === 0 && (
              <div className="py-24 text-center">
                 <FileText size={48} className="mx-auto text-gray-200 mb-6" />
                 <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">No active matrix identified.</p>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
