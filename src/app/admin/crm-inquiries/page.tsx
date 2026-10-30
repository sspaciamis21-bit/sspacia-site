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
  createdById?: number | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Configuration & Dropdown Options ───────────────────────────────────────
const CENTRE_OPTIONS = ['Mercado', 'Agarwal Complex', 'Premier House'] as const;

// Products & Cabins available per centre
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

// Lead Assigned To: Strictly Praveen Agarwal & Caron as requested
const ASSIGNED_OPTIONS = ['Praveen Agarwal', 'Caron'] as const;

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
  WON_CONVERTED: { label: 'Won / Converted', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
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

  // Form Modal State
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
    leadAssignedTo: 'Praveen Agarwal' as 'Praveen Agarwal' | 'Caron',
    remarks: '',
    status: 'NEW',
  });

  // Direct Table Inline Row Form State (All fields present)
  const [inlineData, setInlineData] = useState({
    inquiryDate: new Date().toISOString().split('T')[0],
    companyGeography: 'Local' as 'Local' | 'National' | 'MNC',
    clientName: '',
    companyName: '',
    natureOfBusiness: '',
    phone: '',
    email: '',
    companyAddress: '',
    centreRequired: 'Mercado',
    whatRequired: 'Virtual Office',
    noOfSeats: 0,
    budget: '',
    reference: 'Website (sspacia.com)',
    otherRequirements: '',
    leadAssignedTo: 'Praveen Agarwal' as 'Praveen Agarwal' | 'Caron',
    status: 'NEW',
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
      leadAssignedTo: (inq.leadAssignedTo === 'Caron' ? 'Caron' : 'Praveen Agarwal'),
      remarks: inq.remarks || '',
      status: inq.status || 'NEW',
    });
    setShowModal(true);
  };

  // ─── Form Modal Submit ────────────────────────────────────────────────────
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName.trim()) {
      toast.error('Client Contact Person Name is mandatory');
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
      const isVirtual = formData.whatRequired.toLowerCase().includes('virtual');
      const payload = {
        ...formData,
        noOfSeats: isVirtual ? 0 : formData.noOfSeats,
      };

      let res;
      if (editingInquiry) {
        res = await fetch('/api/crm/inquiries/' + editingInquiry.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/crm/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save inquiry');

      toast.success(result.message || (editingInquiry ? 'Inquiry updated successfully!' : 'New inquiry created!'));
      setShowModal(false);
      resetForm();
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Direct Row Quick Submit (Direct Table Entry) ─────────────────────────
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
      toast.error('Please enter a valid email address in the table row');
      return;
    }

    try {
      const isVirtual = inlineData.whatRequired.toLowerCase().includes('virtual');
      const payload = {
        ...inlineData,
        noOfSeats: isVirtual ? 0 : inlineData.noOfSeats,
      };

      const res = await fetch('/api/crm/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add inline inquiry');

      toast.success(result.message || 'Inquiry saved directly to table!');
      setShowInlineRow(false);
      setInlineData({
        inquiryDate: new Date().toISOString().split('T')[0],
        companyGeography: 'Local',
        clientName: '',
        companyName: '',
        natureOfBusiness: '',
        phone: '',
        email: '',
        companyAddress: '',
        centreRequired: 'Mercado',
        whatRequired: 'Virtual Office',
        noOfSeats: 0,
        budget: '',
        reference: 'Website (sspacia.com)',
        otherRequirements: '',
        leadAssignedTo: 'Praveen Agarwal',
        status: 'NEW',
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

  // ─── Quick Status Change directly from table row ──────────────────────────
  const handleQuickStatusChange = async (inqId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/crm/inquiries/' + inqId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      toast.success('Status updated to ' + (STATUS_CONFIG[newStatus]?.label || newStatus));
      fetchInquiries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  // ─── Export to CSV ────────────────────────────────────────────────────────
  const exportToCsv = () => {
    if (!inquiries.length) {
      toast.error('No inquiries available to export');
      return;
    }

    const headers = [
      'SR No',
      'Inquiry Date',
      'Company Geography',
      'Client Name',
      'Company Name',
      'Nature of Business',
      'Phone Number',
      'Email Address',
      'Company Address',
      'Centre Required',
      'What Required',
      'No. of Seats',
      'Budget',
      'Lead Reference / Source',
      'Other Special Requirements',
      'Lead Assigned To',
      'Status',
      'Remarks',
      'Logged By',
      'Created At',
    ];

    const rows = inquiries.map((i) => [
      i.srNo,
      new Date(i.inquiryDate).toLocaleDateString('en-IN'),
      i.companyGeography,
      '"' + (i.clientName || '').replace(/"/g, '""') + '"',
      '"' + (i.companyName || '').replace(/"/g, '""') + '"',
      '"' + (i.natureOfBusiness || '').replace(/"/g, '""') + '"',
      i.phone,
      i.email,
      '"' + (i.companyAddress || '').replace(/"/g, '""') + '"',
      i.centreRequired,
      '"' + (i.whatRequired || '').replace(/"/g, '""') + '"',
      i.noOfSeats || 0,
      '"' + (i.budget || '').replace(/"/g, '""') + '"',
      '"' + (i.reference || '').replace(/"/g, '""') + '"',
      '"' + (i.otherRequirements || '').replace(/"/g, '""') + '"',
      i.leadAssignedTo,
      i.status,
      '"' + (i.remarks || '').replace(/"/g, '""') + '"',
      i.createdByName || '',
      new Date(i.createdAt).toLocaleString('en-IN'),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sspacia_CRM_Inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-full font-sans pb-16">
      {/* ─── Top Bar / Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#006064] font-bold uppercase tracking-wider mb-1">
            <Shield size={14} /> CRM Exclusive • New Business Development (NBD)
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
            Client Inquiry Capture Register
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 mt-1 max-w-3xl">
            Gather and capture client inquiries across Mercado, Agarwal Complex, and Premier House. Completely independent inquiry register — directly enter via form modal or table row.
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
            className="p-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 shadow-2xs cursor-pointer rounded-xs transition-colors"
            title="Refresh Inquiries"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Telemetry / KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-neutral-200 p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Inquiries</span>
            <Users size={16} className="text-[#006064]" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">{kpis.total || 0}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Logged in NBD capture</div>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Inquiries</span>
            <Clock size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{kpis.today || 0}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Received today</div>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Centre Demand</span>
            <Building2 size={16} className="text-blue-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-neutral-700">M: {kpis.byCentre?.Mercado || 0}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs font-bold text-neutral-700">AC: {kpis.byCentre?.['Agarwal Complex'] || 0}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs font-bold text-neutral-700">PH: {kpis.byCentre?.['Premier House'] || 0}</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Centre inquiries split</div>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Geography Mix</span>
            <Globe size={16} className="text-purple-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-cyan-800">Loc: {kpis.byGeography?.Local || 0}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs font-bold text-indigo-800">Nat: {kpis.byGeography?.National || 0}</span>
            <span className="text-neutral-300">|</span>
            <span className="text-xs font-bold text-purple-800">MNC: {kpis.byGeography?.MNC || 0}</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">Client origin footprint</div>
        </div>
      </div>

      {/* ─── Search & Multi-Filter Bar ─────────────────────────────────────── */}
      <div className="bg-white border border-neutral-200 p-4 rounded-xs shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by Client Name, Company, Phone, Email, Nature of Business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#006064] rounded-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Centre Filter */}
            <select
              value={centreFilter}
              onChange={(e) => setCentreFilter(e.target.value)}
              className="px-2.5 py-2 border border-neutral-300 bg-white text-xs font-medium text-neutral-700 rounded-xs focus:outline-none focus:border-[#006064]"
            >
              <option value="ALL">All Centres</option>
              {CENTRE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Geography Filter */}
            <select
              value={geographyFilter}
              onChange={(e) => setGeographyFilter(e.target.value)}
              className="px-2.5 py-2 border border-neutral-300 bg-white text-xs font-medium text-neutral-700 rounded-xs focus:outline-none focus:border-[#006064]"
            >
              <option value="ALL">All Geography</option>
              {GEOGRAPHY_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 border border-neutral-300 bg-white text-xs font-medium text-neutral-700 rounded-xs focus:outline-none focus:border-[#006064]"
            >
              <option value="ALL">All Statuses</option>
              {Object.keys(STATUS_CONFIG).map((k) => (
                <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
              ))}
            </select>

            {/* Lead Assigned Filter (Praveen Agarwal / Caron) */}
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-2.5 py-2 border border-neutral-300 bg-white text-xs font-medium text-neutral-700 rounded-xs focus:outline-none focus:border-[#006064]"
            >
              <option value="ALL">All Assigned</option>
              {ASSIGNED_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Reference Source Filter */}
            <select
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="px-2.5 py-2 border border-neutral-300 bg-white text-xs font-medium text-neutral-700 rounded-xs focus:outline-none focus:border-[#006064]"
            >
              <option value="ALL">All Sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {(searchTerm || centreFilter !== 'ALL' || geographyFilter !== 'ALL' || statusFilter !== 'ALL' || assignedFilter !== 'ALL' || referenceFilter !== 'ALL') && (
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

      {/* ─── Inquiries Main Table (Excel-Style Full Field Display) ─────────── */}
      <div className="bg-white border border-neutral-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-left text-xs border-collapse min-w-[2300px]">
            <thead className="sticky top-0 z-20 bg-[#F1F3F5] border-b border-neutral-300 text-neutral-700 uppercase tracking-wider font-bold text-[10.5px]">
              <tr>
                <th className="p-3 w-16 text-center border-r border-neutral-300 sticky left-0 bg-[#F1F3F5] z-30">
                  SR. No
                </th>
                <th className="p-3 w-28 border-r border-neutral-300 whitespace-nowrap">Inquiry Date</th>
                <th className="p-3 w-24 text-center border-r border-neutral-300">Geography</th>
                <th className="p-3 min-w-[160px] border-r border-neutral-300">Client Name</th>
                <th className="p-3 min-w-[170px] border-r border-neutral-300">Company Name</th>
                <th className="p-3 min-w-[160px] border-r border-neutral-300">Nature of Business</th>
                <th className="p-3 w-32 border-r border-neutral-300 whitespace-nowrap">Phone Number</th>
                <th className="p-3 min-w-[190px] border-r border-neutral-300">Email Address</th>
                <th className="p-3 min-w-[200px] border-r border-neutral-300">Company Address</th>
                <th className="p-3 min-w-[140px] border-r border-neutral-300">Centre Req.</th>
                <th className="p-3 min-w-[190px] border-r border-neutral-300">What Required?</th>
                <th className="p-3 w-20 text-center border-r border-neutral-300">No. Seats</th>
                <th className="p-3 min-w-[130px] border-r border-neutral-300">Client Budget</th>
                <th className="p-3 min-w-[160px] border-r border-neutral-300">Lead Source</th>
                <th className="p-3 min-w-[200px] border-r border-neutral-300">Other Requirements</th>
                <th className="p-3 min-w-[140px] border-r border-neutral-300">Lead Assigned</th>
                <th className="p-3 min-w-[140px] border-r border-neutral-300">Status</th>
                <th className="p-3 min-w-[200px] border-r border-neutral-300">Remarks</th>
                <th className="p-3 w-28 text-center sticky right-0 bg-[#F1F3F5] z-30">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {/* ─── DIRECT INLINE ROW ENTRY (ALL FIELDS ACCESSIBLE) ───────── */}
              {showInlineRow && (
                <tr className="bg-amber-50/80 border-b-2 border-amber-400 font-sans animate-in fade-in duration-150">
                  {/* SR No */}
                  <td className="p-2 text-center font-mono font-bold text-amber-900 bg-amber-100/80 border-r border-neutral-300 sticky left-0 z-10">
                    #{nextSrNo}
                  </td>

                  {/* Date */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="date"
                      value={inlineData.inquiryDate}
                      onChange={(e) => setInlineData({ ...inlineData, inquiryDate: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  {/* Geography */}
                  <td className="p-2 border-r border-neutral-300 text-center">
                    <select
                      value={inlineData.companyGeography}
                      onChange={(e) => setInlineData({ ...inlineData, companyGeography: e.target.value as any })}
                      className="w-full px-1.5 py-1 text-xs font-bold border border-amber-300 bg-white rounded-xs focus:outline-none"
                    >
                      {GEOGRAPHY_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </td>

                  {/* Client Name */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Client Name *"
                      value={inlineData.clientName}
                      onChange={(e) => setInlineData({ ...inlineData, clientName: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  {/* Company Name */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={inlineData.companyName}
                      onChange={(e) => setInlineData({ ...inlineData, companyName: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white focus:outline-none rounded-xs"
                    />
                  </td>

                  {/* Nature of Business */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Nature of Business"
                      value={inlineData.natureOfBusiness}
                      onChange={(e) => setInlineData({ ...inlineData, natureOfBusiness: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white focus:outline-none rounded-xs"
                    />
                  </td>

                  {/* Phone */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="tel"
                      placeholder="10 Digits *"
                      value={inlineData.phone}
                      onChange={(e) => setInlineData({ ...inlineData, phone: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-mono font-bold border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  {/* Email */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={inlineData.email}
                      onChange={(e) => setInlineData({ ...inlineData, email: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-mono border border-amber-300 bg-white focus:outline-none focus:border-amber-600 rounded-xs"
                    />
                  </td>

                  {/* Company Address */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Registered Address"
                      value={inlineData.companyAddress}
                      onChange={(e) => setInlineData({ ...inlineData, companyAddress: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white focus:outline-none rounded-xs"
                    />
                  </td>

                  {/* Centre Required */}
                  <td className="p-2 border-r border-neutral-300">
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
                  </td>

                  {/* What Required */}
                  <td className="p-2 border-r border-neutral-300">
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
                      className="w-full px-2 py-1 text-xs border border-amber-300 bg-white focus:outline-none rounded-xs font-medium"
                    >
                      {(CENTRE_PRODUCTS_MAP[inlineData.centreRequired] || ['Virtual Office']).map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </td>

                  {/* No. of Seats */}
                  <td className="p-2 text-center border-r border-neutral-300">
                    <input
                      type="number"
                      min={0}
                      disabled={inlineData.whatRequired.toLowerCase().includes('virtual')}
                      placeholder="0"
                      value={inlineData.whatRequired.toLowerCase().includes('virtual') ? 0 : inlineData.noOfSeats}
                      onChange={(e) => setInlineData({ ...inlineData, noOfSeats: parseInt(e.target.value) || 0 })}
                      className="w-16 px-1.5 py-1 text-center font-bold text-xs border border-neutral-300 bg-white rounded-xs disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                  </td>

                  {/* Budget */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="₹ Budget"
                      value={inlineData.budget}
                      onChange={(e) => setInlineData({ ...inlineData, budget: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white rounded-xs"
                    />
                  </td>

                  {/* Lead Source */}
                  <td className="p-2 border-r border-neutral-300">
                    <select
                      value={inlineData.reference}
                      onChange={(e) => setInlineData({ ...inlineData, reference: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white rounded-xs"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  {/* Other Requirements */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Special Requirements..."
                      value={inlineData.otherRequirements}
                      onChange={(e) => setInlineData({ ...inlineData, otherRequirements: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white rounded-xs"
                    />
                  </td>

                  {/* Lead Assigned To (Strictly Praveen Agarwal & Caron) */}
                  <td className="p-2 border-r border-neutral-300">
                    <select
                      value={inlineData.leadAssignedTo}
                      onChange={(e) => setInlineData({ ...inlineData, leadAssignedTo: e.target.value as any })}
                      className="w-full px-2 py-1 text-xs font-bold border border-amber-300 bg-white rounded-xs"
                    >
                      {ASSIGNED_OPTIONS.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </td>

                  {/* Status */}
                  <td className="p-2 border-r border-neutral-300">
                    <select
                      value={inlineData.status}
                      onChange={(e) => setInlineData({ ...inlineData, status: e.target.value })}
                      className="w-full px-2 py-1 text-xs font-bold border border-neutral-300 bg-white rounded-xs"
                    >
                      {Object.keys(STATUS_CONFIG).map((k) => (
                        <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Remarks */}
                  <td className="p-2 border-r border-neutral-300">
                    <input
                      type="text"
                      placeholder="Quick Remarks..."
                      value={inlineData.remarks}
                      onChange={(e) => setInlineData({ ...inlineData, remarks: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 bg-white rounded-xs"
                    />
                  </td>

                  {/* Action Buttons */}
                  <td className="p-2 text-center sticky right-0 bg-amber-50/80 z-10 space-y-1">
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
                  <td colSpan={19} className="py-16 text-center text-neutral-500">
                    <Loader2 size={24} className="animate-spin text-[#006064] mx-auto mb-2" />
                    <span>Loading CRM Inquiry Register...</span>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-16 text-center text-neutral-500 space-y-3">
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
                      <td className="p-3 text-center font-mono font-bold text-neutral-700 bg-neutral-50/40 border-r border-neutral-200 sticky left-0 z-10">
                        #{inq.srNo}
                      </td>

                      {/* Inquiry Date */}
                      <td className="p-3 border-r border-neutral-200 whitespace-nowrap">
                        <div className="font-semibold text-neutral-900">
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

                      {/* Geography */}
                      <td className="p-3 text-center border-r border-neutral-200">
                        <span
                          className={
                            'px-2 py-0.5 text-[9.5px] font-bold uppercase rounded-2xs border ' +
                            (inq.companyGeography === 'MNC'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : inq.companyGeography === 'National'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-cyan-50 text-cyan-800 border-cyan-200')
                          }
                        >
                          {inq.companyGeography}
                        </span>
                      </td>

                      {/* Client Name */}
                      <td className="p-3 border-r border-neutral-200 font-bold text-sm text-neutral-900">
                        {inq.clientName}
                      </td>

                      {/* Company Name */}
                      <td className="p-3 border-r border-neutral-200 text-neutral-800 font-medium">
                        {inq.companyName || <span className="text-neutral-400 italic">-</span>}
                      </td>

                      {/* Nature of Business */}
                      <td className="p-3 border-r border-neutral-200 text-neutral-600">
                        {inq.natureOfBusiness || <span className="text-neutral-400 italic">-</span>}
                      </td>

                      {/* Phone Number */}
                      <td className="p-3 border-r border-neutral-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-[#006064] shrink-0" />
                          <a
                            href={'tel:' + inq.phone}
                            className="font-mono font-bold text-xs text-neutral-900 hover:text-[#006064] hover:underline"
                          >
                            {inq.phone}
                          </a>
                        </div>
                      </td>

                      {/* Email Address */}
                      <td className="p-3 border-r border-neutral-200">
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

                      {/* Company Address */}
                      <td className="p-3 border-r border-neutral-200 text-neutral-600 max-w-[200px]">
                        {inq.companyAddress ? (
                          <div className="truncate" title={inq.companyAddress}>
                            {inq.companyAddress}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">-</span>
                        )}
                      </td>

                      {/* Centre Required */}
                      <td className="p-3 border-r border-neutral-200">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-[#006064] shrink-0" />
                          <span className="font-bold text-xs text-neutral-900">{inq.centreRequired}</span>
                        </div>
                      </td>

                      {/* What Required */}
                      <td className="p-3 border-r border-neutral-200 font-medium text-neutral-800">
                        {inq.whatRequired}
                      </td>

                      {/* No. of Seats */}
                      <td className="p-3 text-center border-r border-neutral-200">
                        {isVirtual ? (
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[9.5px] font-bold rounded-2xs border border-neutral-200">
                            0 (Virtual)
                          </span>
                        ) : (
                          <span className="font-bold font-mono text-xs text-neutral-900">
                            {inq.noOfSeats || 0}
                          </span>
                        )}
                      </td>

                      {/* Client Budget */}
                      <td className="p-3 border-r border-neutral-200 font-bold text-neutral-900">
                        {inq.budget ? inq.budget : <span className="text-neutral-400 italic font-normal">-</span>}
                      </td>

                      {/* Lead Source */}
                      <td className="p-3 border-r border-neutral-200">
                        {inq.reference ? (
                          <div className="text-[11px] text-neutral-700 flex items-center gap-1">
                            <Tag size={10} className="text-neutral-400 shrink-0" />
                            <span className="truncate max-w-[150px]" title={inq.reference}>
                              {inq.reference}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">-</span>
                        )}
                      </td>

                      {/* Other Requirements */}
                      <td className="p-3 border-r border-neutral-200 text-neutral-600 max-w-[200px]">
                        {inq.otherRequirements ? (
                          <div className="truncate" title={inq.otherRequirements}>
                            {inq.otherRequirements}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">-</span>
                        )}
                      </td>

                      {/* Lead Assigned To */}
                      <td className="p-3 border-r border-neutral-200">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[10px] font-bold text-neutral-700 shrink-0">
                            {inq.leadAssignedTo.charAt(0)}
                          </div>
                          <span className="font-bold text-xs text-neutral-900">{inq.leadAssignedTo}</span>
                        </div>
                      </td>

                      {/* Current Status */}
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
                      <td className="p-3 border-r border-neutral-200 text-xs text-neutral-600 max-w-[200px]">
                        <p className="truncate" title={inq.remarks || ''}>
                          {inq.remarks || <span className="text-neutral-400 italic">-</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center sticky right-0 bg-white z-10">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingInquiry(inq)}
                            className="p-1.5 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100 rounded-xs transition-colors cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(inq)}
                            className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-xs transition-colors cursor-pointer"
                            title="Edit Inquiry"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(inq.id, inq.srNo)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-colors cursor-pointer"
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
                      Capture inquiry details for CRM &amp; New Business Development pipeline.
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
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold text-neutral-800"
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
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                    />
                  </div>
                </div>

                {/* Row 3: Nature of Business */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Nature of Business
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Development & Cloud Consulting"
                    value={formData.natureOfBusiness}
                    onChange={(e) => setFormData({ ...formData, natureOfBusiness: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs mb-2"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase">Quick Pick:</span>
                    {BUSINESS_SUGGESTIONS.slice(0, 5).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormData({ ...formData, natureOfBusiness: sug })}
                        className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[10px] rounded-2xs transition-colors cursor-pointer"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: Phone & Email Validations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Phone Number * (10 Digits)
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 font-mono border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. rajesh@apexglobal.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 font-mono border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Company Registered Address */}
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

                {/* Section Separator */}
                <div className="border-t border-neutral-200 pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#006064] mb-3 flex items-center gap-1.5">
                    <Building2 size={13} /> Space &amp; Centre Requirements
                  </div>
                </div>

                {/* Row 6: Centre Required & What Required (Dynamic Products) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Centre Required *
                    </label>
                    <select
                      value={formData.centreRequired}
                      onChange={(e) => {
                        const newCentre = e.target.value;
                        const available = CENTRE_PRODUCTS_MAP[newCentre] || ['Virtual Office'];
                        setFormData({
                          ...formData,
                          centreRequired: newCentre,
                          whatRequired: available[0] || 'Virtual Office',
                          noOfSeats: available[0].toLowerCase().includes('virtual') ? 0 : formData.noOfSeats,
                        });
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-bold text-neutral-900"
                    >
                      {CENTRE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      What Required? (Product / Cabin) *
                    </label>
                    <select
                      value={formData.whatRequired}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isVirtual = val.toLowerCase().includes('virtual');
                        setFormData({
                          ...formData,
                          whatRequired: val,
                          noOfSeats: isVirtual ? 0 : formData.noOfSeats,
                        });
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs font-medium text-neutral-900"
                    >
                      {(CENTRE_PRODUCTS_MAP[formData.centreRequired] || ['Virtual Office']).map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 7: No. of Seats & Client Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      {formData.whatRequired.toLowerCase().includes('virtual')
                        ? 'No. of Seats (Not required)'
                        : 'No. of Seats Required *'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={formData.whatRequired.toLowerCase().includes('virtual')}
                      value={formData.whatRequired.toLowerCase().includes('virtual') ? 0 : formData.noOfSeats}
                      onChange={(e) => setFormData({ ...formData, noOfSeats: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs disabled:bg-neutral-100 disabled:text-neutral-400 font-mono font-bold"
                    />
                    {formData.whatRequired.toLowerCase().includes('virtual') && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                        ✓ Virtual Office does not require physical seats
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Client Budget (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ₹45,000 / month, ₹2,00,000"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                    />
                  </div>
                </div>

                {/* Row 8: Reference / Source & Other Requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Lead Reference / Source *
                    </label>
                    <select
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                    >
                      {LEAD_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Other Special Requirements
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dedicated high-speed IP leased line, 2 car parking slots, 24/7 biometric access..."
                      value={formData.otherRequirements}
                      onChange={(e) => setFormData({ ...formData, otherRequirements: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 bg-white focus:outline-none focus:border-[#006064] rounded-xs"
                    />
                  </div>
                </div>

                {/* Row 9: Lead Assigned to (Strictly Praveen Agarwal & Caron) & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Lead Assigned To *
                    </label>
                    <select
                      value={formData.leadAssignedTo}
                      onChange={(e) => setFormData({ ...formData, leadAssignedTo: e.target.value as any })}
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
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold uppercase tracking-wider text-xs rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-[#006064] hover:bg-[#004D40] text-white font-bold uppercase tracking-wider text-xs rounded-xs shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check size={14} /> {editingInquiry ? 'Update Inquiry' : 'Save Inquiry'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: VIEW DETAILS ───────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingInquiry && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border border-neutral-300 w-full max-w-2xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 bg-[#006064] text-white flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/80 font-bold">
                    Inquiry Details • #{viewingInquiry.srNo}
                  </div>
                  <h3 className="text-xl font-bold mt-0.5">{viewingInquiry.clientName}</h3>
                  {viewingInquiry.companyName && (
                    <div className="text-xs text-white/80">{viewingInquiry.companyName}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingInquiry(null)}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content Grid */}
              <div className="p-6 space-y-4 overflow-y-auto text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-neutral-50 p-3 rounded-xs border border-neutral-200">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">SR No</span>
                    <span className="font-mono font-bold text-neutral-800">#{viewingInquiry.srNo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Inquiry Date</span>
                    <span className="font-semibold text-neutral-800">
                      {new Date(viewingInquiry.inquiryDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Geography</span>
                    <span className="font-bold text-neutral-800">{viewingInquiry.companyGeography}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Phone</span>
                    <span className="font-mono font-bold text-neutral-800">{viewingInquiry.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Email</span>
                    <span className="font-mono text-neutral-800 truncate block">{viewingInquiry.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase block">Status</span>
                    <span className="font-bold text-[#006064]">
                      {STATUS_CONFIG[viewingInquiry.status]?.label || viewingInquiry.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-neutral-500 block">
                      Centre &amp; Product
                    </span>
                    <div className="text-sm font-bold text-neutral-900">{viewingInquiry.centreRequired}</div>
                    <div className="text-xs text-neutral-700">{viewingInquiry.whatRequired}</div>
                    <div className="text-xs text-neutral-500">
                      Seats: <strong className="text-neutral-800">{viewingInquiry.noOfSeats || 0}</strong>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase text-neutral-500 block">
                      Commercials &amp; Assignment
                    </span>
                    <div className="text-xs text-neutral-700">
                      Budget: <strong className="text-neutral-900">{viewingInquiry.budget || 'Not specified'}</strong>
                    </div>
                    <div className="text-xs text-neutral-700">
                      Lead Source: <strong className="text-neutral-900">{viewingInquiry.reference || 'None'}</strong>
                    </div>
                    <div className="text-xs text-neutral-700">
                      Assigned To: <strong className="text-[#006064]">{viewingInquiry.leadAssignedTo}</strong>
                    </div>
                  </div>
                </div>

                {viewingInquiry.companyAddress && (
                  <div>
                    <span className="text-[11px] font-bold uppercase text-neutral-500 block mb-1">
                      Company Registered Address
                    </span>
                    <p className="bg-neutral-50 p-2.5 rounded-xs border border-neutral-200 text-neutral-700 leading-relaxed">
                      {viewingInquiry.companyAddress}
                    </p>
                  </div>
                )}

                {viewingInquiry.otherRequirements && (
                  <div>
                    <span className="text-[11px] font-bold uppercase text-neutral-500 block mb-1">
                      Special Requirements
                    </span>
                    <p className="bg-neutral-50 p-2.5 rounded-xs border border-neutral-200 text-neutral-700 leading-relaxed">
                      {viewingInquiry.otherRequirements}
                    </p>
                  </div>
                )}

                {viewingInquiry.remarks && (
                  <div>
                    <span className="text-[11px] font-bold uppercase text-neutral-500 block mb-1">
                      Remarks / Follow-up Notes
                    </span>
                    <p className="bg-neutral-50 p-2.5 rounded-xs border border-neutral-200 text-neutral-700 leading-relaxed">
                      {viewingInquiry.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingInquiry;
                    setViewingInquiry(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-4 py-1.5 bg-[#006064] text-white font-bold uppercase text-xs rounded-xs"
                >
                  Edit Inquiry
                </button>
                <button
                  type="button"
                  onClick={() => setViewingInquiry(null)}
                  className="px-4 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold uppercase text-xs rounded-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
