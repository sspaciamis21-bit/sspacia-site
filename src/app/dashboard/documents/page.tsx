'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, 
  Eye, 
  Loader, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ShoppingBag,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface PricingPlan {
    id: number;
    price: number;
    durationTypeId: number;
    durationType: { id: number; name: string; displayName: string };
}

interface ProductUnit {
    id: number;
    name: string;
    capacity: number;
    description?: string;
}

interface Product {
    id: number;
    name: string;
    location: { name: string };
    pricingPlans: PricingPlan[];
    units: ProductUnit[];
}

interface Document {
  id: number;
  title: string;
  category: {
    id: number;
    name: string;
    displayName: string;
    slug: string;
  };
  status: {
    id: number;
    name: string;
    displayName: string;
    color: string;
  };
  createdAt: string;
  fileUrl: string;
}

export default function UserDocumentsPage() {
  const { isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [kycDocs, setKycDocs] = useState<{ aadhaar?: Document; pan?: Document }>({});

  // Product Selection State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
      try {
          const res = await fetch('/api/user/products');
          const json = await res.json();
          if (json.data) setProducts(json.data);
      } catch (err) {
          console.error('Failed to load products', err);
      }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/documents');
      if (!response.ok) throw new Error('Failed to fetch');
      const json = await response.json();
      const docs = json.data as Document[];
      setDocuments(docs);
      
      // Extract KYC docs
      const kyc = docs.filter(d => d.category.slug === 'kyc');
      setKycDocs({
        aadhaar: kyc.find(d => d.title.toLowerCase().includes('aadhaar')),
        pan: kyc.find(d => d.title.toLowerCase().includes('pan'))
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
      if (!selectedProductId || !selectedPlanId) {
          toast.error("Please select a product and a pricing plan");
          return;
      }

      const product = products.find(p => p.id === Number(selectedProductId));
      const plan = product?.pricingPlans.find(p => p.id === Number(selectedPlanId));

      if (!product || !plan) return;

      setIsSubmitting(true);
      const toastId = toast.loading("Finalizing your purchase request...");

      try {
          const res = await fetch('/api/user/bookings/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  productId: product.id,
                  durationTypeId: plan.durationTypeId,
                  unitId: selectedUnitId ? Number(selectedUnitId) : undefined,
                  startDate: new Date().toISOString()
              })
          });

          const json = await res.json();
          if (res.ok) {
              toast.success("Purchase Request Logged", {
                  id: toastId,
                  description: "A manager will review your request and KYC documents shortly."
              });
              setSelectedProductId('');
              setSelectedPlanId('');
              setSelectedUnitId('');
          } else {
              toast.error(json.error || "Submission failed", { id: toastId });
          }
      } catch (err) {
          const message = err instanceof Error ? err.message : "Something went wrong";
          toast.error(message, { id: toastId });
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleUpload = async (type: 'Aadhaar' | 'PAN') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      const toastId = toast.loading(`Uploading ${type} Card...`);

      try {
        // 1. Get Categories to find KYC ID
        const catRes = await fetch('/api/admin/config/document-categories');
        const catJson = await catRes.json();
        const kycCategory = catJson.data.find((c: any) => c.slug === 'kyc');

        if (!kycCategory) throw new Error('KYC Category not configured');

        // 2. Prepare Form Data for Drive Upload API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', `${type} Card`);
        formData.append('categoryId', kycCategory.id.toString());
        formData.append('notes', `Uploaded via User Dashboard KYC flow`);

        // 3. Upload to Drive & Save in one step
        const uploadRes = await fetch('/api/admin/documents/drive-upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) {
           const errJson = await uploadRes.json();
           throw new Error(errJson.error || 'Upload failed');
        }
        
        toast.success(`${type} Card uploaded and pending verification`, { id: toastId });
        fetchDocuments();
      } catch (err) {
        console.error(err instanceof Error ? err.message : 'Unknown error');
        const message = err instanceof Error ? err.message : 'Processing failed';
        toast.error(message, { id: toastId });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const kycStatus = () => {
      if (!kycDocs.aadhaar || !kycDocs.pan) return 'INCOMPLETE';
      if (kycDocs.aadhaar.status.name === 'APPROVED' && kycDocs.pan.status.name === 'APPROVED') return 'VERIFIED';
      if (kycDocs.aadhaar.status.name === 'REJECTED' || kycDocs.pan.status.name === 'REJECTED') return 'REJECTED';
      return 'PENDING';
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.id.toString().includes(searchQuery.toLowerCase())
  );

  if (loading || authLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Syncing Secure Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold text-[#1B1C1C] tracking-tight italic uppercase">
              My <span className="text-[var(--primary)] not-italic">Documents</span>
            </h1>
            <p className="text-[#616161] font-bold text-sm uppercase tracking-widest opacity-70">
              Access your lease agreements, membership terms, and official letters.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] group-focus-within:text-[var(--primary)] transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[var(--outline-variant)] rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-[var(--primary)]/10 outline-none transition-all shadow-sm"
                />
              </div>
          </div>
        </div>

        {/* KYC SECTION */}
        <section className="mt-12 overflow-hidden rounded-[2.5rem] border border-[var(--outline-variant)]/50 bg-[#1B1C1C] p-8 md:p-12 text-white relative shadow-2xl">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--primary)]/20 to-transparent pointer-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="max-w-xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] font-black uppercase tracking-[0.2em] italic">
                        <CheckCircle size={10} className={kycStatus() === 'VERIFIED' ? 'text-green-400' : 'text-gray-400'} />
                        Identity Verification Node
                    </div>
                    <h2 className="text-3xl font-display font-bold italic uppercase tracking-tight">
                        KYC <span className="text-[var(--primary)] not-italic">Compliance</span>
                    </h2>
                    <p className="text-gray-400 font-bold text-sm leading-relaxed uppercase tracking-widest opacity-80">
                        Upload your core identity assets to unlock premium booking nodes and streamlined checkout logic.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                        {kycStatus() === 'VERIFIED' ? (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400">
                                <CheckCircle size={18} />
                                <span className="text-xs font-black uppercase tracking-widest">Profile Verified</span>
                            </div>
                        ) : kycStatus() === 'PENDING' ? (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
                                <Clock size={18} />
                                <span className="text-xs font-black uppercase tracking-widest">Verification in Progress</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                                <AlertTriangle size={18} />
                                <span className="text-xs font-black uppercase tracking-widest italic">{kycStatus() === 'REJECTED' ? 'Verification Rejected - Re-upload' : 'Compliance Pending'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                    {/* AADHAAR */}
                    <div className={`p-6 rounded-3xl border transition-all ${kycDocs.aadhaar ? 'bg-white/5 border-white/10' : 'bg-[var(--primary)]/10 border-[var(--primary)]/30 hover:border-[var(--primary)] hover:scale-105'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <FileText size={24} className={kycDocs.aadhaar ? 'text-gray-500' : 'text-[var(--primary)]'} />
                           {kycDocs.aadhaar && (
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                kycDocs.aadhaar.status.name === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 
                                kycDocs.aadhaar.status.name === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 
                                'bg-orange-500/20 text-orange-400'
                             }`}>
                                {kycDocs.aadhaar.status.name}
                             </span>
                           )}
                        </div>
                        <h4 className="font-display font-bold uppercase tracking-tight text-sm italic mb-1">Aadhaar Card</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Front & Back Combined</p>
                        
                        {!kycDocs.aadhaar || kycDocs.aadhaar.status.name === 'REJECTED' ? (
                            <button 
                                onClick={() => handleUpload('Aadhaar')}
                                disabled={isUploading}
                                className="w-full py-3 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50"
                            >
                                {isUploading ? 'Uploading...' : 'Upload Now'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => window.open(kycDocs.aadhaar?.fileUrl, '_blank')}
                                className="w-full py-3 rounded-xl bg-white/5 text-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                View File
                            </button>
                        )}
                    </div>

                    {/* PAN */}
                    <div className={`p-6 rounded-3xl border transition-all ${kycDocs.pan ? 'bg-white/5 border-white/10' : 'bg-[var(--primary)]/10 border-[var(--primary)]/30 hover:border-[var(--primary)] hover:scale-105'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <FileText size={24} className={kycDocs.pan ? 'text-gray-500' : 'text-[var(--primary)]'} />
                           {kycDocs.pan && (
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                kycDocs.pan.status.name === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 
                                kycDocs.pan.status.name === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 
                                'bg-orange-500/20 text-orange-400'
                             }`}>
                                {kycDocs.pan.status.name}
                             </span>
                           )}
                        </div>
                        <h4 className="font-display font-bold uppercase tracking-tight text-sm italic mb-1">PAN Card</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Clear digital copy</p>
                        
                        {!kycDocs.pan || kycDocs.pan.status.name === 'REJECTED' ? (
                            <button 
                                onClick={() => handleUpload('PAN')}
                                disabled={isUploading}
                                className="w-full py-3 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50"
                            >
                                {isUploading ? 'Uploading...' : 'Upload Now'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => window.open(kycDocs.pan?.fileUrl, '_blank')}
                                className="w-full py-3 rounded-xl bg-white/5 text-white/50 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                View File
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>

        {/* PURCHASE HUB SECTION */}
        <section className="mt-12 bg-white rounded-[2.5rem] p-8 md:p-12 border border-[var(--outline-variant)]/50 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-[var(--primary)]/10" />
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:items-center">
                <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--surface-low)] border border-[var(--outline-variant)]/30 text-[var(--primary)]">
                        <ShoppingBag size={18} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] italic">Operational Node: Purchase Hub</span>
                    </div>
                    <h2 className="text-3xl font-display font-black text-[#1B1C1C] italic uppercase tracking-tighter leading-none">
                        Select Your <span className="text-[var(--primary)] not-italic">Service Node</span>
                    </h2>
                    <p className="text-[#616161] font-bold text-sm uppercase tracking-widest max-w-lg leading-relaxed opacity-80 italic">
                        Initialize your workspace selection below. Once submitted, your intent will be bridged to our manager dashboard for final approval.
                    </p>
                </div>

                <div className="w-full lg:w-[450px] space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Choose Workspace System</label>
                        <select 
                            value={selectedProductId}
                            onChange={(e) => {
                                setSelectedProductId(e.target.value);
                                setSelectedPlanId('');
                                setSelectedUnitId('');
                            }}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/30 rounded-2xl px-6 py-4 text-sm font-bold text-[#1B1C1C] outline-none focus:ring-4 focus:ring-[var(--primary)]/5 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">-- SELECT PRODUCT --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (@ {p.location.name})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Seats Option</label>
                        <select 
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            disabled={!selectedProductId || (products.find(p => p.id === Number(selectedProductId))?.units.length === 0)}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/30 rounded-2xl px-6 py-4 text-sm font-bold text-[#1B1C1C] outline-none focus:ring-4 focus:ring-[var(--primary)]/5 transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <option value="">-- SELECT SEATS OPTION --</option>
                            {products.find(p => p.id === Number(selectedProductId))?.units.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.capacity} Seater)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Period of Time</label>
                        <select 
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            disabled={!selectedProductId}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)]/30 rounded-2xl px-6 py-4 text-sm font-bold text-[#1B1C1C] outline-none focus:ring-4 focus:ring-[var(--primary)]/5 transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <option value="">-- SELECT PERIOD --</option>
                            {products.find(p => p.id === Number(selectedProductId))?.pricingPlans.map(plan => (
                                <option key={plan.id} value={plan.id}>
                                    ₹{plan.price.toLocaleString()} / Month ({plan.durationType.displayName})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting || !selectedProductId || !selectedPlanId}
                        className="w-full mt-4 bg-[#1B1C1C] text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:bg-[var(--primary)] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:hover:-translate-y-0 disabled:cursor-not-allowed italic"
                    >
                        {isSubmitting ? (
                            <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        {isSubmitting ? 'INITIATING...' : 'SUBMIT PURCHASE REQUEST'}
                    </button>
                    <div className="flex justify-center items-center gap-2 pt-2">
                        <Zap size={10} className="text-amber-500 animate-pulse" />
                        <span className="text-[8px] font-black text-[#BDBDBD] uppercase tracking-[0.4em] italic">Bypass Gateway: Status ACTIVE</span>
                    </div>
                </div>
            </div>
        </section>

        <div className="mt-12 bg-white rounded-[2.5rem] p-8 md:p-12 border border-[var(--outline-variant)]/50 shadow-2xl shadow-black/[0.02]">
          {filteredDocs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex p-10 rounded-[2rem] bg-[var(--surface-low)] text-[#9E9E9E] mb-8 shadow-inner border border-[var(--outline-variant)]/30">
                <FileText size={48} />
              </div>
              <h3 className="text-2xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">No Documents Available</h3>
              <p className="max-w-md mx-auto mt-4 text-[#616161] font-bold text-sm uppercase tracking-widest opacity-60 leading-relaxed">
                Your archive is currently empty. Agreements and official documents will appear here once finalized by the management.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4">
                 <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-black uppercase tracking-[0.2em]">
                    <AlertTriangle size={14} />
                    Integrity Link: Active
                 </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-[#9E9E9E]">
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] italic">Archive ID</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] italic">Document Meta</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] italic">Timeline</th>
                    <th className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] italic text-right">Interaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
                     <tr key={doc.id} className="group">
                      <td className="px-6 py-6 bg-[var(--surface-low)]/30 first:rounded-l-3xl border-y border-l border-[var(--outline-variant)]/20 font-display font-bold text-[var(--primary)] text-sm italic">
                        #{doc.id}
                      </td>
                      <td className="px-6 py-6 bg-[var(--surface-low)]/30 border-y border-[var(--outline-variant)]/20">
                        <div>
                          <p className="font-bold text-[#1C1C1C] text-sm uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors cursor-pointer">{doc.title}</p>
                          <p className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-widest mt-1 italic">{doc.category.displayName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6 bg-[var(--surface-low)]/30 border-y border-[var(--outline-variant)]/20">
                         <div className="flex items-center gap-2">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all`} 
                                 style={{ backgroundColor: `${doc.status.color}20`, color: doc.status.color, border: `1px solid ${doc.status.color}30` }}>
                             {doc.status.name === 'APPROVED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                             {doc.status.displayName}
                           </span>
                           <span className="text-[10px] font-bold text-[#9E9E9E] italic">
                             {new Date(doc.createdAt).toLocaleDateString()}
                           </span>
                         </div>
                      </td>
                      <td className="px-6 py-6 bg-[var(--surface-low)]/30 last:rounded-r-3xl border-y border-r border-[var(--outline-variant)]/20 text-right">
                        <div className="flex items-center justify-end gap-3 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                          <button 
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                            className="p-3 rounded-xl bg-white text-[#616161] hover:text-[var(--primary)] shadow-sm border border-[var(--outline-variant)]/30 hover:scale-110 active:scale-95 transition-all"
                            title="Preview"
                          >
                            <Eye size={16} />
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
