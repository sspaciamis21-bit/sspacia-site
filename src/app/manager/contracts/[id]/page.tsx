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
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" />
        <p className="text-[#9E9E9E] font-bold text-xs uppercase tracking-widest italic">Authenticating Administrative Access...</p>
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
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--clm-primary)] shadow-[0_0_8px_var(--clm-primary)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 italic">Sspacia Manager // Control Node</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-[#1B1B1B] tracking-tighter italic uppercase leading-none">
              {contract.contractNumber}
            </h1>
            <div className="mt-4">
              <StatusBadge status={currentStatusName} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button 
              onClick={() => router.push('/manager/contracts')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white border border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all shadow-sm"
            >
              <ChevronLeft size={16} />
              Return to Catalog
            </button>

            {isDraftOrNeg && (
              <>
                <button 
                  onClick={() => setEditing(!editing)}
                  className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-xl ${
                    editing 
                      ? 'bg-orange-500 text-white shadow-orange-500/20' 
                      : 'bg-white text-[#1B1B1B] border border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {editing ? <CheckCircle2 size={18} /> : <Edit2 size={18} />}
                  {editing ? 'Finalize Drafting' : 'Edit Agreement'}
                </button>
                <button 
                  onClick={handleSendToUser}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#1B1B1B] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--clm-primary)] transition-all shadow-2xl shadow-black/10 group"
                >
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Dispatch for Review
                </button>
              </>
            )}
            
            {isSigned && !contract.counterSignatureData && contract.signatureType !== 'MANUAL' && (
              <button 
                onClick={() => setIsSignDialogOpen(true)}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-orange-600/20"
              >
                <ShieldCheck size={18} />
                Apply Counter-Signature
              </button>
            )}

            {isSigned && (contract.counterSignatureData || contract.signatureType === 'MANUAL') && !contract.finalDriveUrl && (
              <button 
                onClick={handleFinalise}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-emerald-500/20"
              >
                <CheckCircle2 size={18} />
                Finalise & Sync
              </button>
            )}

            {contract.finalDriveUrl && (
              <a 
                href={contract.finalDriveUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-500/20"
              >
                <ExternalLink size={18} />
                View in Storage Hub
              </a>
            )}
          </div>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          <FadeUp delay={0.1}>
            <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-2xl shadow-black/[0.02] relative overflow-hidden">
               <div className="relative z-10 w-full">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] italic text-[#1B1B1B] mb-8 flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-[var(--clm-primary)]"></div>
                   Administrative Workflow
                 </h3>
                 <ContractStateBar current={currentStatusName} />
               </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="bg-white rounded-[3.5rem] border border-[var(--outline-variant)]/30 shadow-2xl min-h-[700px] flex flex-col relative overflow-hidden transition-all duration-700">
               {editing ? (
                 <div className="flex-1 flex flex-col">
                   <div className="p-8 border-b border-[var(--outline-variant)]/20 bg-orange-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_orange]"></div>
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] italic text-orange-600">Agreement Editor Zone (Drafting Mode)</p>
                      </div>
                      <button 
                        onClick={handleCreateVersion}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-600/20"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
                        Publish Revision
                      </button>
                   </div>
                   <div className="flex-1 p-12 bg-white/50 backdrop-blur-sm overflow-y-auto">
                      <div className="max-w-[800px] mx-auto shadow-2xl shadow-black/5 bg-white border border-gray-100 rounded-2xl overflow-hidden">
                        <ProfessionalEditor 
                          content={richTextContent} 
                          onChange={setRichTextContent} 
                        />
                      </div>
                    </div>
                 </div>
               ) : (
                 <>
                   <div className="p-8 border-b border-[var(--outline-variant)]/20 bg-gray-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-gray-400">
                         <FileText size={18} />
                         <p className="text-[10px] font-bold uppercase tracking-widest italic">Live Agreement Viewport</p>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Version: {contract.versions?.[0]?.versionNumber || 'N/A'}</p>
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
                      {/* Customer Signature Display */}
                      {(contract.signatureType || contract.signature) && (
                        <div className="mt-16 pt-16 border-t border-gray-100 italic">
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-8 flex items-center gap-2">
                             <CheckCircle2 size={16} className="text-emerald-500"/> 
                             {contract.signatureType === 'MANUAL' ? 'Physically Signed & Uploaded' : 'Validated e-Signature'}
                          </p>
                          
                          {contract.signatureType === 'MANUAL' && contract.manualUploadUrl ? (
                            <div className="flex flex-col gap-4">
                              <a 
                                href={contract.manualUploadUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500/30 bg-blue-50/50 rounded-xl text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-100 transition-colors w-fit"
                              >
                                <ExternalLink size={14} />
                                View Uploaded Document
                              </a>
                            </div>
                          ) : (
                            (contract.signatureData || contract.signature?.signatureData) && (
                              <Image 
                                src={contract.signatureData || contract.signature?.signatureData || ''} 
                                alt="Signature" 
                                width={200} 
                                height={80} 
                                className="h-20 w-auto opacity-80" 
                              />
                            )
                          )}

                          <div className="mt-6 text-[9px] text-[#9E9E9E] font-medium leading-relaxed uppercase tracking-tighter">
                             Method: {contract.signatureType || 'DIGITAL CANVAS'} <br />
                             Execution Sync: {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : (contract.signature?.signedAt ? new Date(contract.signature.signedAt).toLocaleString() : 'N/A')}
                             {!contract.signatureType && contract.signature?.ipAddress && (
                               <><br />Network Source: {contract.signature.ipAddress}</>
                             )}
                          </div>
                        </div>
                      )}

                      {contract.counterSignatureData && (
                        <div className="mt-16 pt-16 border-t border-gray-100 italic">
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-500 mb-8 flex items-center gap-2 font-display">
                             <ShieldCheck size={16} /> Managerial Authorization Seal
                          </p>
                          <Image 
                            src={contract.counterSignatureData} 
                            alt="Counter Signature" 
                            width={200} 
                            height={80} 
                            className="h-20 w-auto opacity-80 mix-blend-multiply transition-opacity duration-1000 grayscale hover:grayscale-0" 
                          />
                          <div className="mt-6 text-[9px] text-[#9E9E9E] font-medium leading-relaxed uppercase tracking-tighter">
                             Authorized By: {contract.counterSignerName} <br />
                             Execution Sync: {new Date(contract.counterSignedAt!).toLocaleString()}
                          </div>
                        </div>
                      )}
                   </div>
                 </>
               )}
            </div>
          </FadeUp>
        </div>

        <div className="lg:col-span-4 space-y-10">
           <FadeUp delay={0.3}>
              <div className="bg-[#1B1B1B] p-10 rounded-[2.5rem] text-white shadow-2xl shadow-[#1B1B1B]/10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                    <History size={80}/>
                 </div>
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-6 flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-[var(--primary)]"></div>
                       Agreement Profile
                    </h4>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] italic mb-1">Contractor</p>
                          <p className="text-xl font-bold tracking-tight">{contract.booking?.customer?.name || 'Unknown'}</p>
                          <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest mt-0.5">{contract.booking?.customer?.email || "Personal Account"}</p>
                       </div>
                          <p className="text-xl font-bold tracking-tight text-[var(--primary)] italic uppercase tracking-tighter">
                            {contract.booking?.product?.name || 'Workspace'} @ {contract.booking?.product?.location?.name || 'Sspacia'}
                          </p>
                    </div>
                 </div>
              </div>
           </FadeUp>

           <FadeUp delay={0.4}>
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-4">
                   <h3 className="text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-3 italic">
                     <MessageCircle size={14} className="text-[var(--primary)]"/> Communication Thread
                   </h3>
                   <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 animate-pulse">
                      <div className="h-1 w-1 rounded-full bg-orange-500"></div>
                      <span className="text-[8px] font-bold text-orange-600 uppercase tracking-widest">Control Node Live</span>
                   </div>
                 </div>

                 <div className="space-y-4">
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
                     <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageCircle size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No active negotiations</p>
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
