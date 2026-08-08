/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, 
  Eye, 
  Loader2, 
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
    capacity?: number;
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
  nameOnDocument?: string;
  documentNumber?: string;
}

export default function UserDocumentsPage() {
  const { isLoading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [kycDocs, setKycDocs] = useState<{ aadhaar?: Document; pan?: Document }>({});

  const [aadhaarName, setAadhaarName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panName, setPanName] = useState('');
  const [panNumber, setPanNumber] = useState('');

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
      const response = await fetch('/api/user/documents');
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
      console.error('Documents fetch error:', error);
      // Suppress toast for a cleaner onboarding experience
      setDocuments([]);
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
    let name = '';
    let number = '';

    if (type === 'Aadhaar') {
        name = aadhaarName;
        number = aadhaarNumber;
        if (!name || !number) {
            toast.error("Please enter Name and Aadhaar Number");
            return;
        }
    } else {
        name = panName;
        number = panNumber;
        if (!name || !number) {
            toast.error("Please enter Name and PAN Number");
            return;
        }
    }

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
        formData.append('nameOnDocument', name);
        formData.append('documentNumber', number);

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
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Initializing...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold text-[#1B1C1C] tracking-tight uppercase">
              My <span className="text-[var(--primary)]">Documents</span>
            </h1>
            <p className="text-[#616161] font-bold text-[10px] uppercase tracking-widest mt-1 opacity-50">
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
                   className="w-full bg-white border border-[var(--outline-variant)] rounded-none pl-12 pr-4 py-4 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all"
                 />
              </div>
          </div>
        </div>

        {/* KYC SECTION */}
        <section className="mt-12 overflow-hidden rounded-none border border-white/10 bg-[#1B1C1C] p-10 md:p-14 text-white relative shadow-xl">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[var(--primary)]/20 to-transparent pointer-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="max-w-xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-[0.2em]">
                        <CheckCircle size={10} className={kycStatus() === 'VERIFIED' ? 'text-green-400' : 'text-gray-400'} />
                        Identity Verification Node
                    </div>
                    <h2 className="text-3xl font-display font-bold uppercase tracking-tight">
                        KYC <span className="text-[var(--primary)]">Compliance</span>
                    </h2>
                    <p className="text-white/40 font-bold text-[10px] leading-relaxed uppercase tracking-[0.2em] max-w-sm">
                        Upload your core identity assets to unlock premium booking nodes.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                        {kycStatus() === 'VERIFIED' ? (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-none bg-green-500/5 border border-green-500/20 text-green-400">
                                <CheckCircle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Profile Verified</span>
                            </div>
                        ) : kycStatus() === 'PENDING' ? (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-none bg-orange-500/5 border border-orange-500/20 text-orange-400">
                                <Clock size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Verification in Progress</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 px-6 py-4 rounded-none bg-red-500/5 border border-red-500/20 text-red-400">
                                <AlertTriangle size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{kycStatus() === 'REJECTED' ? 'Verification Rejected' : 'Compliance Pending'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto">
                    {/* AADHAAR */}
                    <div className={`p-8 rounded-none border transition-all ${kycDocs.aadhaar ? 'bg-white/5 border-white/10' : 'bg-[var(--primary)]/5 border-[var(--primary)]/30 group-hover:border-[var(--primary)]'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <FileText size={20} className={kycDocs.aadhaar ? 'text-white/20' : 'text-[var(--primary)]'} />
                           {kycDocs.aadhaar && (
                             <span className={`text-[7px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest ${
                                kycDocs.aadhaar.status.name === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 
                                kycDocs.aadhaar.status.name === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 
                                'bg-orange-500/20 text-orange-400'
                             }`}>
                                {kycDocs.aadhaar.status.name}
                             </span>
                           )}
                        </div>
                        <h4 className="font-display font-bold uppercase tracking-tight text-xs mb-1">Aadhaar Card</h4>
                        <p className="text-[9px] text-[#5A5A72] font-bold uppercase tracking-widest mb-6">Front & Back Combined</p>
                        
                        {!kycDocs.aadhaar || kycDocs.aadhaar.status.name === 'REJECTED' ? (
                            <>
                                <div className="space-y-3 mb-4">
                                    <input 
                                        type="text" 
                                        placeholder="Name on Aadhaar" 
                                        value={aadhaarName}
                                        onChange={(e) => setAadhaarName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all placeholder:text-[#5A5A72] text-white"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Aadhaar Number" 
                                        value={aadhaarNumber}
                                        onChange={(e) => setAadhaarNumber(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all placeholder:text-[#5A5A72] text-white"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleUpload('Aadhaar')}
                                    disabled={isUploading || !aadhaarName || !aadhaarNumber}
                                    className="w-full py-3 rounded-none bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Uploading...' : 'Upload Now'}
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => window.open(kycDocs.aadhaar?.fileUrl, '_blank')}
                                className="w-full py-3 rounded-none bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                View File
                            </button>
                        )}
                    </div>

                    {/* PAN */}
                    <div className={`p-8 rounded-none border transition-all ${kycDocs.pan ? 'bg-white/5 border-white/10' : 'bg-[var(--primary)]/5 border-[var(--primary)]/30 group-hover:border-[var(--primary)]'}`}>
                        <div className="flex items-center justify-between mb-4">
                           <FileText size={20} className={kycDocs.pan ? 'text-white/20' : 'text-[var(--primary)]'} />
                           {kycDocs.pan && (
                             <span className={`text-[7px] font-black px-2 py-0.5 rounded-none uppercase tracking-widest ${
                                kycDocs.pan.status.name === 'APPROVED' ? 'bg-green-500/20 text-green-400' : 
                                kycDocs.pan.status.name === 'REJECTED' ? 'bg-red-500/20 text-red-400' : 
                                'bg-orange-500/20 text-orange-400'
                             }`}>
                                {kycDocs.pan.status.name}
                             </span>
                           )}
                        </div>
                        <h4 className="font-display font-bold uppercase tracking-tight text-xs mb-1">PAN Card</h4>
                        <p className="text-[9px] text-[#5A5A72] font-bold uppercase tracking-widest mb-6">Clear digital copy</p>
                        
                        {!kycDocs.pan || kycDocs.pan.status.name === 'REJECTED' ? (
                            <>
                                <div className="space-y-3 mb-4">
                                    <input 
                                        type="text" 
                                        placeholder="Name on PAN" 
                                        value={panName}
                                        onChange={(e) => setPanName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all placeholder:text-[#5A5A72] text-white"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="PAN Number" 
                                        value={panNumber}
                                        onChange={(e) => setPanNumber(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-none px-4 py-2 text-xs font-bold outline-none focus:border-[var(--primary)] transition-all placeholder:text-[#5A5A72] text-white"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleUpload('PAN')}
                                    disabled={isUploading || !panName || !panNumber}
                                    className="w-full py-3 rounded-none bg-white text-black text-[9px] font-black uppercase tracking-widest hover:bg-[var(--primary)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'Uploading...' : 'Upload Now'}
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => window.open(kycDocs.pan?.fileUrl, '_blank')}
                                className="w-full py-3 rounded-none bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                View File
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>

         {/* PURCHASE HUB SECTION */}
        <section className="mt-12 bg-white rounded-none p-10 md:p-14 border border-[var(--outline-variant)] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 blur-[100px] -mr-32 -mt-32 transition-all" />
            
            <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:items-center">
                <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[var(--primary)]">
                        <ShoppingBag size={16} />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Purchase Hub</span>
                    </div>
                    <h2 className="text-3xl font-display font-black text-neutral-800 uppercase tracking-tight leading-none">
                        Select Your <span className="text-[var(--primary)]">Service Node</span>
                    </h2>
                    <p className="text-[#616161] font-bold text-[10px] uppercase tracking-widest max-w-sm leading-relaxed opacity-50">
                        Initialize your workspace selection below. Once submitted, your intent will be bridged to our manager dashboard.
                    </p>
                </div>

                <div className="w-full lg:w-[450px] space-y-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Choose Workspace System</label>
                        <select 
                            value={selectedProductId}
                            onChange={(e) => {
                                setSelectedProductId(e.target.value);
                                setSelectedPlanId('');
                                setSelectedUnitId('');
                            }}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)] rounded-none px-6 py-4 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer"
                        >
                            <option value="">-- SELECT PRODUCT --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (@ {p.location.name})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Seats Option</label>
                        <select 
                            value={selectedUnitId}
                            onChange={(e) => setSelectedUnitId(e.target.value)}
                            disabled={!selectedProductId || (products.find(p => p.id === Number(selectedProductId))?.units.length === 0)}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)] rounded-none px-6 py-4 text-xs font-bold text-[#1B1C1C] outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <option value="">-- SELECT SEATS OPTION --</option>
                            {(() => {
                                const product = products.find(p => p.id === Number(selectedProductId));
                                if (!product) return null;
                                
                                // Group units by capacity to show one option per seater size
                                // Fallback to product.capacity if units are out of sync or missing
                                const unitCapacities = product.units.map(u => u.capacity);
                                const baseCapacities = unitCapacities.length > 0 ? Array.from(new Set(unitCapacities)) : [product.capacity || 1];
                                
                                // If all units show 1-seater but product is defined as more, prioritize product definition
                                const finalCapacities = (baseCapacities.length === 1 && baseCapacities[0] === 1 && (product.capacity || 1) > 1)
                                   ? [product.capacity!]
                                   : baseCapacities;

                                const uniqueCapacities = finalCapacities.sort((a, b) => a - b);
                                
                                return uniqueCapacities.map(cap => {
                                    const firstUnitOfCap = product.units.find(u => u.capacity === cap) || product.units[0];
                                    return (
                                        <option key={cap} value={firstUnitOfCap?.id}>
                                            {cap} Seater
                                        </option>
                                    );
                                });
                            })()}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-[0.2em] ml-2">Period of Time</label>
                        <select 
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            disabled={!selectedProductId}
                            className="w-full bg-[var(--surface-low)]/50 border border-[var(--outline-variant)] rounded-none px-6 py-4 text-xs font-bold text-neutral-800 outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <option value="">-- SELECT PERIOD --</option>
                            {products.find(p => p.id === Number(selectedProductId))?.pricingPlans.map(plan => (
                                <option key={plan.id} value={plan.id}>
                                    ₹{plan.price.toLocaleString()} / seat ({plan.durationType.displayName})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedPlanId && (
                        <div className="bg-[var(--primary)] p-6 space-y-3 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] -mr-16 -mt-16" />
                            <div className="flex justify-between items-end border-b border-white/20 pb-3">
                                <div>
                                    <p className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Unit Pricing</p>
                                    <p className="text-sm font-bold text-white">
                                        ₹{Number(products.find(p => p.id === Number(selectedProductId))?.pricingPlans.find(pl => pl.id === Number(selectedPlanId))?.price || 0).toLocaleString()} <span className="text-white/60 text-[9px] font-medium">/ seat</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Seats</p>
                                    <p className="text-sm font-bold text-white">
                                        × {(() => {
                                            const p = products.find(p => p.id === Number(selectedProductId));
                                            if (!p) return 1;
                                            if (selectedUnitId) {
                                                return p.units.find(u => u.id === Number(selectedUnitId))?.capacity || p.capacity || 1;
                                            }
                                            return p.capacity || 1;
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <p className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Total Monthly Rent</p>
                                <p className="text-xl font-display font-black text-white tracking-tighter">
                                    ₹{(() => {
                                        const p = products.find(p => p.id === Number(selectedProductId));
                                        const plan = p?.pricingPlans.find(pl => pl.id === Number(selectedPlanId));
                                        if (!p || !plan) return 0;
                                        const seats = selectedUnitId ? (p.units.find(u => u.id === Number(selectedUnitId))?.capacity || p.capacity || 1) : (p.capacity || 1);
                                        return (Number(plan.price) * seats).toLocaleString();
                                    })()}
                                </p>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmitRequest}
                        disabled={isSubmitting || !selectedProductId || !selectedPlanId}
                        className="w-full mt-4 bg-[var(--primary)] text-white py-5 rounded-none text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="w-4 h-4" />
                        )}
                        {isSubmitting ? 'INITIATING...' : 'SUBMIT PURCHASE REQUEST'}
                    </button>
                     <div className="flex justify-center items-center gap-2 pt-2">
                        <div className="w-1.5 h-1.5 bg-amber-500"></div>
                        <span className="text-[7px] font-black text-[#BDBDBD] uppercase tracking-[0.2em]">Bypass Gateway: Status ACTIVE</span>
                    </div>
                </div>
            </div>
        </section>

        <div className="mt-12 bg-white rounded-none p-10 md:p-14 border border-[var(--outline-variant)] shadow-sm">
          {filteredDocs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex p-10 bg-[var(--surface-low)] border border-[var(--outline-variant)] text-[#9E9E9E] mb-8">
                <FileText size={40} />
              </div>
              <h3 className="text-2xl font-display font-bold text-neutral-800 uppercase tracking-tight">No Documents Available</h3>
              <p className="max-w-xs mx-auto mt-4 text-[#616161] font-bold text-[10px] uppercase tracking-widest opacity-40 leading-relaxed">
                Your archive is currently empty. Agreements will appear here once finalized.
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
                  <tr className="text-[#9E9E9E] border-b border-[var(--outline-variant)]">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Document</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Card Number</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc) => (
                     <tr key={doc.id} className="group border-b border-[var(--outline-variant)]/30 last:border-0">
                      <td className="px-6 py-6 font-display font-bold text-[var(--primary)] text-sm">
                        #{doc.id}
                      </td>
                      <td className="px-6 py-6">
                        <div>
                          <p className="font-bold text-neutral-800 text-sm uppercase tracking-tight">{doc.title}</p>
                          <p className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-widest mt-1">{doc.category.displayName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                          <p className="text-[12px] font-bold text-neutral-800 uppercase tracking-tight">{doc.nameOnDocument || '-'}</p>
                      </td>
                      <td className="px-6 py-6">
                          <p className="text-[12px] font-bold text-neutral-800 uppercase tracking-tight">{doc.documentNumber || '-'}</p>
                      </td>
                      <td className="px-6 py-6">
                         <div className="flex items-center gap-2">
                           <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-[8px] font-black uppercase tracking-widest border transition-all`} 
                                 style={{ backgroundColor: `${doc.status.color}10`, color: doc.status.color, borderColor: `${doc.status.color}30` }}>
                             {doc.status.name === 'APPROVED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                             {doc.status.name === 'APPROVED' ? 'APPROVED' : doc.status.name === 'REJECTED' ? 'REJECTED' : doc.status.displayName}
                           </span>
                           <span className="text-[10px] font-bold text-[#9E9E9E]">
                             {new Date(doc.createdAt).toLocaleDateString()}
                           </span>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end">
                          <button 
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                            className="px-3 py-1.5 bg-white border border-neutral-200 text-[#1B1C1C] hover:bg-black hover:text-white transition-all text-[9px] font-bold uppercase tracking-widest"
                          >
                            VIEW
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
