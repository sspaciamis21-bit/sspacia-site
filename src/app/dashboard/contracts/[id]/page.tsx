'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  FileText,
  MessageCircle,
  PenTool,
  CheckCircle2,
  History as HistoryIcon,
  Download
} from 'lucide-react';


import { toast } from 'sonner';

import StatusBadge from '@/components/clm/StatusBadge';
import ContractStateBar from '@/components/clm/ContractStateBar';
import NegotiationThread from '@/components/clm/NegotiationThread';
import SignatureMethodSelector from "@/components/clm/SignatureMethodSelector";
import { ContractDocViewer } from '@/components/clm/ContractDocViewer';
import { userContractsApi } from '@/lib/clm/api';



import type { Contract, ContractStatusName, NegotiationMessage } from '@/types/clm';

import '@/components/clm/clm.css';

// ContentRenderer is replaced by ProfessionalEditor in readOnly mode for high-fidelity rendering


export default function UserContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);



  const fetchContract = useCallback(async () => {
    try {
      const data = await userContractsApi.get(Number(id));
      setContract(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading agreement';
      toast.error(msg);
      router.push('/dashboard/contracts');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContract();
    // Real-time polling for negotiation updates (every 3 seconds when tab is active)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchContract();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchContract]);


  const handleSendMessage = async (nid: number, body: string) => {
    // Optimistic Update: Manually append message to local state
    if (contract) {
      const updatedNegotiations = contract.negotiations?.map(neg => {
        if (neg.id === nid) {
          return {
            ...neg,
            messages: [
              ...(neg.messages || []),
              {
                id: Date.now(),
                negotiationId: nid,
                body,
                authorType: 'CUSTOMER' as const,
                authorCustomer: contract.booking?.customer ? { 
                  id: contract.booking.customer.id, 
                  name: contract.booking.customer.name 
                } : undefined,
                createdAt: new Date().toISOString()
              } as NegotiationMessage


            ]
          };
        }
        return neg;
      });
      setContract({ ...contract, negotiations: updatedNegotiations });
    }

    try {
      await userContractsApi.replyNegotiation(Number(id), nid, { message: body });
      await fetchContract();
      toast.success('Response delivered.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending message';
      toast.error(msg);
      fetchContract(); // Revert on error
    }
  };



  const handleStartNegotiation = async (text: string) => {
    const tid = toast.loading('Adding clause context to chat...');
    try {
      await userContractsApi.openNegotiation(Number(id), {
        title: 'Unified Negotiation',
        message: `[NEGOTIATING CLAUSE]:\n"${text}"`
      });
      await fetchContract();
      toast.success('Context pinned to negotiation.', { id: tid });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding context';
      toast.error(msg, { id: tid });
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    const tid = toast.loading('Reviewing acceptance criteria...');
    try {
      await userContractsApi.accept(Number(id));
      await fetchContract();
      toast.success('Agreement Accepted. You may now sign.', { id: tid });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Acceptance failed';
      toast.error(msg, { id: tid });
    } finally {
      setAccepting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" />
        <p className="text-[#9E9E9E] font-bold text-xs uppercase tracking-widest italic">Authenticating Secure Access...</p>
      </div>
    );
  }

  if (!contract) return null;

  const currentStatusName = contract.status.name as ContractStatusName;
  const canSign = currentStatusName === 'PENDING_SIGN';
  const isSigned = currentStatusName === 'SIGNED';

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.push('/dashboard/contracts')}
              className="p-3.5 rounded-2xl bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[#616161] hover:text-[#1B1C1C] transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-2 w-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]"></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] italic">Secure Terminal // Member Node</span>
              </div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl md:text-5xl font-display font-bold text-[#1B1C1C] tracking-tighter italic uppercase">
                  {contract.contractNumber}
                </h1>
                <StatusBadge status={currentStatusName} size="sm" pulse={canSign} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {currentStatusName === 'SENT' && (
              <button 
                onClick={handleAccept}
                disabled={accepting}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--primary)] text-white text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-orange-500/20"
              >
                {accepting ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                Accept Terms & Proceed
              </button>
            )}



            {contract.finalDriveUrl && (

              <a 
                href={contract.finalDriveUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--primary)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--primary)]/20 transition-all font-mono"
              >
                <Download size={18} />
                Download Official Copy
              </a>
            )}
          </div>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Timeline */}
          <FadeUp delay={0.1}>
            <div className="bg-[var(--surface-lowest)] rounded-[2.5rem] p-10 border border-[var(--outline-variant)]/50 relative overflow-hidden shadow-sm">
               <div className="absolute top-0 right-0 p-10 opacity-5">
                  <ShieldCheck size={100} className="text-[#1B1C1C]"/>
               </div>
               <div className="relative z-10 w-full">
                 <h3 className="text-xs font-bold uppercase tracking-[0.3em] italic text-[#9E9E9E] mb-8 flex items-center gap-3">
                   <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"></div>
                   Agreement Life-Cycle
                 </h3>
                 <ContractStateBar current={currentStatusName} />
               </div>
            </div>
          </FadeUp>

          {/* Agreement Viewer */}
          <FadeUp delay={0.2}>
            <div className="bg-[var(--surface-lowest)] rounded-[3.5rem] border border-[var(--outline-variant)]/50 shadow-xl min-h-[500px] flex flex-col relative overflow-hidden">
               <div className="p-8 border-b border-[var(--outline-variant)]/30 bg-[var(--surface-low)]/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[#9E9E9E]">
                     <FileText size={18} />
                     <p className="text-[10px] font-bold uppercase tracking-widest italic">Agreement Document Preview</p>
                  </div>
                  <p className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-widest">Master Version: {contract.versions?.[0]?.versionNumber || '1.0'}</p>
               </div>
                <div className="flex-1 p-4 md:p-8 bg-[var(--surface-low)]/10 rounded-[2.5rem]">

                   <ContractDocViewer
                     content={contract.versions?.[0]?.content || undefined}
                     templateParams={!contract.versions?.[0]?.content ? {
                       date: contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
                       customerName: contract.booking?.customer?.name,
                       customerOrg: contract.booking?.customer?.name,
                       productType: contract.booking?.product?.name,
                       productName: contract.booking?.product?.name,
                       centerAddress: contract.booking?.product?.location?.name,
                     } : undefined}
                     onNegotiate={handleStartNegotiation}
                   />

                  
                  {isSigned && (contract.signature || contract.signatureData) && (
                    <div className="mt-16 pt-16 border-t border-[var(--outline-variant)]/30 italic">
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] mb-8 flex items-center gap-2">
                         <CheckCircle2 size={16} className="text-emerald-500"/> Validated Digital Signature
                      </p>
                      
                      {(contract.signature?.signatureData || contract.signatureData?.startsWith('data:image')) ? (
                        <img 
                          src={contract.signature?.signatureData || contract.signatureData} 
                          alt="Signature" 
                          className="h-20 opacity-80" 
                        />
                      ) : (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-500">
                          <ShieldCheck size={20} />
                          <span className="text-xs font-bold uppercase tracking-widest">{contract.signatureType || 'Cryptographic'} Verification Active</span>
                        </div>
                      )}

                      <div className="mt-6 text-[9px] text-[#616161] font-medium leading-relaxed uppercase tracking-tighter">
                         Signed At: {new Date(contract.signature?.signedAt || contract.signedAt || '').toLocaleString()} <br />
                         Signer: {contract.signerName || contract.booking?.customer?.name}
                      </div>
                    </div>
                  )}

                  {canSign && (
                    <div className="mt-16 pt-16 border-t border-[var(--outline-variant)]/30">
                       <div className="flex items-center gap-3 mb-8">
                          <PenTool size={20} className="text-[var(--primary)]" />
                          <h3 className="text-xl font-bold tracking-tight italic uppercase text-[#1B1C1C]">Authorization Terminal</h3>
                       </div>
                       <SignatureMethodSelector 
                         contractId={contract.id}
                         onSigned={() => router.refresh()}
                       />

                       <p className="mt-6 text-[10px] text-[#9E9E9E] italic uppercase tracking-widest text-center">
                         By signing above, you agree to the terms and conditions outlined in this protocol.
                       </p>
                    </div>
                  )}
               </div>
            </div>
          </FadeUp>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-10">
           <FadeUp delay={0.3}>
              <div className="bg-[var(--surface-lowest)] p-10 rounded-[2.5rem] border border-[var(--outline-variant)]/50 relative overflow-hidden group shadow-sm">
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <HistoryIcon size={80} className="text-[var(--primary)]"/>
                 </div>
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E] mb-6 flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-[var(--primary)]"></div>
                       Agreement Profile
                    </h4>
                    <div className="space-y-6">
                       <div>
                          <p className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] italic mb-1">Contractor</p>
                          <p className="text-xl font-bold text-[#1B1C1C] tracking-tight">{contract.booking?.customer?.name || 'Authorized Member'}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] italic mb-1">Assigned Hub</p>
                          <p className="text-xl font-bold tracking-tight text-[var(--primary)] italic uppercase tracking-tighter">{contract.booking?.product?.name}</p>
                          <p className="text-[10px] text-[#616161] mt-0.5">{contract.booking?.product?.location?.name}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </FadeUp>

           <FadeUp delay={0.4}>
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-4">
                   <h3 className="text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-3 italic text-[#9E9E9E]">
                     <MessageCircle size={14} className="text-[var(--primary)]"/> Negotiation Thread
                   </h3>
                   <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 animate-pulse">
                      <div className="h-1 w-1 rounded-full bg-[var(--primary)]"></div>
                      <span className="text-[8px] font-bold text-[var(--primary)] uppercase tracking-widest">Live Terminal Sync</span>
                   </div>
                 </div>

                 {contract.negotiations && contract.negotiations.length > 0 ? (
                    <NegotiationThread 
                      negotiation={{
                        ...contract.negotiations[0],
                        title: 'Unified Negotiation',
                        messages: contract.negotiations
                          .flatMap(n => n.messages || [])
                          .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      }}
                      role="USER"
                      onReply={handleSendMessage} 
                    />
                  ) : (
                    <div className="p-10 text-center bg-[var(--surface-lowest)] rounded-[2.5rem] border border-[var(--outline-variant)]/50 border-dashed shadow-sm">
                       <MessageCircle size={32} className="mx-auto text-[var(--outline-variant)] mb-4" />
                       <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest italic">Secure channel is open. No active threads.</p>
                    </div>
                  )}
              </div>
           </FadeUp>
        </div>
      </div>
    </div>
  );
}
