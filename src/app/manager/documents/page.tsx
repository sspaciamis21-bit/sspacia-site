'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Loader, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Clock,
  Filter,
  Users,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Mail,
  MoreVertical
} from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Document {
  id: number;
  title: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  category: {
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
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface DocumentStatus {
    id: number;
    name: string;
    displayName: string;
}

interface UserGroup {
    customer: {
        id: number;
        name: string;
        email: string;
    };
    documents: Document[];
    statusSummary: {
        pending: number;
        approved: number;
        rejected: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DocumentVerificationPage() {
  const { isLoading: authLoading } = useAuth();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [statuses, setStatuses] = useState<DocumentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'individual' | 'collective'>('collective');
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchConfig();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/documents');
      const json = await res.json();
      if (res.ok) {
        setDocuments(json.data);
      } else {
        toast.error(json.error || 'Failed to fetch documents');
      }
    } catch {
      toast.error('Network error while fetching documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
      try {
          const statusRes = await fetch('/api/admin/config/document-statuses');
          const statusJson = await statusRes.json();
          if (statusRes.ok) setStatuses(statusJson.data);
      } catch {
          // Ignore
      }
  };

  const handleReview = async (id: number, statusName: 'APPROVED' | 'REJECTED') => {
      const statusObj = statuses.find(s => s.name === statusName);
      if (!statusObj) return toast.error('Status configuration not found');

      const toastId = toast.loading(`${statusName === 'APPROVED' ? 'Approving' : 'Rejecting'}...`);
      
      let rejectionReason = '';
      if (statusName === 'REJECTED') {
          rejectionReason = window.prompt('Reason for rejection:') || '';
          if (!rejectionReason) {
              toast.dismiss(toastId);
              return;
          }
      }

      try {
          const res = await fetch('/api/admin/documents', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id,
                  statusId: statusObj.id,
                  rejectionReason: rejectionReason || undefined
              })
          });

          if (res.ok) {
              toast.success(`Success`, { id: toastId });
              fetchDocuments();
          } else {
              const json = await res.json();
              toast.error(json.error || 'Failed', { id: toastId });
          }
      } catch {
          toast.error('Network error', { id: toastId });
      }
  };

  // ─── DATA PROCESSING ───────────────────────────────────────────────────────

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             doc.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || doc.status.id === statusFilter;
        const matchesCategory = categoryFilter === 'ALL' || doc.category.slug === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [documents, searchQuery, statusFilter, categoryFilter]);

  const userGroups = useMemo(() => {
      const groups: { [key: number]: UserGroup } = {};
      
      filteredDocs.forEach(doc => {
          const cid = doc.customer.id;
          if (!groups[cid]) {
              groups[cid] = {
                  customer: doc.customer,
                  documents: [],
                  statusSummary: { pending: 0, approved: 0, rejected: 0 }
              };
          }
          groups[cid].documents.push(doc);
          if (doc.status.name === 'PENDING') groups[cid].statusSummary.pending++;
          else if (doc.status.name === 'APPROVED') groups[cid].statusSummary.approved++;
          else if (doc.status.name === 'REJECTED') groups[cid].statusSummary.rejected++;
      });
      
      return Object.values(groups).sort((a, b) => b.statusSummary.pending - a.statusSummary.pending);
  }, [filteredDocs]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(documents.map(d => d.category.slug)));
    return unique.map(slug => {
        const doc = documents.find(d => d.category.slug === slug);
        return { slug, name: doc?.category.displayName || slug };
    });
  }, [documents]);

  const toggleUser = (id: number) => {
      setExpandedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  // ─── UI HELPERS ────────────────────────────────────────────────────────────

  const getStatusIcon = (name: string) => {
    switch (name) {
      case 'APPROVED': return <CheckCircle2 size={12} className="text-emerald-500" />;
      case 'REJECTED': return <XCircle size={12} className="text-rose-500" />;
      case 'PENDING':  return <Clock size={12} className="text-amber-500" />;
      default: return <AlertCircle size={12} className="text-gray-500" />;
    }
  };

  const getStatusStyle = (name: string) => {
      switch (name) {
          case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
          case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
          case 'PENDING':  return 'bg-amber-50 text-amber-700 border-amber-100';
          default: return 'bg-gray-50 text-gray-700 border-gray-100';
      }
  };

  if (authLoading || (loading && documents.length === 0)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">
      <FadeUp>
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-[2.5rem] bg-[var(--primary)] text-white flex items-center justify-center shadow-2xl shadow-[var(--primary)]/30">
              <ShieldCheck size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter">Identity Center</h1>
              <p className="text-[#616161] font-medium text-lg mt-1 group">Collective & individual document verification</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-[var(--surface-low)] rounded-2xl border border-[var(--outline-variant)]/30 scale-105 origin-right">
              <button 
                onClick={() => setViewMode('collective')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'collective' ? 'bg-white text-[var(--primary)] shadow-sm border border-[var(--primary)]/10' : 'text-[#9E9E9E] hover:text-[#1B1C1C]'}`}
              >
                  <Users size={16} />
                  By User
              </button>
              <button 
                onClick={() => setViewMode('individual')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'individual' ? 'bg-white text-[var(--primary)] shadow-sm border border-[var(--primary)]/10' : 'text-[#9E9E9E] hover:text-[#1B1C1C]'}`}
              >
                  <LayoutGrid size={16} />
                  Flat View
              </button>
          </div>
        </div>

        {/* Global Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-12 bg-white/50 backdrop-blur-md p-8 rounded-[2rem] border border-[var(--outline-variant)]/40 shadow-sm relative z-10">
            <div className="lg:col-span-2 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#BDBDBD]" size={20} />
                <input 
                    type="text"
                    placeholder="Search by name, email or document title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[var(--outline-variant)]/30 rounded-2xl pl-14 pr-6 py-4.5 text-sm font-medium focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm transition-all"
                />
            </div>

            <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#BDBDBD]" size={18} />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full appearance-none bg-white border border-[var(--outline-variant)]/30 rounded-2xl pl-12 pr-6 py-4.5 text-sm font-bold text-[#1B1C1C] focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm cursor-pointer"
                >
                    <option value="ALL">ALL STATUSES</option>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
                </select>
            </div>

            <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-[#BDBDBD]" size={18} />
                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full appearance-none bg-white border border-[var(--outline-variant)]/30 rounded-2xl pl-12 pr-6 py-4.5 text-sm font-bold text-[#1B1C1C] focus:ring-2 focus:ring-[var(--primary)] outline-none shadow-sm cursor-pointer"
                >
                    <option value="ALL">ALL CATEGORIES</option>
                    {categories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
            </div>
        </div>

        {/* Dynamic Display Area */}
        <div className="mt-10 overflow-hidden min-h-[500px]">
          {viewMode === 'collective' ? (
              <div className="space-y-6">
                  {userGroups.length === 0 ? (
                      <EmptyState icon={<Users size={64} />} title="No User Data" />
                  ) : (
                    userGroups.map(group => (
                        <div key={group.customer.id} className="bg-white rounded-[2rem] border border-[var(--outline-variant)]/40 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-[#1B1C1C]/5">
                            {/* User Summary Header */}
                            <div 
                                onClick={() => toggleUser(group.customer.id)}
                                className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-[var(--surface-low)] flex items-center justify-center text-xl font-display font-black text-[#1B1C1C] border border-[var(--outline-variant)]/40 shadow-inner group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
                                        {group.customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[#1B1C1C] leading-none mb-1.5 focus:text-[var(--primary)]">{group.customer.name}</h3>
                                        <div className="flex items-center gap-2 text-[#9E9E9E] text-xs font-bold uppercase tracking-wider">
                                            <Mail size={12} />
                                            {group.customer.email}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex gap-4">
                                        {group.statusSummary.pending > 0 && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black border border-amber-100">
                                                <Clock size={12} />
                                                {group.statusSummary.pending} PENDING
                                            </div>
                                        )}
                                        <div className="px-4 py-2 bg-[var(--surface-low)] text-[#1B1C1C] rounded-xl text-[10px] font-black border border-[var(--outline-variant)]/30">
                                            {group.documents.length} DOCUMENTS
                                        </div>
                                    </div>
                                    <div className={`p-2 rounded-xl transition-transform ${expandedUsers.includes(group.customer.id) ? 'rotate-180 text-[var(--primary)]' : 'text-[#BDBDBD]'}`}>
                                        <ChevronDown size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Documents List */}
                            {expandedUsers.includes(group.customer.id) && (
                                <div className="border-t border-[var(--outline-variant)]/20 px-4 md:px-8 pb-8 animate-in slide-in-from-top duration-300">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left mt-4 border-separate border-spacing-y-2">
                                            <thead>
                                                <tr>
                                                    <th className="py-4 px-4 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest">Document Type</th>
                                                    <th className="py-4 px-4 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-center">Status</th>
                                                    <th className="py-4 px-4 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.documents.map(doc => (
                                                    <tr key={doc.id} className="bg-[var(--surface-low)]/30 rounded-2xl group/row transition-all hover:bg-[var(--surface-low)]/60">
                                                        <td className="py-6 px-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2.5 rounded-lg bg-white border border-[var(--outline-variant)]/30 text-[var(--primary)]">
                                                                    <FileText size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-[#1B1C1C] text-sm leading-tight mb-0.5">{doc.title}</p>
                                                                    <span className="text-[10px] font-black text-[var(--primary)] opacity-60 uppercase">{doc.category.displayName}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-6 px-4 text-center">
                                                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(doc.status.name)}`}>
                                                                {getStatusIcon(doc.status.name)}
                                                                {doc.status.displayName}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <a 
                                                                    href={doc.fileUrl} 
                                                                    target="_blank" 
                                                                    className="p-2.5 rounded-xl bg-white text-[#1B1C1C] border border-[var(--outline-variant)]/30 hover:border-[var(--primary)]/50 transition-all shadow-sm"
                                                                >
                                                                    <ExternalLink size={16} />
                                                                </a>
                                                                {doc.status.name === 'PENDING' && (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => handleReview(doc.id, 'APPROVED')}
                                                                            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <CheckCircle2 size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleReview(doc.id, 'REJECTED')}
                                                                            className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <XCircle size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                  )}
              </div>
          ) : (
            /* Flat view (previous version) */
            <div className="bg-white rounded-[2.5rem] border border-[var(--outline-variant)]/40 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-[var(--surface-low)]/50 border-b border-[var(--outline-variant)]/30">
                          <th className="py-6 px-8 text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest opacity-40">Document & Category</th>
                          <th className="py-6 px-8 text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest opacity-40">Uploaded By</th>
                          <th className="py-6 px-8 text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest opacity-40 text-center">Status</th>
                          <th className="py-6 px-8 text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest opacity-40 text-right">Workflow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--outline-variant)]/10">
                        {filteredDocs.map((doc) => (
                          <tr key={doc.id} className="hover:bg-[var(--surface-low)]/20 transition-all group">
                            <td className="py-8 px-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-[var(--surface-low)] flex items-center justify-center text-[var(--primary)] border border-[var(--outline-variant)]/30 shadow-sm transition-transform group-hover:scale-105">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1B1C1C] text-lg leading-none tracking-tight mb-1.5 group-hover:text-[var(--primary)] transition-colors">{doc.title}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-tighter text-[var(--primary)] px-2 py-0.5 rounded-md bg-[var(--primary)]/5 border border-[var(--primary)]/10">{doc.category.name}</span>
                                            <span className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-widest px-2">Added {new Date(doc.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-8 px-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-[var(--surface-low)] flex items-center justify-center font-black border border-[var(--outline-variant)]/40 text-[#1B1C1C]">
                                        {doc.customer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-[#1B1C1C] text-sm mb-0.5">{doc.customer.name}</p>
                                        <p className="text-[11px] text-[#616161] font-medium">{doc.customer.email}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="py-8 px-8 text-center">
                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(doc.status.name)}`}>
                                    {getStatusIcon(doc.status.name)}
                                    {doc.status.displayName}
                                </span>
                            </td>
                            <td className="py-8 px-8 text-right">
                                <div className="flex items-center justify-end gap-3 transition-all duration-300">
                                    <a 
                                        href={doc.fileUrl} 
                                        target="_blank" 
                                        className="p-3 rounded-2xl bg-white text-[#1B1C1C] hover:text-[var(--primary)] border border-[var(--outline-variant)]/40 hover:border-[var(--primary)]/50 shadow-sm transition-all"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                    {doc.status.name === 'PENDING' && (
                                        <>
                                            <button 
                                                onClick={() => handleReview(doc.id, 'APPROVED')}
                                                className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleReview(doc.id, 'REJECTED')}
                                                className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-32 text-[#9E9E9E]">
            <div className="p-8 rounded-full bg-[var(--surface-low)] mb-6 text-[#1B1C1C]/10 border border-[var(--outline-variant)]/30">
                {icon}
            </div>
            <p className="font-display font-bold text-2xl text-[#1B1C1C]">{title}</p>
            <p className="text-sm font-medium mt-2">Adjust your filters or wait for more data.</p>
        </div>
    );
}
