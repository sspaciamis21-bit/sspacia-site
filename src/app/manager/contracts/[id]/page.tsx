'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { generateInitialAgreement } from '@/lib/clm/templates';

import type { Contract, ContractStatusName, NegotiationMessage } from '@/types/clm';

import Image from 'next/image';
import '@/components/clm/clm.css';

const getPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 30) {
        const months = Math.round(diffDays / 30);
        return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    }
    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'}`;
};

export default function ManagerContractDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const [richTextContent, setRichTextContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      if (!id) return;
      const data = await adminContractsApi.get(Number(id));
      setContract(data);
      // Don't overwrite editor content while user is editing
      if (data.versions?.[0]?.content && !editingRef.current) {
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
    const tid = toast.loading('Sending for review...');
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
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 animate-pulse">Loading Agreement...</p>
      </div>
    );
  }

  if (!contract) return null;

  const currentStatusName = contract.status.name as ContractStatusName;
  const isDraftOrNeg = currentStatusName === 'DRAFT' || currentStatusName === 'NEGOTIATION';
  const isSigned = currentStatusName === 'SIGNED';

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 md:px-8 font-sans" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 border-b border-neutral-100 pb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="h-1 w-4 bg-[var(--clm-primary)]"></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Agreement Management // {id}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-neutral-900 tracking-tight">
              {contract.contractNumber}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={currentStatusName} size="sm" />
              <div className="h-4 w-[1px] bg-neutral-200"></div>
              <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Official Leave & Licence Agreement</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={() => router.push('/manager/contracts')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-none bg-white border border-neutral-200 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            {isDraftOrNeg && (
              <>
                <button 
                  onClick={() => {
                    const nextEditing = !editing;
                    setEditing(nextEditing);
                    editingRef.current = nextEditing;
                    
                    if (nextEditing) {
                        if (contract.versions?.[0]?.content) {
                           setRichTextContent(contract.versions[0].content);
                        } else if (!richTextContent || richTextContent === '') {
                           const template = generateInitialAgreement({
                              date: new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                              companyAddress: "Sspacia India Private Limited",
                              customerName: contract.booking?.customer?.name || 'Authorized Signatory',
                              customerOrg: contract.booking?.customer?.organization || contract.booking?.customer?.name || 'Organization',
                              customerDesignation: "Authorized Signatory",
                              customerPan: "________________",
                              customerPhone: contract.booking?.customer?.phone || "________________",
                              customerEmail: contract.booking?.customer?.email || "________________",
                              userId: String(contract.booking?.userId || '_____'),
                              productType: contract.booking?.product?.type?.displayName || contract.booking?.product?.name || "Office Space",
                              productName: contract.booking?.product?.name || "Workspace",
                              centerAddress: contract.booking?.product?.location?.address || contract.booking?.product?.location?.name || "Sspacia Center",
                              period: getPeriod(contract.booking.startDate, contract.booking.endDate),
                              startDate: new Date(contract.booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                              expiryDate: new Date(contract.booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                              cost: String(contract.booking?.totalAmount || '0'),
                              costInWords: "________________",
                              calculatedCost: String(contract.booking?.totalAmount || '0'),
                              calculatedCostInWords: "________________",
                              capacity: "1",
                              depositAmount: "0",
                              depositAmountInWords: "________________",
                              lockInPeriod: "12 Months",
                              noticePeriod: "2 Months",
                              escalationPercentage: "5%",
                              renewalDate: "____________",
                              contractNumber: contract.contractNumber
                           });
                           setRichTextContent(JSON.stringify(template));
                        }
                    }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm ${
                    editing 
                      ? 'bg-orange-500 text-white shadow-orange-500/10' 
                      : 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  {editing ? <CheckCircle2 size={16} /> : <Edit2 size={16} />}
                  {editing ? 'Update' : 'Edit Agreement'}
                </button>
                <button 
                  onClick={handleSendToUser}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-none bg-[var(--clm-primary)] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm group"
                >
                  <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Send for Review
                </button>
              </>
            )}
            
            {isSigned && (contract.counterSignatureData || contract.signatureType === 'MANUAL') && !contract.finalDriveUrl && (
              <button 
                onClick={handleFinalise}
                className="flex items-center gap-4 px-10 py-5 rounded-none bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-2xl"
              >
                <CheckCircle2 size={20} />
                Finalize Agreement
              </button>
            )}
            
            {isSigned && !contract.counterSignatureData && contract.signatureType !== 'MANUAL' && (
              <button 
                onClick={() => setIsSignDialogOpen(true)}
                className="flex items-center gap-3 px-8 py-3.5 rounded-none bg-orange-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 group"
              >
                <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                Counter-Sign
              </button>
            )}
          </div>
        </div>
      </FadeUp>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <FadeUp delay={0.1}>
            <div className="bg-white border border-neutral-200 p-8 shadow-sm rounded-none">
               <div className="relative z-10 w-full">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-800 mb-6 flex items-center gap-4 font-sans">
                    <div className="h-2 w-6 bg-[var(--clm-primary)]"></div>
                    Agreement Status Lifecycle
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
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-600">Agreement Editor</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                               setEditing(false);
                               if (contract?.versions?.[0]?.content) {
                                 setRichTextContent(contract.versions[0].content);
                               }
                            }}
                            className="px-6 py-2 rounded-none bg-white border border-neutral-200 text-neutral-600 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-neutral-50 transition-all shadow-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleCreateVersion}
                            disabled={saving}
                            className="flex items-center gap-3 px-6 py-2 rounded-none bg-orange-600 text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-orange-700 transition-all shadow-lg"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
                            Confirm update
                          </button>
                       </div>
                    </div>
                    <div className="flex-1 p-8 bg-neutral-50/30 overflow-y-auto">
                       <div className="max-w-[850px] mx-auto bg-white border border-neutral-200 shadow-2xl rounded-none overflow-hidden">
                        <ProfessionalEditor 
                          key={`${contract.id}:${contract.versions?.[0]?.id ?? 'draft'}:${editing ? 'editing' : 'view'}`}
                          content={richTextContent} 
                          onChange={setRichTextContent} 
                        />
                      </div>
                    </div>
                 </div>
               ) : (
                 <>
                    <div className="p-6 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                       <div className="flex items-center gap-4 text-[#9E9E9E]">
                          <FileText size={20} />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] font-sans">Agreement Preview</p>
                       </div>
                       <p className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">V.{contract.versions?.[0]?.versionNumber || '0.0'}</p>
                    </div>
                    <div className="flex-1 p-6 md:p-10">
                       <ContractDocViewer
                          content={contract.versions?.[0]?.content || undefined}
                          templateParams={!contract.versions?.[0]?.content ? {
                            date: contract.createdAt ? new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
                            customerName: contract.booking?.customer?.name,
                            customerOrg: contract.booking?.customer?.organization || contract.booking?.customer?.name,
                            productType: contract.booking?.product?.type?.displayName || contract.booking?.product?.name,
                            productName: contract.booking?.product?.name,
                            centerAddress: contract.booking?.product?.location?.address || contract.booking?.product?.location?.name,
                            period: getPeriod(contract.booking.startDate, contract.booking.endDate),
                            startDate: new Date(contract.booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
                            expiryDate: new Date(contract.booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
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

                             <div className="text-[9px] text-neutral-400 font-bold space-y-1 uppercase tracking-tighter">
                                <p>Method: {contract.signatureType || 'E-SIGNATURE'}</p>
                               <p>Time: {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : (contract.signature?.signedAt ? new Date(contract.signature.signedAt).toLocaleString() : 'N/A')}</p>
                            </div>
                          </div>
                        )}

                        {/* Manager */}
                        {contract.counterSignatureData && (
                          <div className="space-y-8">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">
                                Management Authorization
                             </p>
                            <Image 
                              src={contract.counterSignatureData} 
                              alt="Counter Signature" 
                              width={200} 
                              height={80} 
                              className="h-24 w-auto opacity-80 grayscale active:grayscale-0 transition-all" 
                            />
                            <div className="text-[9px] text-neutral-400 font-bold space-y-1 uppercase tracking-tighter">
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
              <div className="bg-white border border-neutral-200 p-8 rounded-none text-neutral-900 shadow-sm relative overflow-hidden">
                 <div className="relative z-10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-6 flex items-center gap-3 font-sans">
                       <div className="h-1 w-4 bg-[var(--clm-primary)]"></div>
                       Client Information
                    </h4>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-[0.3em] mb-1">Authorized Signatory</p>
                          <p className="text-xl font-sans font-bold tracking-tight text-neutral-900">{contract.booking?.customer?.name || 'GENERIC_USER'}</p>
                          <p className="text-[10px] font-medium text-neutral-400 tracking-wide mt-0.5">{contract.booking?.customer?.email || "PERSONAL_NODE"}</p>
                       </div>
                       <div className="pt-4 border-t border-neutral-100">
                          <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-[0.3em] mb-1">Product Details</p>
                          <p className="text-base font-bold text-[var(--clm-primary)] tracking-tight">
                            {contract.booking?.product?.name || 'HUB_SPACE'} / {contract.booking?.product?.location?.name || 'CORE'}
                          </p>
                        </div>
                     </div>
                 </div>
              </div>
           </FadeUp>

           <FadeUp delay={0.4}>
              <div className="space-y-8 font-sans">
                 <div className="flex items-center justify-between px-2 font-sans">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-4 text-neutral-600">
                      <MessageCircle size={16} className="text-[var(--primary)]"/> Negotiation History
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-600/10 border border-orange-600/20">
                       <div className="h-1 w-1 bg-orange-600"></div>
                       <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Active Thread</span>
                    </div>
                 </div>

                 <div className="space-y-6">
                   {contract.negotiations && contract.negotiations.length > 0 ? (
                     contract.negotiations.map((neg) => (
                       <div
                          key={neg.id}
                          className="clm-negotiation-thread group font-sans"
                          style={{
                            border: "1px solid var(--outline-variant)",
                            borderRadius: 0,
                            overflow: "hidden",
                            marginBottom: 20,
                            background: "var(--surface-low)",
                            boxShadow: "none",
                            fontFamily: 'var(--font-inter), sans-serif'
                          }}
                        >
                          <NegotiationThread 
                            negotiation={neg}
                            role="ADMIN"
                            onReply={(nid, msg, action) => handleSendMessage(msg, action)}
                          />
                       </div>
                     ))
                   ) : (
                     <div className="p-12 text-center bg-white border border-neutral-100 border-dashed rounded-none">
                        <MessageCircle size={24} className="mx-auto text-neutral-200 mb-4" />
                         <p className="text-[10px] text-neutral-200 font-bold uppercase tracking-[0.3em]">No negotiation history</p>
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
