'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Tag,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Eye,
  User,
  Loader2,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Briefcase,
  DollarSign,
  ArrowUpDown,
  Send,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface CrmInquiry {
  id: number;
  srNo: number;
  inquiryDate: string;
  clientName: string;
  companyName: string | null;
  natureOfBusiness: string | null;
  companyGeography: 'Local' | 'National' | 'MNC';
  phone: string;
  email: string;
  companyAddress: string | null;
  centreRequired: string;
  whatRequired: string;
  noOfSeats: number | null;
  budget: string | null;
  otherRequirements: string | null;
  reference: string | null;
  leadAssignedTo: string;
  remarks: string | null;
  status: string;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Centre Products Mapping ────────────────────────────────────────────────
const CENTRE_OPTIONS = ['Mercado', 'Agarwal Complex', 'Premier House'] as const;

const CENTRE_PRODUCTS_MAP: Record<string, string[]> = {
  Mercado: [
    'Virtual Office',
    'Dedicated Cabin (Cabin A - 3 Seater)',
    'Dedicated Cabin (Cabin B - 3 Seater)',
    'Dedicated Cabin (Cabin C - 4 Seater)',
    'Dedicated Cabin (Cabin D - 4 Seater)',
    'Dedicated Cabin (Cabin E - 6 Seater)',
    'Dedicated Cabin (Cabin F - 6 Seater)',
    'Private Cabin (Cabin A - 6 Seater)',
    'Private Cabin (Cabin B - 6 Seater)',
    'Private Cabin (Cabin C - 8 Seater)',
    'Private Cabin (Cabin D - 8 Seater)',
    'Executive Cabin (Cabin A - 10 Seater)',
    'Executive Cabin (Cabin B - 12 Seater)',
    'Meeting Room (6 Seater)',
    'Board Room (14 Seater)',
    'Flexi Desk (Single Seat)',
    'Fixed Desk (Single Seat)',
    'Custom Managed Suite',
  ],
  'Agarwal Complex': [
    'Virtual Office',
    'Dedicated Cabin (Cabin A - 3 Seater)',
    'Dedicated Cabin (Cabin B - 3 Seater)',
    'Dedicated Cabin (Cabin C - 3 Seater)',
    'Dedicated Cabin (Cabin D - 4 Seater)',
    'Dedicated Cabin (Cabin E - 4 Seater)',
    'Private Cabin (Cabin A - 6 Seater)',
    'Private Cabin (Cabin B - 6 Seater)',
    'Private Cabin (Cabin C - 8 Seater)',
    'Executive Cabin (Cabin A - 10 Seater)',
    'Executive Cabin (Cabin B - 10 Seater)',
    'Meeting Room (5 Seater)',
    'Board Room (11 Seater)',
    'Custom Managed Suite',
  ],
  'Premier House': [
    'Virtual Office',
    'Dedicated Cabin (4 Seater)',
    'Private Cabin (Cabin A - 6 Seater)',
    'Private Cabin (Cabin B - 6 Seater)',
    'Private Cabin (Cabin C - 8 Seater)',
    'Executive Cabin (Cabin A - 10 Seater)',
    'Executive Cabin (Cabin B - 10 Seater)',
    'Meeting Room (4 Seater)',
    'Board Room (12 Seater)',
    'Event Room (40 Seater)',
    'Flexi Desk (Single Seat)',
    'Fixed Desk (Single Seat)',
    'Custom Managed Suite',
  ],
};

const GEOGRAPHY_OPTIONS = ['Local', 'National', 'MNC'] as const;

const LEAD_SOURCES = [
  'Website (sspacia.com)',
  'Google Search / Maps',
  'Broker / IPC Channel Partner',
  'Client Referral',
  'Social Media (LinkedIn/Instagram)',
  'Direct Walk-In',
  'Cold Calling / Outbound CRM',
  'Existing Sspacia Client Expansion',
  'Email Campaign / Newsletter',
  'Outdoor Hoarding / Event',
  'Other',
] as const;

const ASSIGNED_OPTIONS = ['Praveen Agarwal', 'Caron', 'Aaron', 'Self (CRM Team)'] as const;

const BUSINESS_SUGGESTIONS = [
  'IT & Software',
  'Financial Services & CA',
  'Legal & Corporate Law',
  'Consulting & Advisory',
  'E-Commerce & Retail',
  'Healthcare & Pharma',
  'Real Estate & Architecture',
  'Marketing & Advertising',
  'Trading & Logistics',
  'Education / EdTech',
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  NEW: { label: 'New Inquiry', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  FOLLOW_UP_SCHEDULED: { label: 'Follow-up Set', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  SITE_VISIT_PLANNED: { label: 'Site Visit Set', bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
  PROPOSAL_SENT: { label: 'Proposal Sent', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300' },
  NEGOTIATION: { label: 'Negotiation', bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  WON_CONVERTED: { label: 'Won / Deal Closed', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  LOST_CLOSED: { label: 'Lost / Closed', bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-300' },
};

export default function CrmInquiriesPage() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<CrmInquiry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [nextSrNo, setNextSrNo] = useState<number>(1);
  const [kpis, setKpis] = useState<any>({
    total: 0,
    today: 0,
    byCentre: { Mercado: 0, 'Agarwal Complex': 0, 'Premier House': 0 },
    byGeography: { Local: 0, National: 0, MNC: 0 },
    byStatus: {},
    byAssigned: {},
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [centreFilter, setCentreFilter] = useState<string>('ALL');
  const [geographyFilter, setGeographyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [referenceFilter, setReferenceFilter] = useState<string>('ALL');

  // Modals & Inline Row State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingInquiry, setEditingInquiry] = useState<CrmInquiry | null>(null);
  const [viewingInquiry, setViewingInquiry] = useState<CrmInquiry | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showInlineRow, setShowInlineRow] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    inquiryDate: new Date().toISOString().split('T')[0],
    clientName: '',
    companyName: '',
    natureOfBusiness: '',
    companyGeography: 'Local' as 'Local' | 'National' | 'MNC',
    phone: '',
    email: '',
    companyAddress: '',
    centreRequired: 'Mercado',
    whatRequired: 'Virtual Office',
    noOfSeats: 0,
    budget: '',
    otherRequirements: '',
    reference: 'Website (sspacia.com)',
    leadAssignedTo: 'Praveen Agarwal',
    remarks: '',
    status: 'NEW',
  });

  // Inline Row Form State
  const [inlineData, setInlineData] = useState({
    inquiryDate: new Date().toISOString().split('T')[0],
    clientName: '',
    companyName: '',
    natureOfBusiness: '',
    companyGeography: 'Local' as 'Local' | 'National' | 'MNC',
    phone: '',
    email: '',
    centreRequired: 'Mercado',
    whatRequired: 'Virtual Office',
    noOfSeats: 0,
    budget: '',
    reference: 'Website (sspacia.com)',
    leadAssignedTo: 'Praveen Agarwal',
    remarks: '',
  });

  // ─── Fetch Data ───────────────────────────────────────────────────────────
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (centreFilter !== 'ALL') params.set('centre', centreFilter);
      if (geographyFilter !== 'ALL') params.set('geography', geographyFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (assignedFilter !== 'ALL') params.set('assigned', assignedFilter);
      if (referenceFilter !== 'ALL') params.set('reference', referenceFilter);

      const res = await fetch('/api/crm/inquiries?' + params.toString());
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load inquiries');
      }
      const data = await res.json();
      setInquiries(data.inquiries || []);
      setKpis(data.kpis || {});
      setNextSrNo(data.nextSrNo || 1);
    } catch (error: any) {
      console.error('[CRM Inquiries Load Error]:', error);
      toast.error(error.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, centreFilter, geographyFilter, statusFilter, assignedFilter, referenceFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // ─── Reset Form ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      inquiryDate: new Date().toISOString().split('T')[0],
      clientName: '',
      companyName: '',
      natureOfBusiness: '',
      companyGeography: 'Local',
      phone: '',
      email: '',
      companyAddress: '',
      centreRequired: 'Mercado',
      whatRequired: 'Virtual Office',
      noOfSeats: 0,
      budget: '',
      otherRequirements: '',
      reference: 'Website (sspacia.com)',
      leadAssignedTo: 'Praveen Agarwal',
      remarks: '',
      status: 'NEW',
    });
    setEditingInquiry(null);
  };

  // ─── Open Edit Modal ──────────────────────────────────────────────────────
  const handleOpenEdit = (inq: CrmInquiry) => {
    setEditingInquiry(inq);
    setFormData({
      inquiryDate: inq.inquiryDate ? new Date(inq.inquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      clientName: inq.clientName || '',
      companyName: inq.companyName || '',
      natureOfBusiness: inq.natureOfBusiness || '',
      companyGeography: inq.companyGeography || 'Local',
      phone: inq.phone || '',
      email: inq.email || '',
      companyAddress: inq.companyAddress || '',
      centreRequired: inq.centreRequired || 'Mercado',
      whatRequired: inq.whatRequired || 'Virtual Office',
      noOfSeats: inq.noOfSeats || 0,
      budget: inq.budget || '',
      otherRequirements: inq.otherRequirements || '',
      reference: inq.reference || 'Website (sspacia.com)',
      leadAssignedTo: inq.leadAssignedTo || 'Praveen Agarwal',
      remarks: inq.remarks || '',
      status: inq.status || 'NEW',
    });
    setShowModal(true);
  };

  // ─── Modal Form Submit ────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      toast.error('Client Name is required');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingInquiry ? ('/api/crm/inquiries/' + editingInquiry.id) : '/api/crm/inquiries';
      const method = editingInquiry ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save inquiry');
      }

      toast.success(result.message || 'Inquiry saved successfully');
      setShowModal(false);
      resetForm();
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Direct Row Quick Submit ──────────────────────────────────────────────
  const handleInlineSubmit = async () => {
    if (!inlineData.clientName.trim()) {
      toast.error('Please enter Client Name in the table row');
      return;
    }

    const cleanPhone = inlineData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number in the table row');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inlineData.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const res = await fetch('/api/crm/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add inline inquiry');

      toast.success(result.message || 'Inquiry saved directly to table!');
      setShowInlineRow(false);
      setInlineData({
        inquiryDate: new Date().toISOString().split('T')[0],
        clientName: '',
        companyName: '',
        natureOfBusiness: '',
        companyGeography: 'Local',
        phone: '',
        email: '',
        centreRequired: 'Mercado',
        whatRequired: 'Virtual Office',
        noOfSeats: 0,
        budget: '',
        reference: 'Website (sspacia.com)',
        leadAssignedTo: 'Praveen Agarwal',
        remarks: '',
      });
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save inline inquiry');
    }
  };

  // ─── Delete Inquiry ───────────────────────────────────────────────────────
  const handleDelete = async (id: number, srNo: number) => {
    if (!confirm('Are you sure you want to delete Inquiry #' + srNo + '?')) return;

    try {
      const res = await fetch('/api/crm/inquiries/' + id, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.success('Inquiry #' + srNo + ' deleted');
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete inquiry');
    }
  };

  // ─── Quick Status Change from Row ─────────────────────────────────────────
  const handleQuickStatusChange = async (inqId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/crm/inquiries/' + inqId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success('Lead status updated');
      setInquiries((prev) =>
        prev.map((i) => (i.id === inqId ? { ...i, status: newStatus } : i))
      );
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  // ─── Export to CSV ────────────────────────────────────────────────────────
  const exportToCsv = () => {
    if (inquiries.length === 0) {
      toast.error('No inquiries to export');
      return;
    }

    const headers = [
      'SR No',
      'Date',
      'Client Name',
      'Company Name',
      'Nature of Business',
      'Geography',
      'Phone',
      'Email',
      'Company Address',
      'Centre Required',
      'What Required',
      'Seats',
      'Budget',
      'Reference',
      'Lead Assigned To',
      'Status',
      'Remarks',
    ];

    const rows = inquiries.map((inq) => [
      inq.srNo,
      new Date(inq.inquiryDate).toLocaleDateString('en-IN'),
      '"' + (inq.clientName || '').replace(/"/g, '""') + '"',
      '"' + (inq.companyName || '').replace(/"/g, '""') + '"',
      '"' + (inq.natureOfBusiness || '').replace(/"/g, '""') + '"',
      inq.companyGeography,
      '"' + inq.phone + '"',
      '"' + inq.email + '"',
      '"' + (inq.companyAddress || '').replace(/"/g, '""') + '"',
      inq.centreRequired,
      '"' + inq.whatRequired + '"',
      inq.noOfSeats || 0,
      '"' + (inq.budget || '') + '"',
      '"' + (inq.reference || '') + '"',
      '"' + inq.leadAssignedTo + '"',
      inq.status,
      '"' + (inq.remarks || '').replace(/"/g, '""') + '"',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'CRM_Inquiries_NBD_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded successfully');
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1700px] mx-auto space-y-6 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      {/* ─── Top Header & CRM Identity Banner ─────────────────────────────── */}
      <div className="bg-white border border-[var(--outline-variant)]/60 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
            <Shield size={16} /> CRM &amp; New Business Development (NBD) Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-[#1B1C1C]">
            Inquiry Capture &amp; Client Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-[#616161] mt-1 font-light max-w-2xl">
            Log, classify, assign, and track all incoming client inquiries across Mercado, Agarwal Complex, and Premier House in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all hover:scale-102 cursor-pointer rounded-xs"
          >
            <Plus size={16} /> Enter Inq (Form Modal)
          </button>

          <button
            type="button"
            onClick={() => setShowInlineRow(!showInlineRow)}
            className={
              'px-4 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer rounded-xs ' +
              (showInlineRow
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50 shadow-2xs')
            }
          >
            <FileSpreadsheet size={15} />
            <span>{showInlineRow ? 'Close Direct Row Inq' : '+ Direct Row Inq'}</span>
          </button>

          <button
            type="button"
            onClick={exportToCsv}
            className="px-3.5 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-2xs cursor-pointer rounded-xs"
            title="Export filtered inquiries to CSV"
          >
            <Download size={15} className="text-[#006064]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={fetchInquiries}
            className="p-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-600 rounded-xs shadow-2xs cursor-pointer"
            title="Refresh Inquiries"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-[#006064]' : ''} />
          </button>
        </div>
      </div>

      {/* ─── KPI Telemetry Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#616161]">Total Inquiries</div>
          <div className="text-2xl font-display font-black mt-1 text-[#006064]">{kpis.total || 0}</div>
          <div className="text-[11px] text-[#616161] font-light mt-0.5">All captured leads</div>
        </div>

        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Today's Inquiries</div>
          <div className="text-2xl font-display font-black mt-1 text-emerald-800">{kpis.today || 0}</div>
          <div className="text-[11px] text-[#616161] font-light mt-0.5">Logged today</div>
        </div>

        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-800">Mercado Center</div>
          <div className="text-2xl font-display font-black mt-1 text-cyan-900">{kpis.byCentre?.Mercado || 0}</div>
          <div className="text-[11px] text-[#616161] font-light mt-0.5">Mercado leads</div>
        </div>

        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800">Agarwal Complex</div>
          <div className="text-2xl font-display font-black mt-1 text-indigo-900">{kpis.byCentre?.['Agarwal Complex'] || 0}</div>
          <div className="text-[11px] text-[#616161] font-light mt-0.5">Agarwal Complex leads</div>
        </div>

        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-800">Premier House</div>
          <div className="text-2xl font-display font-black mt-1 text-purple-900">{kpis.byCentre?.['Premier House'] || 0}</div>
          <div className="text-[11px] text-[#616161] font-light mt-0.5">Premier House leads</div>
        </div>

        <div className="bg-white p-4 border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">Geography Mix</div>
          <div className="text-xs font-bold mt-1 text-neutral-800 space-y-0.5">
            <div>Local: <span className="text-[#006064]">{kpis.byGeography?.Local || 0}</span></div>
            <div>National: <span className="text-indigo-700">{kpis.byGeography?.National || 0}</span> | MNC: <span className="text-purple-700">{kpis.byGeography?.MNC || 0}</span></div>
          </div>
        </div>
      </div>

      {/* ─── Search & Filters Bar ─────────────────────────────────────────── */}
      <div className="bg-white p-4 border border-[var(--outline-variant)]/60 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input
              type="text"
              placeholder="Search by client name, company, phone, email, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 text-xs focus:outline-none focus:border-[#006064] rounded-xs bg-[#F8F9FA]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Centre Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1.5 border border-neutral-300 rounded-xs">
              <Building2 size={13} className="text-[#006064]" />
              <span className="text-[10px] font-bold uppercase text-neutral-600">Centre:</span>
              <select
                value={centreFilter}
                onChange={(e) => setCentreFilter(e.target.value)}
                className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Centres</option>
                {CENTRE_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Geography Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1.5 border border-neutral-300 rounded-xs">
              <Globe size={13} className="text-indigo-600" />
              <span className="text-[10px] font-bold uppercase text-neutral-600">Geography:</span>
              <select
                value={geographyFilter}
                onChange={(e) => setGeographyFilter(e.target.value)}
                className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Geographies</option>
                {GEOGRAPHY_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1.5 border border-neutral-300 rounded-xs">
              <Clock size={13} className="text-amber-600" />
              <span className="text-[10px] font-bold uppercase text-neutral-600">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map((k) => (
                  <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                ))}
              </select>
            </div>

            {/* Assigned To Filter */}
            <div className="flex items-center gap-1.5 bg-[#F8F9FA] px-2.5 py-1.5 border border-neutral-300 rounded-xs">
              <User size={13} className="text-purple-600" />
              <span className="text-[10px] font-bold uppercase text-neutral-600">Assigned:</span>
              <select
                value={assignedFilter}
                onChange={(e) => setAssignedFilter(e.target.value)}
                className="bg-transparent font-bold text-neutral-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Assigned</option>
                {ASSIGNED_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {(searchTerm || centreFilter !== 'ALL' || geographyFilter !== 'ALL' || statusFilter !== 'ALL' || assignedFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setCentreFilter('ALL');
                  setGeographyFilter('ALL');
                  setStatusFilter('ALL');
                  setAssignedFilter('ALL');
                  setReferenceFilter('ALL');
                }}
                className="text-[11px] font-bold text-red-600 hover:text-red-800 underline px-2 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Inquiries Main Table ─────────────────────────────────────────── */}
      <div className="bg-white border border-neutral-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-[#F1F3F5] border-b border-neutral-300 text-neutral-700 uppercase tracking-wider font-bold text-[10.5px]">
              <tr>
                <th className="p-3 w-14 text-center border-r border-neutral-300">SR.No</th>
                <th className="p-3 w-28 border-r border-neutral-300 whitespace-nowrap">Date</th>
                <th className="p-3 min-w-[210px] border-r border-neutral-300">Client &amp; Company</th>
                <th className="p-3 min-w-[190px] border-r border-neutral-300">Contact Details</th>
                <th className="p-3 min-w-[210px] border-r border-neutral-300">Centre &amp; Required</th>
                <th className="p-3 w-20 text-center border-r border-neutral-300">Seats</th>
                <th className="p-3 min-w-[140px] border-r border-neutral-300">Budget &amp; Source</th>
                <th className="p-3 min-w-[150px] border-r border-neutral-300">Lead Assigned</th>
                <th className="p-3 min-w-[150px] border-r border-neutral-300">Status</th>
                <th className="p-3 min-w-[180px] border-r border-neutral-300">Remarks</th>
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {/* ─── DIRECT INLINE ROW ENTRY ──────────────────────────────── */}
              {showInlineRow && (
                <tr className="bg-amber-50/70 border-b-2 border-amber-400 font-sans animate-in fade-in duration-150">
                  <td className="p-2.5 text-center font-mono font-bold text-amber-900 bg-amber-100/70 border-r border-neutral-300">
                    #{nextSrNo}
                  </td>

                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="date"
                      value={inlineData.inquiryDate}
                      onChange={(e) => setInlineData({ ...inlineData, inquiryDate: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  <td className="p-2 border-r border-neutral-300 space-y-1">
                    <input
                      type="text"
                      placeholder="Client Name *"
                      value={inlineData.clientName}
                      onChange={(e) => setInlineData({ ...inlineData, clientName: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={inlineData.companyName}
                      onChange={(e) => setInlineData({ ...inlineData, companyName: e.target.value })}
                      className="w-full px-2 py-0.5 text-xs border border-neutral-200 bg-white focus:outline-none rounded-xs"
                    />
                    <div className="flex items-center gap-1">
                      <select
                        value={inlineData.companyGeography}
                        onChange={(e) => setInlineData({ ...inlineData, companyGeography: e.target.value as any })}
                        className="px-1 py-0.5 text-[10px] font-bold border border-neutral-200 bg-white rounded-xs"
                      >
                        {GEOGRAPHY_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Nature of Business"
                        value={inlineData.natureOfBusiness}
                        onChange={(e) => setInlineData({ ...inlineData, natureOfBusiness: e.target.value })}
                        className="w-full px-1.5 py-0.5 text-[10px] border border-neutral-200 bg-white rounded-xs"
                      />
                    </div>
                  </td>

                  <td className="p-2 border-r border-neutral-300 space-y-1">
                    <input
                      type="tel"
                      placeholder="Phone (10 Digits) *"
                      value={inlineData.phone}
                      onChange={(e) => setInlineData({ ...inlineData, phone: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-mono border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={inlineData.email}
                      onChange={(e) => setInlineData({ ...inlineData, email: e.target.value })}
                      className="w-full px-2 py-0.5 text-xs font-mono border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  <td className="p-2 border-r border-neutral-300 space-y-1">
                    <select
                      value={inlineData.centreRequired}
                      onChange={(e) => {
                        const newCentre = e.target.value;
                        const available = CENTRE_PRODUCTS_MAP[newCentre] || ['Virtual Office'];
                        setInlineData({
                          ...inlineData,
                          centreRequired: newCentre,
                          whatRequired: available[0] || 'Virtual Office',
                          noOfSeats: available[0].toLowerCase().includes('virtual') ? 0 : inlineData.noOfSeats,
                        });
                      }}
                      className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-white focus:outline-none rounded-xs"
                    >
                      {CENTRE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={inlineData.whatRequired}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInlineData({
                          ...inlineData,
                          whatRequired: val,
                          noOfSeats: val.toLowerCase().includes('virtual') ? 0 : inlineData.noOfSeats,
                        });
                      }}
                      className="w-full px-2 py-0.5 text-xs border border-neutral-300 bg-white focus:outline-none rounded-xs font-medium"
                    >
                      {(CENTRE_PRODUCTS_MAP[inlineData.centreRequired] || ['Virtual Office']).map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 text-center border-r border-neutral-300">
                    <input
                      type="number"
                      min={0}
                      disabled={inlineData.whatRequired.toLowerCase().includes('virtual')}
                      placeholder="Seats"
                      value={inlineData.whatRequired.toLowerCase().includes('virtual') ? 0 : inlineData.noOfSeats}
                      onChange={(e) => setInlineData({ ...inlineData, noOfSeats: parseInt(e.target.value) || 0 })}
                      className="w-16 px-1.5 py-1 text-center font-bold text-xs border border-neutral-300 bg-white rounded-xs disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                  </td>

                  <td className="p-2 border-r border-neutral-300 space-y-1">
                    <input
                      type="text"
                      placeholder="Budget (₹)"
                      value={inlineData.budget}
                      onChange={(e) => setInlineData({ ...inlineData, budget: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white rounded-xs"
                    />
                    <select
                      value={inlineData.reference}
                      onChange={(e) => setInlineData({ ...inlineData, reference: e.target.value })}
                      className="w-full px-1.5 py-0.5 text-[10px] border border-neutral-200 bg-white rounded-xs"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 border-r border-neutral-300">
                    <select
                      value={inlineData.leadAssignedTo}
                      onChange={(e) => setInlineData({ ...inlineData, leadAssignedTo: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-white rounded-xs"
                    >
                      {ASSIGNED_OPTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 border-r border-neutral-300 text-center">
                    <span className="px-2 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold uppercase rounded-xs border border-blue-200 block">
                      New
                    </span>
                  </td>

                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Quick Remarks..."
                      value={inlineData.remarks}
                      onChange={(e) => setInlineData({ ...inlineData, remarks: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-200 bg-white rounded-xs"
                    />
                  </td>

                  <td className="p-2 text-center space-y-1">
                    <button
                      type="button"
                      onClick={handleInlineSubmit}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-xs flex items-center justify-center gap-1 w-full shadow-2xs cursor-pointer"
                    >
                      <Check size={12} /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInlineRow(false)}
                      className="px-2.5 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold text-[10px] uppercase rounded-xs flex items-center justify-center gap-1 w-full cursor-pointer"
                    >
                      <X size={11} /> Cancel
                    </button>
                  </td>
                </tr>
              )}

              {/* ─── DATA ROWS ────────────────────────────────────────────── */}
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-neutral-500">
                    <Loader2 size={24} className="animate-spin text-[#006064] mx-auto mb-2" />
                    <span>Loading CRM Inquiry Register...</span>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-neutral-500 space-y-3">
                    <div className="text-4xl text-neutral-300">📋</div>
                    <div className="text-base font-bold text-neutral-800">No CRM inquiries found</div>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      Click <strong>"Enter Inq (Form Modal)"</strong> or <strong>"+ Direct Row Inq"</strong> to record your first client inquiry.
                    </p>
                  </td>
                </tr>
              ) : (
                inquiries.map((inq) => {
                  const statusInfo = STATUS_CONFIG[inq.status] || STATUS_CONFIG.NEW;
                  const isVirtual = inq.whatRequired?.toLowerCase().includes('virtual');

                  return (
                    <tr
                      key={inq.id}
                      className="hover:bg-neutral-50/80 transition-colors text-xs text-neutral-800"
                    >
                      {/* SR No */}
                      <td className="p-3 text-center font-mono font-bold text-neutral-700 bg-neutral-50/40 border-r border-neutral-200">
                        #{inq.srNo}
                      </td>

                      {/* Date */}
                      <td className="p-3 border-r border-neutral-200 whitespace-nowrap">
                        <div className="font-semibold">
                          {new Date(inq.inquiryDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(inq.inquiryDate).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Client & Company */}
                      <td className="p-3 border-r border-neutral-200">
                        <div className="font-bold text-sm text-neutral-900">{inq.clientName}</div>
                        {inq.companyName && (
                          <div className="text-xs text-neutral-700 font-medium">{inq.companyName}</div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span
                            className={
                              'px-1.5 py-0.2 text-[9.5px] font-bold uppercase rounded-2xs border ' +
                              (inq.companyGeography === 'MNC'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : inq.companyGeography === 'National'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200')
                            }
                          >
                            {inq.companyGeography}
                          </span>
                          {inq.natureOfBusiness && (
                            <span className="text-[10px] text-neutral-500 font-light truncate max-w-[130px]">
                              • {inq.natureOfBusiness}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="p-3 border-r border-neutral-200 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-[#006064] shrink-0" />
                          <a
                            href={'tel:' + inq.phone}
                            className="font-mono font-bold text-xs text-neutral-900 hover:text-[#006064] hover:underline"
                          >
                            {inq.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-neutral-400 shrink-0" />
                          <a
                            href={'mailto:' + inq.email}
                            className="text-[11px] text-neutral-600 hover:text-[#006064] truncate max-w-[170px]"
                            title={inq.email}
                          >
                            {inq.email}
                          </a>
                        </div>
                      </td>

                      {/* Centre & What Required */}
                      <td className="p-3 border-r border-neutral-200">
                        <div className="flex items-center gap-1">
                          <Building2 size={12} className="text-[#006064] shrink-0" />
                          <span className="font-bold text-xs text-neutral-900">{inq.centreRequired}</span>
                        </div>
                        <div className="text-[11.5px] font-medium text-neutral-700 mt-0.5">
                          {inq.whatRequired}
                        </div>
                      </td>

                      {/* Seats */}
                      <td className="p-3 text-center border-r border-neutral-200">
                        {isVirtual ? (
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[9.5px] font-bold rounded-2xs border border-neutral-200">
                            Address
                          </span>
                        ) : (
                          <span className="font-bold font-mono text-sm text-neutral-900">
                            {inq.noOfSeats || 0}
                          </span>
                        )}
                      </td>

                      {/* Budget & Reference */}
                      <td className="p-3 border-r border-neutral-200 space-y-1">
                        <div className="font-bold text-xs text-neutral-900">
                          {inq.budget ? ('₹ ' + inq.budget) : <span className="text-neutral-400 italic">Not set</span>}
                        </div>
                        {inq.reference && (
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1">
                            <Tag size={10} className="text-neutral-400 shrink-0" />
                            <span className="truncate max-w-[130px]" title={inq.reference}>
                              {inq.reference}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Lead Assigned */}
                      <td className="p-3 border-r border-neutral-200">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[10px] font-bold text-neutral-700 shrink-0">
                            {inq.leadAssignedTo.charAt(0)}
                          </div>
                          <span className="font-bold text-xs text-neutral-900">{inq.leadAssignedTo}</span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="p-3 border-r border-neutral-200">
                        <select
                          value={inq.status}
                          onChange={(e) => handleQuickStatusChange(inq.id, e.target.value)}
                          className={
                            'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-xs border cursor-pointer focus:outline-none w-full ' +
                            statusInfo.bg + ' ' + statusInfo.text + ' ' + statusInfo.border
                          }
                        >
                          {Object.keys(STATUS_CONFIG).map((k) => (
                            <option key={k} value={k}>
                              {STATUS_CONFIG[k].label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="p-3 border-r border-neutral-200 text-xs text-neutral-600 max-w-[190px]">
                        <p className="line-clamp-2" title={inq.remarks || ''}>
                          {inq.remarks || <span className="text-neutral-400 italic">No notes</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingInquiry(inq)}
                            className="p-1.5 text-neutral-600 hover:text-[#006064] hover:bg-neutral-100 rounded-xs"
                            title="View Full Inquiry Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(inq)}
                            className="p-1.5 text-neutral-600 hover:text-amber-700 hover:bg-neutral-100 rounded-xs"
                            title="Edit Inquiry"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inq.id, inq.srNo)}
                            className="p-1.5 text-neutral-600 hover:text-red-700 hover:bg-neutral-100 rounded-xs"
                            title="Delete Inquiry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: ENTER INQUIRY / EDIT INQUIRY ───────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white border border-[var(--outline-variant)] w-full max-w-3xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/10 flex items-center justify-center font-bold text-lg rounded-xs">
                    #{editingInquiry ? editingInquiry.srNo : nextSrNo}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {editingInquiry ? ('Edit Inquiry #' + editingInquiry.srNo) : 'Enter New Client Inquiry'}
                    </h2>
                    <p className="text-xs text-white/80 font-light">
                      Complete inquiry capture for CRM &amp; New Business Development pipeline.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleFormSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* Row 1: SR No + Date + Geography */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      SR. No (Automatic)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={'#' + (editingInquiry ? editingInquiry.srNo : nextSrNo)}
                      className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 font-mono font-bold text-neutral-800 rounded-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Inquiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.inquiryDate}
                      onChange={(e) => setFormData({ ...formData, inquiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Company Geography *
                    </label>
                    <select
                      value={formData.companyGeography}
                      onChange={(e) => setFormData({ ...formData, companyGeography: e.target.value as any })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold"
                    >
                      {GEOGRAPHY_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Client Name & Company Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Client Contact Person Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mr. Rajesh Sharma"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Company / Organization Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apex Global Technologies Pvt Ltd"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium"
                    />
                  </div>
                </div>

                {/* Row 3: Nature of Business + suggestions */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Nature of Business
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Development & Cloud Consulting"
                    value={formData.natureOfBusiness}
                    onChange={(e) => setFormData({ ...formData, natureOfBusiness: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">Quick Pick:</span>
                    {BUSINESS_SUGGESTIONS.slice(0, 5).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormData({ ...formData, natureOfBusiness: sug })}
                        className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] rounded cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: Phone & Email with strict validation feedback */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Phone Number * (10 Digits)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                      <input
                        type="email"
                        required
                        placeholder="e.g. rajesh@apexglobal.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Company Address */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Company Registered Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Head office address, street, city, pin code..."
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs resize-none"
                  />
                </div>

                {/* Row 6: Centre Req + What Required + No of Seats */}
                <div className="p-4 bg-cyan-50/50 border border-cyan-200 rounded-xs space-y-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#006064] flex items-center gap-1.5">
                    <Building2 size={14} /> Space &amp; Centre Requirements
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                        Centre Required *
                      </label>
                      <select
                        value={formData.centreRequired}
                        onChange={(e) => {
                          const newCentre = e.target.value;
                          const products = CENTRE_PRODUCTS_MAP[newCentre] || ['Virtual Office'];
                          setFormData({
                            ...formData,
                            centreRequired: newCentre,
                            whatRequired: products[0] || 'Virtual Office',
                            noOfSeats: products[0].toLowerCase().includes('virtual') ? 0 : formData.noOfSeats,
                          });
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold text-xs"
                      >
                        {CENTRE_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                        What Required? (Product / Cabin) *
                      </label>
                      <select
                        value={formData.whatRequired}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            whatRequired: val,
                            noOfSeats: val.toLowerCase().includes('virtual') ? 0 : formData.noOfSeats,
                          });
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-semibold text-xs"
                      >
                        {(CENTRE_PRODUCTS_MAP[formData.centreRequired] || ['Virtual Office']).map((prod) => (
                          <option key={prod} value={prod}>{prod}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-neutral-700 mb-1">
                        No. of Seats {formData.whatRequired.toLowerCase().includes('virtual') ? '(Not required)' : '*'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        disabled={formData.whatRequired.toLowerCase().includes('virtual')}
                        placeholder="Number of seats"
                        value={formData.whatRequired.toLowerCase().includes('virtual') ? 0 : formData.noOfSeats}
                        onChange={(e) => setFormData({ ...formData, noOfSeats: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-mono font-bold text-xs disabled:bg-neutral-100 disabled:text-neutral-400"
                      />
                      {formData.whatRequired.toLowerCase().includes('virtual') && (
                        <span className="text-[10px] text-indigo-700 font-semibold mt-0.5 block">
                          ✓ Virtual Office does not require physical seats
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 7: Budget & Reference Source */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Client Budget (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹45,000 / month, ₹2,00,000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Lead Reference / Source *
                    </label>
                    <select
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 8: Other Requirements */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Other Special Requirements
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Dedicated high-speed IP leased line, 2 car parking slots, 24/7 biometric access..."
                    value={formData.otherRequirements}
                    onChange={(e) => setFormData({ ...formData, otherRequirements: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs resize-none"
                  />
                </div>

                {/* Row 9: Lead Assigned to & Pipeline Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Lead Assigned To *
                    </label>
                    <select
                      value={formData.leadAssignedTo}
                      onChange={(e) => setFormData({ ...formData, leadAssignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold text-neutral-900"
                    >
                      {ASSIGNED_OPTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Current Inquiry Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold text-neutral-900"
                    >
                      {Object.keys(STATUS_CONFIG).map((k) => (
                        <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 10: Remarks */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Remarks / Follow-up Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter first conversation summary, client preference, or follow-up schedule..."
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs resize-none"
                  />
                </div>

                {/* Submit Buttons Footer */}
                <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>{editingInquiry ? 'Update Inquiry' : 'Save to Inquiries'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: VIEW DETAILS ─────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingInquiry && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-neutral-300 w-full max-w-2xl shadow-2xl overflow-hidden rounded-xs"
            >
              <div className="p-5 bg-[#006064] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-white/10 flex items-center justify-center font-mono font-bold text-base rounded-xs">
                    #{viewingInquiry.srNo}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{viewingInquiry.clientName}</h3>
                    <p className="text-xs text-white/80">{viewingInquiry.companyName || 'Individual Inquiry'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingInquiry(null)}
                  className="text-white/80 hover:text-white p-1.5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xs">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">Date:</div>
                    <div className="font-semibold text-neutral-800">
                      {new Date(viewingInquiry.inquiryDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">Geography:</div>
                    <div className="font-semibold text-neutral-800">{viewingInquiry.companyGeography}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-500 font-bold uppercase">Nature of Business:</div>
                    <div className="font-semibold text-neutral-800">{viewingInquiry.natureOfBusiness || '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 border border-neutral-200 rounded-xs space-y-1.5">
                    <div className="text-[10px] font-bold text-[#006064] uppercase tracking-wider">Contact Info</div>
                    <div>Phone: <a href={'tel:' + viewingInquiry.phone} className="font-bold text-[#006064] hover:underline font-mono">{viewingInquiry.phone}</a></div>
                    <div>Email: <a href={'mailto:' + viewingInquiry.email} className="font-bold text-[#006064] hover:underline">{viewingInquiry.email}</a></div>
                    {viewingInquiry.companyAddress && (
                      <div className="pt-1 text-[11px] text-neutral-600">Address: {viewingInquiry.companyAddress}</div>
                    )}
                  </div>

                  <div className="p-3 border border-neutral-200 rounded-xs space-y-1.5">
                    <div className="text-[10px] font-bold text-[#006064] uppercase tracking-wider">Requirements</div>
                    <div>Centre: <span className="font-bold text-neutral-900">{viewingInquiry.centreRequired}</span></div>
                    <div>Required: <span className="font-bold text-neutral-900">{viewingInquiry.whatRequired}</span></div>
                    <div>Seats: <span className="font-bold text-neutral-900">{viewingInquiry.noOfSeats || 0}</span></div>
                    <div>Budget: <span className="font-bold text-neutral-900">{viewingInquiry.budget ? ('₹ ' + viewingInquiry.budget) : '-'}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 border border-neutral-200 rounded-xs">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Lead Assigned To</div>
                    <div className="font-bold text-sm text-neutral-900 mt-0.5">{viewingInquiry.leadAssignedTo}</div>
                    <div className="text-[11px] text-neutral-500 mt-1">Source: {viewingInquiry.reference || '-'}</div>
                  </div>

                  <div className="p-3 border border-neutral-200 rounded-xs">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Pipeline Status</div>
                    <div className="mt-1">
                      <span className={'px-2.5 py-1 text-xs font-bold uppercase rounded-xs border ' + ((STATUS_CONFIG[viewingInquiry.status] || STATUS_CONFIG.NEW).bg) + ' ' + ((STATUS_CONFIG[viewingInquiry.status] || STATUS_CONFIG.NEW).text) + ' ' + ((STATUS_CONFIG[viewingInquiry.status] || STATUS_CONFIG.NEW).border)}>
                        {(STATUS_CONFIG[viewingInquiry.status] || STATUS_CONFIG.NEW).label}
                      </span>
                    </div>
                  </div>
                </div>

                {viewingInquiry.otherRequirements && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Special Requirements</div>
                    <p className="mt-1 text-neutral-700">{viewingInquiry.otherRequirements}</p>
                  </div>
                )}

                {viewingInquiry.remarks && (
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xs">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase">Remarks &amp; Notes</div>
                    <p className="mt-1 text-neutral-700">{viewingInquiry.remarks}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const inq = viewingInquiry;
                      setViewingInquiry(null);
                      handleOpenEdit(inq);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 size={13} /> Edit Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingInquiry(null)}
                    className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
