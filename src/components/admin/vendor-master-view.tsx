'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Download,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  X,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export interface VendorRecord {
  id: number;
  vendorName: string;
  address: string | null;
  email: string | null;
  mobileNo: string | null;
  accountNo?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  gstin: string | null;
  pan: string | null;
  serviceType: string | null;
  locationName: string | null;
  notes: string | null;
  isActive: boolean;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LocationOption {
  id: number;
  name: string;
  cityName?: string | null;
}

// Validation helpers - MOBILE & EMAIL ARE STRICTLY MANDATORY
const validateMobile = (mobile: string): string | null => {
  if (!mobile || !mobile.trim()) {
    return 'Mobile number is mandatory';
  }
  const clean = mobile.replace(/[\s\-\(\)]/g, '');
  // Indian mobile numbers (starts with optional +91 or 0, followed by 10 digits starting with 6, 7, 8, 9)
  const mobileRegex = /^(\+91|0)?[6-9]\d{9}$/;
  if (!mobileRegex.test(clean)) {
    return 'Please enter a valid 10-digit mobile number';
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return 'Email address is mandatory';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export function VendorMasterView() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [centreFilter, setCentreFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vendorName: '',
    mobileNo: '',
    email: '',
    accountNo: '',
    ifscCode: '',
    address: '',
    locationName: '',
    gstin: '',
    pan: '',
    notes: '',
    isActive: true,
  });

  // Form Validation Errors State
  const [formErrors, setFormErrors] = useState<{
    mobileNo?: string | null;
    email?: string | null;
  }>({});

  // Delete Confirmation State
  const [deletingVendor, setDeletingVendor] = useState<VendorRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied item tracker
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vendor-master');
      const data = await res.json();
      if (data.success && Array.isArray(data.vendors)) {
        setVendors(data.vendors);
        if (Array.isArray(data.locations)) {
          setLocations(data.locations);
        }
      } else {
        toast.error(data.error || 'Failed to fetch vendor records');
      }
    } catch (err: any) {
      toast.error('Network error fetching vendor records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Copy helper
  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingVendor(null);
    setFormData({
      vendorName: '',
      mobileNo: '',
      email: '',
      accountNo: '',
      ifscCode: '',
      address: '',
      locationName: '',
      gstin: '',
      pan: '',
      notes: '',
      isActive: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (vendor: VendorRecord) => {
    setEditingVendor(vendor);
    setFormData({
      vendorName: vendor.vendorName || '',
      mobileNo: vendor.mobileNo || '',
      email: vendor.email || '',
      accountNo: vendor.accountNo || '',
      ifscCode: vendor.ifscCode || '',
      address: vendor.address || '',
      locationName: vendor.locationName || '',
      gstin: vendor.gstin || '',
      pan: vendor.pan || '',
      notes: vendor.notes || '',
      isActive: vendor.isActive,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName.trim()) {
      toast.error('Vendor Name is required');
      return;
    }

    // Validate Mobile & Email
    const mobileErr = validateMobile(formData.mobileNo);
    const emailErr = validateEmail(formData.email);

    if (mobileErr || emailErr) {
      setFormErrors({ mobileNo: mobileErr, email: emailErr });
      if (mobileErr) toast.error(mobileErr);
      else if (emailErr) toast.error(emailErr);
      return;
    }

    setSubmitting(true);
    try {
      const url = editingVendor
        ? `/api/admin/vendor-master/${editingVendor.id}`
        : '/api/admin/vendor-master';
      const method = editingVendor ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || (editingVendor ? 'Vendor updated' : 'Vendor added'));
        setIsModalOpen(false);
        fetchVendors();
      } else {
        toast.error(data.error || 'Failed to save vendor');
      }
    } catch (err: any) {
      toast.error('Network error saving vendor');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Vendor
  const handleDeleteVendor = async () => {
    if (!deletingVendor) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/vendor-master/${deletingVendor.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Vendor deleted successfully');
        setDeletingVendor(null);
        fetchVendors();
      } else {
        toast.error(data.error || 'Failed to delete vendor');
      }
    } catch {
      toast.error('Network error deleting vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (vendors.length === 0) {
      toast.error('No vendor records to export');
      return;
    }

    const headers = [
      'ID',
      'Vendor Name',
      'Mobile No',
      'Email',
      'Address',
      'Centre',
      'GSTIN',
      'PAN',
      'Status',
      'Notes',
      'Created Date',
    ];

    const rows = filteredVendors.map((v) => [
      v.id,
      `"${(v.vendorName || '').replace(/"/g, '""')}"`,
      `"${(v.mobileNo || '').replace(/"/g, '""')}"`,
      `"${(v.email || '').replace(/"/g, '""')}"`,
      `"${(v.address || '').replace(/"/g, '""')}"`,
      `"${(v.locationName || '').replace(/"/g, '""')}"`,
      `"${(v.gstin || '').replace(/"/g, '""')}"`,
      `"${(v.pan || '').replace(/"/g, '""')}"`,
      v.isActive ? 'Active' : 'Inactive',
      `"${(v.notes || '').replace(/"/g, '""')}"`,
      v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `sspacia-vendor-master-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredVendors.length} vendors to CSV`);
  };

  // Filtered list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // Status Filter
      if (statusFilter === 'ACTIVE' && !v.isActive) return false;
      if (statusFilter === 'INACTIVE' && v.isActive) return false;

      // Centre Filter
      if (centreFilter !== 'ALL') {
        if (v.locationName !== centreFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = v.vendorName?.toLowerCase().includes(q);
        const matchesMobile = v.mobileNo?.toLowerCase().includes(q);
        const matchesEmail = v.email?.toLowerCase().includes(q);
        const matchesAddress = v.address?.toLowerCase().includes(q);
        const matchesGstin = v.gstin?.toLowerCase().includes(q);
        const matchesCentre = v.locationName?.toLowerCase().includes(q);
        return (
          matchesName ||
          matchesMobile ||
          matchesEmail ||
          matchesAddress ||
          matchesGstin ||
          matchesCentre
        );
      }

      return true;
    });
  }, [vendors, searchQuery, statusFilter, centreFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.isActive).length;
    const withMobile = vendors.filter((v) => Boolean(v.mobileNo)).length;
    const withEmail = vendors.filter((v) => Boolean(v.email)).length;
    return { total, active, withMobile, withEmail };
  }, [vendors]);

  return (
    <div className="flex flex-col flex-1 h-full w-full bg-[#f8f9fa] overflow-y-auto">
      {/* ── TOP HEADER BANNER ── */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 py-4 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[#006064]/10 text-[#006064] text-[10px] font-bold tracking-widest uppercase rounded-xs">
                CENTRALIZED REPOSITORY
              </span>
              <span className="text-gray-400 text-xs">•</span>
              <span className="text-gray-500 text-xs font-mono">Master Database</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
              <Building2 className="text-[#006064]" size={24} />
              <span>VENDOR MASTER</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Maintain and manage verified suppliers, contractors, and commercial vendors across SSPACIA
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchVendors}
              disabled={loading}
              className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-gray-700 text-xs font-semibold rounded-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Refresh list"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#006064]' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-gray-700 text-xs font-semibold rounded-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export filtered vendors to CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:shadow-sm"
            >
              <Plus size={15} />
              <span>Add New Vendor</span>
            </button>
          </div>
        </div>

        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-neutral-100">
          <div className="bg-neutral-50/80 p-2.5 border border-neutral-200/70 rounded-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
              Total Vendors
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-gray-900">{metrics.total}</span>
              <span className="text-[10px] text-gray-400">records</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-2.5 border border-emerald-200/70 rounded-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Active Vendors
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-emerald-700">{metrics.active}</span>
              <span className="text-[10px] text-emerald-600">verified</span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-2.5 border border-blue-200/70 rounded-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
              With Contact No.
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-blue-700">{metrics.withMobile}</span>
              <span className="text-[10px] text-blue-600">phone</span>
            </div>
          </div>

          <div className="bg-purple-50/60 p-2.5 border border-purple-200/70 rounded-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
              With Email ID
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-mono text-purple-700">{metrics.withEmail}</span>
              <span className="text-[10px] text-purple-600">email</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR ── */}
      <div className="p-4 sm:px-6">
        <div className="bg-white border border-neutral-200 p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 border border-neutral-300 focus:bg-white focus:outline-none focus:border-[#006064] text-gray-900 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs bg-white border border-neutral-300 text-gray-700 focus:outline-none focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* Centre Filter */}
            <select
              value={centreFilter}
              onChange={(e) => setCentreFilter(e.target.value)}
              className="px-2.5 py-2 text-xs bg-white border border-neutral-300 text-gray-700 focus:outline-none focus:border-[#006064] cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Centres</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>

            {(searchQuery || statusFilter !== 'ALL' || centreFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setCentreFilter('ALL');
                }}
                className="px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── TABLE VIEW ── */}
        <div className="mt-4 bg-white border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 border-collapse">
              <thead>
                <tr className="bg-[#f0f4f5] text-gray-800 uppercase tracking-wider text-[10px] font-bold border-b border-neutral-300">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Vendor Name</th>
                  <th className="py-2.5 px-3 min-w-[150px]">Mobile No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Email</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Address</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Centre</th>
                  <th className="py-2.5 px-3 min-w-[130px]">GSTIN / PAN</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                  <th className="py-2.5 px-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="animate-spin text-[#006064]" size={28} />
                        <span className="text-xs text-gray-500 font-medium">
                          Loading vendor records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <Building2 className="text-gray-300" size={36} />
                        <h4 className="text-sm font-bold text-gray-800">No Vendors Found</h4>
                        <p className="text-xs text-gray-500">
                          {searchQuery || statusFilter !== 'ALL' || centreFilter !== 'ALL'
                            ? 'No vendors match your current search or filter criteria. Try clearing filters.'
                            : 'No vendors have been added to the master database yet. Click "Add New Vendor" to add the first record.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenCreateModal}
                          className="mt-2 px-3 py-1.5 bg-[#006064] text-white text-xs font-bold rounded-xs cursor-pointer hover:bg-[#004d40] transition-colors"
                        >
                          + Add Vendor
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor, idx) => (
                    <tr
                      key={vendor.id}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      {/* Sr No */}
                      <td className="py-3 px-3 text-center font-mono text-gray-400 text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Vendor Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 shrink-0 rounded-xs bg-[#006064]/10 text-[#006064] flex items-center justify-center font-bold text-xs">
                            {vendor.vendorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-xs tracking-tight">
                              {vendor.vendorName}
                            </div>
                            {vendor.notes && (
                              <div
                                className="text-[10.5px] text-gray-500 truncate max-w-[200px]"
                                title={vendor.notes}
                              >
                                {vendor.notes}
                              </div>
                            )}
                            <div className="text-[9.5px] text-gray-400 font-mono mt-0.5">
                              Added {new Date(vendor.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {vendor.mobileNo ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={12} className="text-gray-400 shrink-0" />
                            <a
                              href={`tel:${vendor.mobileNo}`}
                              className="text-blue-700 hover:underline font-semibold"
                            >
                              {vendor.mobileNo}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(vendor.mobileNo!, `m_${vendor.id}`, 'Mobile No')
                              }
                              className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                              title="Copy mobile number"
                            >
                              {copiedKey === `m_${vendor.id}` ? (
                                <Check size={11} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not provided</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3">
                        {vendor.email ? (
                          <div className="flex items-center gap-1.5 max-w-[200px]">
                            <Mail size={12} className="text-gray-400 shrink-0" />
                            <a
                              href={`mailto:${vendor.email}`}
                              className="text-blue-700 hover:underline text-[11px] truncate font-medium"
                              title={vendor.email}
                            >
                              {vendor.email}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(vendor.email!, `e_${vendor.id}`, 'Email')
                              }
                              className="p-0.5 text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
                              title="Copy email address"
                            >
                              {copiedKey === `e_${vendor.id}` ? (
                                <Check size={11} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Not provided</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-3">
                        {vendor.address ? (
                          <div className="flex items-start gap-1 text-[11px] text-gray-700 max-w-[260px]">
                            <MapPin size={12} className="text-red-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-2" title={vendor.address}>
                              {vendor.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Not provided</span>
                        )}
                      </td>

                      {/* Centre */}
                      <td className="py-3 px-3">
                        {vendor.locationName ? (
                          <span className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-300 font-semibold text-[10px] rounded-xs">
                            {vendor.locationName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Tax Identifiers */}
                      <td className="py-3 px-3 font-mono text-[10.5px]">
                        {vendor.gstin && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 font-bold">GST:</span>
                            <span className="text-gray-900 font-semibold">{vendor.gstin}</span>
                          </div>
                        )}
                        {vendor.pan && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-gray-500 font-bold">PAN:</span>
                            <span className="text-gray-900">{vendor.pan}</span>
                          </div>
                        )}
                        {!vendor.gstin && !vendor.pan && (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold uppercase rounded-xs border ${
                            vendor.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-300'
                          }`}
                        >
                          {vendor.isActive ? (
                            <>
                              <CheckCircle2 size={10} /> Active
                            </>
                          ) : (
                            <>
                              <XCircle size={10} /> Inactive
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(vendor)}
                            className="p-1.5 text-[#006064] hover:bg-[#006064]/10 border border-transparent hover:border-[#006064]/30 rounded-xs cursor-pointer transition-colors"
                            title="Edit vendor details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingVendor(vendor)}
                            className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xs cursor-pointer transition-colors"
                            title="Delete vendor"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing <strong className="text-gray-900">{filteredVendors.length}</strong> of{' '}
              <strong className="text-gray-900">{vendors.length}</strong> vendors
            </span>
          </div>
        </div>
      </div>

      {/* ── ADD / EDIT VENDOR MODAL (PORTAL) ── */}
      {mounted &&
        isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-neutral-300 shadow-2xl rounded-xs w-full max-w-xl my-auto overflow-hidden flex flex-col font-sans"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Building2 size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    {editingVendor ? `Edit Vendor: ${editingVendor.vendorName}` : 'Add New Vendor'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xs cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveVendor} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                {/* Vendor Name (MANDATORY) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-800 mb-1">
                    Vendor / Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-semibold text-gray-900 shadow-2xs"
                  />
                </div>

                {/* Mobile & Email in 2 columns (BOTH STRICTLY MANDATORY) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mobile Input with Validation */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-800 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9876543210"
                        maxLength={13}
                        value={formData.mobileNo}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9+\s-]/g, '');
                          setFormData({ ...formData, mobileNo: val });
                          if (formErrors.mobileNo) {
                            setFormErrors((prev) => ({ ...prev, mobileNo: validateMobile(val) }));
                          }
                        }}
                        onBlur={() => {
                          setFormErrors((prev) => ({ ...prev, mobileNo: validateMobile(formData.mobileNo) }));
                        }}
                        className={`w-full pl-8 pr-3 py-2 text-xs bg-white border ${
                          formErrors.mobileNo
                            ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                            : 'border-neutral-300 focus:border-[#006064]'
                        } focus:outline-none font-mono text-gray-900 shadow-2xs`}
                      />
                    </div>
                    {formErrors.mobileNo && (
                      <p className="text-[10.5px] text-red-600 mt-1 font-medium">
                        {formErrors.mobileNo}
                      </p>
                    )}
                  </div>

                  {/* Email Input with Validation */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-800 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. vendor@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, email: val });
                          if (formErrors.email) {
                            setFormErrors((prev) => ({ ...prev, email: validateEmail(val) }));
                          }
                        }}
                        onBlur={() => {
                          setFormErrors((prev) => ({ ...prev, email: validateEmail(formData.email) }));
                        }}
                        className={`w-full pl-8 pr-3 py-2 text-xs bg-white border ${
                          formErrors.email
                            ? 'border-red-500 bg-red-50/20 focus:border-red-600'
                            : 'border-neutral-300 focus:border-[#006064]'
                        } focus:outline-none text-gray-900 shadow-2xs`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-[10.5px] text-red-600 mt-1 font-medium">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Full Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] text-gray-900 shadow-2xs resize-none"
                  />
                </div>

                {/* Centre (Clean Dropdown: No 'All Centres', No '[object Object]') */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Centre
                  </label>
                  <select
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] text-gray-900 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Select Centre --</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank Account No (A/C No) & IFSC Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Bank A/C No. (For Expense Payments)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 50100234567890"
                      value={formData.accountNo}
                      onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono text-gray-900 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono text-gray-900 uppercase shadow-2xs"
                    />
                  </div>
                </div>

                {/* GSTIN & PAN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono text-gray-900 uppercase shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      PAN
                    </label>
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] font-mono text-gray-900 uppercase shadow-2xs"
                    />
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 focus:outline-none focus:border-[#006064] text-gray-900 shadow-2xs resize-none"
                  />
                </div>

                {/* Status Active Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="vendorActiveCheck"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#006064] rounded-xs cursor-pointer"
                  />
                  <label htmlFor="vendorActiveCheck" className="text-xs text-gray-800 font-medium cursor-pointer">
                    Active Vendor (Available for billing and expense operations)
                  </label>
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-neutral-300 hover:bg-neutral-100 text-gray-700 text-xs font-semibold rounded-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {submitting && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingVendor ? 'Update Vendor' : 'Save Vendor'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body
        )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {mounted &&
        deletingVendor &&
        createPortal(
          <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-red-200 shadow-2xl rounded-xs w-full max-w-md p-5 font-sans"
            >
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <AlertTriangle size={24} />
                <h3 className="font-bold text-sm uppercase">Delete Vendor Record?</h3>
              </div>
              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-gray-900">{deletingVendor.vendorName}</strong> from the
                master database? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingVendor(null)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-gray-700 text-xs font-semibold rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVendor}
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && <Loader2 size={13} className="animate-spin" />}
                  <span>Delete Record</span>
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
}
