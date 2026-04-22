'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2,
  ChevronLeft,
  Save, 
  Send, 
  CheckCircle2, 
  FileText,
  History,
  MessageCircle,
  ExternalLink,
  Edit2,
  ShieldCheck
} from 'lucide-react';

import { toast } from 'sonner';

import StatusBadge from '@/components/clm/StatusBadge';
import ContractStateBar from '@/components/clm/ContractStateBar';
import NegotiationThread from '@/components/clm/NegotiationThread';
import { ContentRenderer } from '@/components/clm/ContentRenderer';
import { ContractDocViewer } from '@/components/clm/ContractDocViewer';
import { ProfessionalEditor } from '@/components/clm/ProfessionalEditor';
import { adminContractsApi } from '@/lib/clm/api';
import ManagerSignatureDialog from '@/components/clm/ManagerSignatureDialog';

import type { Contract, ContractStatusName, NegotiationMessage } from '@/types/clm';

import Image from 'next/image';
import '@/components/clm/clm.css';

export default function ManagerContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [richTextContent, setRichTextContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      if (!id) return;
      const data = await adminContractsApi.get(Number(id));
      setContract(data);
      if (data.versions?.[0]?.content) {
        setRichTextContent(data.versions[0].content);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading contract';
      toast.error(msg);
      router.push('/manager/contracts');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContract();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchContract();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchContract]);

  const handleSendMessage = async (body: string, action?: 'ACCEPT' | 'REJECT') => {
    if (contract) {
       const updatedNegotiations = contract.negotiations?.map(neg => {
          return {
             ...neg,
             messages: [
                ...(neg.messages || []),
                {
                   id: Date.now(),
                   negotiationId: neg.id,
                   body: body || (action === 'ACCEPT' ? 'Accepted.' : 'Rejected.'),
                   authorType: 'STAFF' as const,
                   authorUser: { id: 0, name: 'You' },
                   createdAt: new Date().toISOString()
                } as NegotiationMessage
             ]
          };
       });
       setContract({ ...contract, negotiations: updatedNegotiations });
    }

    try {
      await adminContractsApi.negotiate(Number(id), body, undefined, action);
      await fetchContract();
      toast.success(action ? `Thread marked as ${action.toLowerCase()}.` : 'Message sent to customer.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending message';
      toast.error(msg);
      fetchContract();
    }
  };

  const handleCreateVersion = async () => {
    setSaving(true);
    try {
      if (!richTextContent || richTextContent === '') {
        throw new Error('Agreement content cannot be empty');
      }
      await adminContractsApi.versions.create(Number(id), { 
        content: richTextContent, 
        changeNote: 'Manual update from manager portal' 
      });
      await fetchContract();
      setEditing(false);
      toast.success('New contract version published.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating version';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSendToUser = async () => {
    const tid = toast.loading('Dispatching for execution...');
    try {
      await adminContractsApi.send(Number(id), 'SENT');
      await fetchContract();
      toast.success('Agreement sent for review.', { id: tid });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending';
      toast.error(msg, { id: tid });
    }
  };

  const handleFinalise = async () => {
    const tid = toast.loading('Synchronizing with Google Drive...');
    try {
      await adminContractsApi.finalise(Number(id));
      await fetchContract();
      toast.success('Contract finalised and archived.', { id: tid });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error finalising';
      toast.error(msg, { id: tid });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Authenticating Control Node...</p>
      </div>
    );
  }

  if (!contract) return null;

  const currentStatusName = contract.status.name as ContractStatusName;
  const isDraftOrNeg = currentStatusName === 'DRAFT' || currentStatusName === 'NEGOTIATION';
  const isSigned = currentStatusName === 'SIGNED';

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 md:px-8 font-sans">
      <FadeUp>
        <div className="flex flex-col items-center mb-20 text-center">
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-6 bg-[var(--clm-primary)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-gray-400 italic">Directive Center // Node {id}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-[#1B1B1B] tracking-tighter italic uppercase leading-none">
              {contract.contractNumber}
            </h1>
            <div className="mt-6">
              <StatusBadge status={currentStatusName} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button 
              onClick={() => router.push('/manager/contracts')}
              className="flex items-center gap-3 px-8 py-4 rounded-none bg-white border border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-[#616161] hover:bg-neutral-50 transition-all shadow-sm"
            >
              <ChevronLeft size={16} />
              Return to Catalog
            </button>

            {isDraftOrNeg && (
              <>
                <button 
                  onClick={() => setEditing(!editing)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg ${
                    editing 
                      ? 'bg-orange-600 text-white shadow-orange-600/10' 
                      : 'bg-white text-[#1B1B1B] border border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {editing ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
                  {editing ? 'Update Draft' : 'Edit Script'}
                </button>
                <button 
                  onClick={handleSendToUser}
                  className="flex items-center gap-3 px-8 py-4 rounded-none bg-[#1B1B1B] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--clm-primary)] transition-all shadow-2xl group"
                >
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Dispatch Directive
                </button>
              </>
            )}
            
            {isSigned && !contract.counterSignatureData && contract.signatureType !== 'MANUAL' && (
              <button 
                onClick={() => setIsSignDialogOpen(true)}
                className="flex items-center gap-3 px-10 py-5 rounded-none bg-orange-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-orange-700 transition-all shadow-2xl"
              >
                <ShieldCheck size={20} />
                Validate Authorization
              </button>
            )}

            {isSigned && (contract.counterSignatureData || contract.signatureType === 'MANUAL') && !contract.finalDriveUrl && (
              <button 
                onClick={handleFinalise}
                className="flex items-center gap-4 px-10 py-5 rounded-none bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl"
              >
                <CheckCircle2 size={20} />
                Archive & Synchronize
              </button>
            )}

            {contract.finalDriveUrl && (
              <a 
                href={contract.finalDriveUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-4 px-10 py-5 rounded-none bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl"
              >
                <ExternalLink size={20} />
                Access Storage Hub
              </a>
            )}
          </div>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <FadeUp delay={0.1}>
            <div className="bg-white border border-neutral-200 p-12 shadow-sm rounded-none">
               <div className="relative z-10 w-full">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#1B1B1B] mb-10 flex items-center gap-4">
                   <div className="h-2 w-6 bg-[var(--clm-primary)]"></div>
                   Administrative Workflow Sequence
                 </h3>
                 <ContractStateBar current={currentStatusName} />
               </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="bg-white border border-neutral-200 shadow-xl min-h-[800px] flex flex-col relative overflow-hidden rounded-none">
               {editing ? (
                 <div className="flex-1 flex flex-col">
                   <div className="p-8 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="h-1.5 w-1.5 bg-orange-500"></div>
                         <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-600 italic">Agreement Construction Zone</p>
                      </div>
                      <button 
                        onClick={handleCreateVersion}
                        disabled={saving}
                        className="flex items-center gap-3 px-8 py-3 rounded-none bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
                        Confirm update
                      </button>
                   </div>
                   <div className="flex-1 p-12 bg-neutral-50/30 overflow-y-auto">
                      <div className="max-w-[850px] mx-auto bg-white border border-neutral-200 shadow-2xl rounded-none overflow-hidden">
                        <ProfessionalEditor 
                          content={richTextContent} 
                          onChange={setRichTextContent} 
                        />
                      </div>
                    </div>
                 </div>
               ) : (
                 <>
                   <div className="p-10 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[#9E9E9E]">
                         <FileText size={20} />
                         <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Live Directive Viewport</p>
                      </div>
                      <p className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">V.{contract.versions?.[0]?.versionNumber || '0.0'}</p>
                   </div>
                   <div className="flex-1 p-16">
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
                       />
                      
                      {/* Signatures */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-20 pt-20 border-t border-neutral-100">
                        {/* Customer */}
                        {(contract.signatureType || contract.signature) && (
                          <div className="space-y-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E9E9E]">
                               Subscriber Verification
                            </p>
                            
                            {contract.signatureType === 'MANUAL' && contract.manualUploadUrl ? (
                              <a 
                                href={contract.manualUploadUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-3 px-6 py-3 border border-neutral-200 bg-neutral-50 rounded-none text-[10px] uppercase font-bold text-[#1B1B1B] hover:bg-neutral-100 transition-all w-fit"
                              >
                                <ExternalLink size={14} />
                                View Physical Docs
                              </a>
                            ) : (
                              (contract.signatureData || contract.signature?.signatureData) && (
                                <Image 
                                  src={contract.signatureData || contract.signature?.signatureData || ''} 
                                  alt="Signature" 
                                  width={200} 
                                  height={80} 
                                  className="h-24 w-auto opacity-80" 
                                />
                              )
                            )}

                            <div className="text-[9px] text-[#9E9E9E] font-bold space-y-1 uppercase tracking-tighter">
                               <p>Method: {contract.signatureType || 'DIGITAL_CANVAS_SYNC'}</p>
                               <p>Time: {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : (contract.signature?.signedAt ? new Date(contract.signature.signedAt).toLocaleString() : 'N/A')}</p>
                            </div>
                          </div>
                        )}

                        {/* Manager */}
                        {contract.counterSignatureData && (
                          <div className="space-y-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">
                               Control Authorization
                            </p>
                            <Image 
                              src={contract.counterSignatureData} 
                              alt="Counter Signature" 
                              width={200} 
                              height={80} 
                              className="h-24 w-auto opacity-80 grayscale active:grayscale-0 transition-all" 
                            />
                            <div className="text-[9px] text-[#9E9E9E] font-bold space-y-1 uppercase tracking-tighter">
                               <p>Auth By: {contract.counterSignerName}</p>
                               <p>Time: {new Date(contract.counterSignedAt!).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                 </>
               )}
            </div>
          </FadeUp>
        </div>

        <div className="lg:col-span-4 space-y-12">
           <FadeUp delay={0.3}>
              <div className="bg-[#1B1B1B] p-12 rounded-none text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-8 flex items-center gap-3">
                       <div className="h-1.5 w-6 bg-[var(--primary)]"></div>
                       Target Profile
                    </h4>
                    <div className="space-y-6">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] italic mb-2">Primary Node</p>
                          <p className="text-2xl font-display font-bold tracking-tight uppercase">{contract.booking?.customer?.name || 'GENERIC_USER'}</p>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1 opacity-60">{contract.booking?.customer?.email || "PERSONAL_NODE"}</p>
                       </div>
                       <div className="pt-6 border-t border-white/5">
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] mb-2">Allocated Space</p>
                          <p className="text-lg font-bold text-[var(--primary)] italic uppercase tracking-tighter">
                            {contract.booking?.product?.name || 'HUB_SPACE'} / {contract.booking?.product?.location?.name || 'CORE'}
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
           </FadeUp>

           <FadeUp delay={0.4}>
              <div className="space-y-8">
                 <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-4 italic">
                     <MessageCircle size={16} className="text-[var(--primary)]"/> Feedback Link
                   </h3>
                   <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/10 border border-orange-600/20">
                      <div className="h-1 w-1 bg-orange-600"></div>
                      <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Active Link</span>
                   </div>
                 </div>

                 <div className="space-y-6">
                   {contract.negotiations && contract.negotiations.length > 0 ? (
                     contract.negotiations.map((neg) => (
                       <NegotiationThread 
                         key={neg.id}
                         negotiation={neg}
                         role="ADMIN"
                         onReply={(nid, msg, action) => handleSendMessage(msg, action)}
                       />
                     ))
                   ) : (
                     <div className="p-12 text-center bg-white border border-neutral-100 border-dashed rounded-none">
                        <MessageCircle size={24} className="mx-auto text-neutral-200 mb-4" />
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.4em]">No directive feedback</p>
                     </div>
                   )}
                 </div>
              </div>
           </FadeUp>
        </div>
      </div>

      <ManagerSignatureDialog 
        contractId={Number(id)}
        isOpen={isSignDialogOpen}
        onClose={() => setIsSignDialogOpen(false)}
        onSuccess={fetchContract}
      />
    </div>
  );
}
