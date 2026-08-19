'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  CheckCircle2,
  Loader2,
  DollarSign,
  Users,
  X,
  Filter,
  RefreshCw,
  Send,
  Eye,
  UserPlus,
  Percent,
  Download,
  CheckSquare,
  Square,
  Clock,
  Shield,
  FileText,
  Paperclip,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import {
  DEFAULT_CLIENT_ID_PREFIX,
  isParkingProduct,
  isDocumentationChargesProduct,
  roundCurrency,
  computeProductAmount,
  computeProductTotal,
  validateMobile,
  sanitizeMobileInput,
  validateEmail,
  buildHoAddress,
  ProductRow,
  createEmptyProductRow,
  calculateProratedAmount,
  calculateEscalatedSplit
} from '@/lib/client-master-utils';

interface ContactPerson {
  id?: number;
  name: string;
  designation: string;
  mobileNo: string;
  email: string;
}

interface LocationOption {
  id: number;
  name: string;
}

interface ClientMasterProductItem {
  id?: number;
  cabinName: string | null;
  noOfSeats: number | null;
  ratePerAgreement: number | null;
  amount: number | null;
  gstPercent: number | null;
  totalAmount: number | null;
  paymentDuration?: string | null;
  paymentDueDay?: number | null;
  firstPaymentDate?: string | null;
  agreementPdfUrl?: string | null;
  agreementPdfName?: string | null;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  lockinEndDate?: string | null;
  billingType?: string | null;
  proratedStartDate?: string | null;
  proratedEndDate?: string | null;
  escalationPercent?: number | null;
  escalationApplicable?: string | null;
  preEscalationRate?: number | null;
  postEscalationRate?: number | null;
}

interface ClientMasterEntry {
  id: number;
  srNo: number;
  companyName: string;
  hoAddress: string | null;
  hoAddressLine1?: string | null;
  hoAddressLine2?: string | null;
  hoCity?: string | null;
  hoState?: string | null;
  hoCountry?: string | null;
  hoPinCode?: string | null;
  gstStatus: 'REGISTERED' | 'UNREGISTERED';
  gstNo: string | null;
  gstPdfUrl: string | null;
  gstPdfName: string | null;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  agreementPdfUrl?: string | null;
  agreementPdfName?: string | null;
  lockinEndDate: string | null;
  noticePeriodMonths: number | null;
  noticePeriodApplicable: string | null;
  escalationPercent: number | null;
  escalationApplicable: string | null;
  documentationCharges?: number | null;
  cabinName: string | null;
  noOfSeats: number | null;
  ratePerAgreement: number | null;
  amount: number | null;
  gstPercent: number | null;
  totalAmount: number | null;
  willDeductTds: boolean;
  tanNo: string | null;
  tdsPdfUrl: string | null;
  tdsPdfName: string | null;
  clientId: string | null;
  hasBrokerCommission?: boolean;
  brokerCommissionPercent?: number | null;
  invoiceToBeRaised?: string | null;
  sorAmount: number | null;
  sorRecdDate: string | null;
  paymentDueDay?: number | null;
  clientStatus: string | null;
  isDispatchedToInvoices?: boolean;
  createdAt: string;
  createdBy: { id: number; name: string; email: string; assignedLocations?: { location: LocationOption }[] };
  contactPersons: ContactPerson[];
  products?: ClientMasterProductItem[];
}

const CLIENT_STATUS_OPTIONS = ['Active', 'Inactive', 'On Notice', 'Terminated', 'Pending Renewal'];
const NOTICE_APPLICABLE_OPTIONS = ['After Lock-in', 'Before Lock-in'];

export default function ClientMasterRegistryPage() {
  const { user, isRole } = useAuth();
  const { setIsSidebarOpen } = useSidebar();
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPER-ADMIN' || isRole('ADMIN');
  const isCommunityManager = isRole('COMMUNITY_MANAGER');
  const userEmail = user?.email?.toLowerCase() || '';
  const isAccountant = isCommunityManager && userEmail === 'ssinfrazone21@gmail.com';

  if (isAccountant && !isAdmin) {
    return (
      <div className="p-10 max-w-lg mx-auto text-center space-y-4 bg-white border border-red-200 mt-20 shadow-sm">
        <div className="text-4xl text-red-500">🔒</div>
        <h2 className="text-xl font-bold text-red-700">Access Denied</h2>
        <p className="text-xs text-[#616161]">
          Accountants do not have access to the Client Master Data Entry repository. Please visit the <strong>Invoices Section</strong> to process Tally PDF invoices.
        </p>
      </div>
    );
  }

  const [entries, setEntries] = useState<ClientMasterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientStatusFilter, setSelectedClientStatusFilter] = useState('ALL');

  // Node/Location filter (Admin only)
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');

  // Multi-select for manual dispatch
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dispatching, setDispatching] = useState(false);

  // Big Popup Modal for Add Client / Edit Client
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Auto-collapse sidebar when Add/Edit modal is opened
  useEffect(() => {
    if (showAddClientModal) {
      setIsSidebarOpen(false);
    }
  }, [showAddClientModal, setIsSidebarOpen]);

  // View Details Modal
  const [entryToViewDetails, setEntryToViewDetails] = useState<ClientMasterEntry | null>(null);

  // ---------------- FORM STATE ----------------
  const [srNoDisplay, setSrNoDisplay] = useState<number>(1);
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID_PREFIX);

  // Brokerage Commission Options
  const [hasBrokerCommission, setHasBrokerCommission] = useState(false);
  const [brokerCommissionPercent, setBrokerCommissionPercent] = useState<number | ''>('');
  const [invoiceToBeRaised, setInvoiceToBeRaised] = useState('CLIENT');

  // Primary Company Details
  const [companyName, setCompanyName] = useState('');
  const [hoAddressLine1, setHoAddressLine1] = useState('');
  const [hoAddressLine2, setHoAddressLine2] = useState('');
  const [hoCity, setHoCity] = useState('');
  const [hoState, setHoState] = useState('');
  const [hoCountry, setHoCountry] = useState('');
  const [hoPinCode, setHoPinCode] = useState('');

  // GST
  const [gstStatus, setGstStatus] = useState<'REGISTERED' | 'UNREGISTERED'>('UNREGISTERED');
  const [gstNo, setGstNo] = useState('');
  const [gstPdfUrl, setGstPdfUrl] = useState('');
  const [gstPdfName, setGstPdfName] = useState('');
  const [uploadingGstPdf, setUploadingGstPdf] = useState(false);

  // Contact Persons
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([
    { name: '', designation: '', mobileNo: '', email: '' }
  ]);

  // Agreement Terms & Attachment
  const [agreementStartDate, setAgreementStartDate] = useState('');
  const [agreementEndDate, setAgreementEndDate] = useState('');
  const [agreementPdfUrl, setAgreementPdfUrl] = useState('');
  const [agreementPdfName, setAgreementPdfName] = useState('');
  const [uploadingAgreementPdf, setUploadingAgreementPdf] = useState(false);

  const [lockinEndDate, setLockinEndDate] = useState('');
  const [noticePeriodMonths, setNoticePeriodMonths] = useState<number | ''>('');
  const [noticePeriodApplicable, setNoticePeriodApplicable] = useState('After Lock-in');

  // Escalation % and Applicable Date (Separate section)
  const [escalationPercent, setEscalationPercent] = useState<number | ''>('');
  const [escalationApplicable, setEscalationApplicable] = useState('');
  const [documentationCharges, setDocumentationCharges] = useState<number | ''>('');

  // Multi-Product Row State
  const [productRows, setProductRows] = useState<ProductRow[]>([createEmptyProductRow()]);

  // Master product options list (Invoice Products)
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Pro-Rata & Escalation Helper Modal State
  const [activeProratedRowIndex, setActiveProratedRowIndex] = useState<number | null>(null);
  const [prorateStartDate, setProrateStartDate] = useState('');
  const [prorateMonthlyRate, setProrateMonthlyRate] = useState<number | ''>('');
  const [prorateSeats, setProrateSeats] = useState<number | ''>('');

  const [activeEscalatedRowIndex, setActiveEscalatedRowIndex] = useState<number | null>(null);
  const [escOldRate, setEscOldRate] = useState<number | ''>('');
  const [escNewRate, setEscNewRate] = useState<number | ''>('');
  const [escDate, setEscDate] = useState('');
  const [escSeats, setEscSeats] = useState<number | ''>('');

  // Target Due Date Filter for Dispatch
  const [selectedTargetDueDay, setSelectedTargetDueDay] = useState<string>('ALL');
  const [showDispatchDueDayModal, setShowDispatchDueDayModal] = useState(false);
  const [uploadingProductAgrIdx, setUploadingProductAgrIdx] = useState<number | null>(null);

  // TDS
  const [willDeductTds, setWillDeductTds] = useState(false);
  const [tanNo, setTanNo] = useState('');
  const [tdsPdfUrl, setTdsPdfUrl] = useState('');
  const [tdsPdfName, setTdsPdfName] = useState('');
  const [uploadingTdsPdf, setUploadingTdsPdf] = useState(false);

  // Security Deposit & Payment Due
  const [sorAmount, setSorAmount] = useState<number | ''>('');
  const [sorRecdDate, setSorRecdDate] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState<number | ''>('');
  const [clientStatus, setClientStatus] = useState('Active');

  // Fetch available products from DB
  const fetchAvailableProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/invoice-products');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAvailableProducts(json.data.map((p: any) => p.name));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAvailableProducts();
  }, [fetchAvailableProducts]);

  // Add new product to DB dynamically
  const handleAddNewProductOption = async () => {
    if (!newProductName.trim()) {
      toast.error('Please enter product name');
      return;
    }
    setAddingProduct(true);
    try {
      const res = await fetch('/api/admin/invoice-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProductName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Product "${newProductName.trim()}" added!`);
        setNewProductName('');
        setShowAddProductModal(false);
        fetchAvailableProducts();
      } else {
        toast.error(json.error || 'Failed to add product option');
      }
    } catch {
      toast.error('Error adding product option');
    } finally {
      setAddingProduct(false);
    }
  };

  // Product Row Handlers & Auto Rounding
  const handleAddProductRow = () => {
    setProductRows((prev) => [...prev, createEmptyProductRow()]);
  };

  const handleRemoveProductRow = (index: number) => {
    if (productRows.length === 1) {
      toast.error('At least one product/cabin is required');
      return;
    }
    setProductRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateProductRow = (index: number, field: keyof ProductRow, val: any) => {
    setProductRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: val };

      if (field === 'noOfSeats' || field === 'ratePerAgreement') {
        if (!row.isAmountManuallyEdited) {
          const seats = Number(field === 'noOfSeats' ? val : row.noOfSeats) || 0;
          const rate = Number(field === 'ratePerAgreement' ? val : row.ratePerAgreement) || 0;
          row.amount = (seats > 0 && rate > 0) ? computeProductAmount(seats, rate) : '';
        }
      }

      if (field === 'amount') {
        row.isAmountManuallyEdited = true;
      }

      if (field === 'noOfSeats' || field === 'ratePerAgreement' || field === 'amount' || field === 'gstPercent') {
        if (!row.isTotalAmountManuallyEdited) {
          const baseAmt = row.amount !== '' ? Number(row.amount) : 0;
          const gstPct = row.gstPercent !== '' ? Number(row.gstPercent) : 0;
          row.totalAmount = (row.amount !== '' && Number(row.amount) > 0)
            ? computeProductTotal(baseAmt, gstPct)
            : '';
        }
      }

      if (field === 'totalAmount') {
        row.isTotalAmountManuallyEdited = true;
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleResetRowAmountAuto = (index: number) => {
    setProductRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.isAmountManuallyEdited = false;
      const seats = Number(row.noOfSeats) || 0;
      const rate = Number(row.ratePerAgreement) || 0;
      row.amount = (seats > 0 && rate > 0) ? computeProductAmount(seats, rate) : '';
      if (!row.isTotalAmountManuallyEdited) {
        const baseAmt = row.amount !== '' ? Number(row.amount) : 0;
        const gstPct = row.gstPercent !== '' ? Number(row.gstPercent) : 0;
        row.totalAmount = (row.amount !== '' && Number(row.amount) > 0)
          ? computeProductTotal(baseAmt, gstPct)
          : '';
      }
      updated[index] = row;
      return updated;
    });
  };

  const handleResetRowTotalAuto = (index: number) => {
    setProductRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };
      row.isTotalAmountManuallyEdited = false;
      const baseAmt = row.amount !== '' ? Number(row.amount) : 0;
      const gstPct = row.gstPercent !== '' ? Number(row.gstPercent) : 0;
      row.totalAmount = (row.amount !== '' && Number(row.amount) > 0)
        ? computeProductTotal(baseAmt, gstPct)
        : '';
      updated[index] = row;
      return updated;
    });
  };

  // Fetch locations for Admin filter dropdown
  const fetchLocations = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/admin/locations?limit=100');
      const json = await res.json();
      const locList = json.data || json.locations || (Array.isArray(json) ? json : []);
      if (Array.isArray(locList)) {
        setLocations(locList.map((l: any) => ({ id: l.id, name: l.name })));
      }
    } catch { /* ignore */ }
  }, [isAdmin]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isAdmin && selectedLocationFilter !== 'ALL') {
        params.set('locationId', selectedLocationFilter);
      }
      const url = `/api/admin/client-master${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data);
        if (json.data.length > 0) {
          const maxSr = Math.max(...json.data.map((e: any) => e.srNo || 0));
          setSrNoDisplay(maxSr + 1);
        } else {
          setSrNoDisplay(1);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load client master entries');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedLocationFilter]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Contact Persons Handlers
  const handleAddContactPerson = () => {
    setContactPersons((prev) => [
      ...prev,
      { name: '', designation: '', mobileNo: '', email: '' }
    ]);
  };

  const handleRemoveContactPerson = (index: number) => {
    if (contactPersons.length === 1) {
      toast.error('At least one contact person is required');
      return;
    }
    setContactPersons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateContactPerson = (index: number, field: keyof ContactPerson, val: string) => {
    setContactPersons((prev) => {
      const updated = [...prev];
      let valueToSet = val;
      if (field === 'mobileNo') {
        valueToSet = sanitizeMobileInput(val);
      }
      updated[index] = { ...updated[index], [field]: valueToSet };
      return updated;
    });
  };

  // Upload Handlers for GST, TDS, and Agreement PDFs (Stored in Database)
  const handleFileUpload = async (file: File, type: 'GST' | 'TDS' | 'AGREEMENT') => {
    if (type === 'GST') setUploadingGstPdf(true);
    if (type === 'TDS') setUploadingTdsPdf(true);
    if (type === 'AGREEMENT') setUploadingAgreementPdf(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.success) {
        if (type === 'GST') {
          setGstPdfUrl(json.data.fileUrl);
          setGstPdfName(json.data.fileName);
          toast.success('GST Certificate uploaded successfully');
        } else if (type === 'TDS') {
          setTdsPdfUrl(json.data.fileUrl);
          setTdsPdfName(json.data.fileName);
          toast.success('TAT Certificate uploaded successfully');
        } else if (type === 'AGREEMENT') {
          setAgreementPdfUrl(json.data.fileUrl);
          setAgreementPdfName(json.data.fileName);
          toast.success('Agreement PDF uploaded successfully');
        }
      } else {
        toast.error(json.error || 'Upload failed');
      }
    } catch {
      toast.error('File upload failed');
    } finally {
      if (type === 'GST') setUploadingGstPdf(false);
      if (type === 'TDS') setUploadingTdsPdf(false);
      if (type === 'AGREEMENT') setUploadingAgreementPdf(false);
    }
  };

  // Upload handler for Secondary/Expansion Product Agreement PDF
  const handleProductFileUpload = async (file: File, idx: number) => {
    setUploadingProductAgrIdx(idx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        handleUpdateProductRow(idx, 'agreementPdfUrl', json.data.fileUrl);
        handleUpdateProductRow(idx, 'agreementPdfName', json.data.fileName);
        handleUpdateProductRow(idx, 'hasSeparateAgreement', true);
        toast.success(`Agreement attached for Item #${idx + 1}`);
      } else {
        toast.error(json.error || 'Upload failed');
      }
    } catch {
      toast.error('File upload failed');
    } finally {
      setUploadingProductAgrIdx(null);
    }
  };

  // Apply Pro-Rata calculation to product row
  const handleApplyProrateToRow = (idx: number, mode: 'ADD_NEW_ROW' | 'COMBINE_ROW' | 'REPLACE_ROW' = 'COMBINE_ROW') => {
    if (!prorateStartDate || !prorateMonthlyRate || !prorateSeats) {
      toast.error('Please enter Start Date, Rate per Seat, and Seats');
      return;
    }
    const result = calculateProratedAmount(Number(prorateSeats), Number(prorateMonthlyRate), prorateStartDate);
    const dateObj = new Date(prorateStartDate);
    const day = dateObj.getDate();
    const monthName = dateObj.toLocaleString('en-IN', { month: 'short' });

    setProductRows((prev) => {
      const updated = [...prev];
      const targetRow = updated[idx];
      const existingName = (targetRow.cabinName || '').replace(/\s*\((?:Prorated|\+\d+\s+Seats).*?\)/gi, '').trim() || 'Workspace';
      const existingSeats = Number(targetRow.noOfSeats) || 0;
      const existingRate = Number(targetRow.ratePerAgreement) || Number(prorateMonthlyRate);
      const existingBaseAmount = (existingSeats > 0 && existingRate > 0) ? computeProductAmount(existingSeats, existingRate) : (Number(targetRow.amount) || 0);

      if (mode === 'ADD_NEW_ROW') {
        // 1. Insert a dedicated new row for the extra prorated seats
        const newProratedRow: ProductRow = {
          ...createEmptyProductRow(),
          cabinName: `${existingName} - Extra ${prorateSeats} Seats (Prorated ${day}-${result.daysInMonth} ${monthName})`,
          noOfSeats: Number(prorateSeats),
          ratePerAgreement: Number(prorateMonthlyRate),
          amount: result.proratedSubtotal,
          gstPercent: 18,
          totalAmount: result.proratedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          paymentDuration: targetRow.paymentDuration || 'MONTHLY',
          paymentDueDay: targetRow.paymentDueDay,
          firstPaymentDate: targetRow.firstPaymentDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        updated.splice(idx + 1, 0, newProratedRow);
        toast.success(`Added Extra Prorated Item: ₹${result.proratedSubtotal.toLocaleString()} (${result.activeDays} days for ${prorateSeats} seats)`);
      } else if (mode === 'COMBINE_ROW') {
        // 2. Combine base seats + extra prorated seats in the current item row
        const combinedSeats = existingSeats + Number(prorateSeats);
        const combinedAmount = roundCurrency(existingBaseAmount + result.proratedSubtotal);
        const combinedTotal = computeProductTotal(combinedAmount, 18);

        updated[idx] = {
          ...targetRow,
          cabinName: `${existingName} (+${prorateSeats} Seats Prorated from ${day} ${monthName})`,
          noOfSeats: combinedSeats,
          ratePerAgreement: existingRate,
          amount: combinedAmount,
          gstPercent: 18,
          totalAmount: combinedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        toast.success(`Updated Item: Base (₹${existingBaseAmount.toLocaleString()}) + Prorated Extra (₹${result.proratedSubtotal.toLocaleString()}) = ₹${combinedAmount.toLocaleString()}`);
      } else {
        // 3. Replace current item with only the prorated amount (e.g. for brand new mid-month joiner)
        updated[idx] = {
          ...targetRow,
          cabinName: `${existingName} (Prorated ${day}-${result.daysInMonth} ${monthName})`,
          noOfSeats: Number(prorateSeats),
          ratePerAgreement: Number(prorateMonthlyRate),
          amount: result.proratedSubtotal,
          gstPercent: 18,
          totalAmount: result.proratedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        toast.success(`Applied Prorated: ₹${result.proratedSubtotal.toLocaleString()} for ${result.activeDays} days`);
      }

      return updated;
    });

    setActiveProratedRowIndex(null);
  };

  // Apply Mid-Month Escalation Split to product row
  const handleApplyEscalationToRow = (idx: number) => {
    if (!escOldRate || !escNewRate || !escDate || !escSeats) {
      toast.error('Please enter Old Rate, New Rate, Escalation Date, and Seats');
      return;
    }
    const result = calculateEscalatedSplit(Number(escSeats), Number(escOldRate), Number(escNewRate), escDate);
    const dateObj = new Date(escDate);
    const escDay = dateObj.getDate();
    const monthName = dateObj.toLocaleString('en-IN', { month: 'short' });

    setProductRows((prev) => {
      const updated = [...prev];
      const existingName = (updated[idx].cabinName || '').replace(/\s*\(Escalated.*?\)/i, '').trim();
      updated[idx] = {
        ...updated[idx],
        cabinName: `${existingName || 'Space'} (Escalated from ${escDay} ${monthName})`,
        noOfSeats: Number(escSeats),
        ratePerAgreement: Number(escNewRate),
        amount: result.totalSubtotal,
        gstPercent: 18,
        totalAmount: result.grandTotal,
        billingType: 'ESCALATED',
        escalationApplicable: escDate,
        preEscalationRate: Number(escOldRate),
        postEscalationRate: Number(escNewRate),
        isAmountManuallyEdited: true,
        isTotalAmountManuallyEdited: true,
      };
      return updated;
    });

    toast.success(`Applied Escalated Split: Pre ₹${result.preAmount.toLocaleString()} (${result.preDays}d) + Post ₹${result.postAmount.toLocaleString()} (${result.postDays}d) = Total ₹${result.totalSubtotal.toLocaleString()}`);
    setActiveEscalatedRowIndex(null);
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setClientId(DEFAULT_CLIENT_ID_PREFIX);
    setHasBrokerCommission(false);
    setBrokerCommissionPercent('');
    setInvoiceToBeRaised('CLIENT');

    setCompanyName('');
    setHoAddressLine1('');
    setHoAddressLine2('');
    setHoCity('');
    setHoState('');
    setHoCountry('');
    setHoPinCode('');

    setGstStatus('UNREGISTERED');
    setGstNo('');
    setGstPdfUrl('');
    setGstPdfName('');

    setContactPersons([{ name: '', designation: '', mobileNo: '', email: '' }]);

    setAgreementStartDate('');
    setAgreementEndDate('');
    setAgreementPdfUrl('');
    setAgreementPdfName('');
    setLockinEndDate('');
    setNoticePeriodMonths('');
    setNoticePeriodApplicable('After Lock-in');

    setEscalationPercent('');
    setEscalationApplicable('');
    setDocumentationCharges('');

    setProductRows([createEmptyProductRow()]);

    setWillDeductTds(false);
    setTanNo('');
    setTdsPdfUrl('');
    setTdsPdfName('');

    setSorAmount('');
    setSorRecdDate('');
    setPaymentDueDay('');
    setClientStatus('Active');

    const maxSr = entries.length > 0 ? Math.max(...entries.map((e) => e.srNo || 0)) : 0;
    setSrNoDisplay(maxSr + 1);
  };

  // Populate Form for Editing
  const handleEditEntry = (entry: ClientMasterEntry) => {
    setEditingId(entry.id);
    setSrNoDisplay(entry.srNo);
    setClientId(entry.clientId || DEFAULT_CLIENT_ID_PREFIX);
    setHasBrokerCommission(Boolean(entry.hasBrokerCommission));
    setBrokerCommissionPercent(entry.brokerCommissionPercent ?? '');
    setInvoiceToBeRaised(entry.invoiceToBeRaised || 'CLIENT');

    setCompanyName(entry.companyName || '');
    setHoAddressLine1(entry.hoAddressLine1 || '');
    setHoAddressLine2(entry.hoAddressLine2 || '');
    setHoCity(entry.hoCity || '');
    setHoState(entry.hoState || '');
    setHoCountry(entry.hoCountry || '');
    setHoPinCode(entry.hoPinCode || '');

    setGstStatus(entry.gstStatus || 'UNREGISTERED');
    setGstNo(entry.gstNo || '');
    setGstPdfUrl(entry.gstPdfUrl || '');
    setGstPdfName(entry.gstPdfName || '');

    if (entry.contactPersons && entry.contactPersons.length > 0) {
      setContactPersons(
        entry.contactPersons.map((cp) => ({
          name: cp.name || '',
          designation: cp.designation || '',
          mobileNo: cp.mobileNo || '',
          email: cp.email || ''
        }))
      );
    } else {
      setContactPersons([{ name: '', designation: '', mobileNo: '', email: '' }]);
    }

    setAgreementStartDate(entry.agreementStartDate ? new Date(entry.agreementStartDate).toISOString().split('T')[0] : '');
    setAgreementEndDate(entry.agreementEndDate ? new Date(entry.agreementEndDate).toISOString().split('T')[0] : '');
    setAgreementPdfUrl(entry.agreementPdfUrl || '');
    setAgreementPdfName(entry.agreementPdfName || '');
    setLockinEndDate(entry.lockinEndDate ? new Date(entry.lockinEndDate).toISOString().split('T')[0] : '');
    setNoticePeriodMonths(entry.noticePeriodMonths ?? '');
    setNoticePeriodApplicable(entry.noticePeriodApplicable || 'After Lock-in');

    setEscalationPercent(entry.escalationPercent ?? '');
    setEscalationApplicable(entry.escalationApplicable ? new Date(entry.escalationApplicable).toISOString().split('T')[0] : '');
    setDocumentationCharges(entry.documentationCharges ?? '');

    if (entry.products && entry.products.length > 0) {
      setProductRows(
        entry.products.map((p) => ({
          id: p.id,
          cabinName: p.cabinName || '',
          noOfSeats: p.noOfSeats ?? '',
          ratePerAgreement: p.ratePerAgreement ?? '',
          amount: p.amount ?? '',
          gstPercent: p.gstPercent ?? 18,
          totalAmount: p.totalAmount ?? '',
          paymentDuration: p.paymentDuration || 'MONTHLY',
          paymentDueDay: p.paymentDueDay ?? entry.paymentDueDay ?? 5,
          firstPaymentDate: p.firstPaymentDate ? new Date(p.firstPaymentDate).toISOString().split('T')[0] : '',
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
          hasSeparateAgreement: Boolean(p.agreementPdfUrl),
          agreementPdfUrl: p.agreementPdfUrl || '',
          agreementPdfName: p.agreementPdfName || '',
          agreementStartDate: p.agreementStartDate ? new Date(p.agreementStartDate).toISOString().split('T')[0] : '',
          agreementEndDate: p.agreementEndDate ? new Date(p.agreementEndDate).toISOString().split('T')[0] : '',
          lockinEndDate: p.lockinEndDate ? new Date(p.lockinEndDate).toISOString().split('T')[0] : '',
          billingType: p.billingType || 'REGULAR',
          proratedStartDate: p.proratedStartDate ? new Date(p.proratedStartDate).toISOString().split('T')[0] : '',
          proratedEndDate: p.proratedEndDate ? new Date(p.proratedEndDate).toISOString().split('T')[0] : '',
          escalationPercent: p.escalationPercent ?? '',
          escalationApplicable: p.escalationApplicable ? new Date(p.escalationApplicable).toISOString().split('T')[0] : '',
          preEscalationRate: p.preEscalationRate ?? '',
          postEscalationRate: p.postEscalationRate ?? '',
        }))
      );
    } else {
      setProductRows([
        {
          cabinName: entry.cabinName || '',
          noOfSeats: entry.noOfSeats ?? '',
          ratePerAgreement: entry.ratePerAgreement ?? '',
          amount: entry.amount ?? '',
          gstPercent: entry.gstPercent ?? 18,
          totalAmount: entry.totalAmount ?? '',
          paymentDuration: 'MONTHLY',
          paymentDueDay: entry.paymentDueDay ?? 5,
          firstPaymentDate: '',
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
          hasSeparateAgreement: false,
          agreementPdfUrl: '',
          agreementPdfName: '',
          agreementStartDate: '',
          agreementEndDate: '',
          lockinEndDate: '',
          billingType: 'REGULAR',
          proratedStartDate: '',
          proratedEndDate: '',
          escalationPercent: '',
          escalationApplicable: '',
          preEscalationRate: '',
          postEscalationRate: '',
        }
      ]);
    }

    setWillDeductTds(Boolean(entry.willDeductTds));
    setTanNo(entry.tanNo || '');
    setTdsPdfUrl(entry.tdsPdfUrl || '');
    setTdsPdfName(entry.tdsPdfName || '');

    setSorAmount(entry.sorAmount ?? '');
    setSorRecdDate(entry.sorRecdDate ? new Date(entry.sorRecdDate).toISOString().split('T')[0] : '');
    setPaymentDueDay(entry.paymentDueDay ?? '');
    setClientStatus(entry.clientStatus || 'Active');

    setShowAddClientModal(true);
  };

  // Submit Handler with Validations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations for Mobile & Email
    for (const cp of contactPersons) {
      if (cp.mobileNo && !validateMobile(cp.mobileNo)) {
        toast.error(`Mobile number for "${cp.name || 'Contact Person'}" must be exactly 10 numeric digits.`);
        return;
      }
      if (cp.email && !validateEmail(cp.email)) {
        toast.error(`Email for "${cp.name || 'Contact Person'}" is invalid (must contain @).`);
        return;
      }
    }

    if (paymentDueDay !== '' && (Number(paymentDueDay) < 1 || Number(paymentDueDay) > 31)) {
      toast.error('Payment Due Day must be between 1 and 31');
      return;
    }

    setSubmitting(true);

    const payload = {
      clientId: clientId.trim() || DEFAULT_CLIENT_ID_PREFIX,
      hasBrokerCommission,
      brokerCommissionPercent: hasBrokerCommission && brokerCommissionPercent !== '' ? Number(brokerCommissionPercent) : null,
      invoiceToBeRaised: hasBrokerCommission ? invoiceToBeRaised : null,

      companyName: companyName.trim() || 'Untitled Client',
      hoAddressLine1: hoAddressLine1.trim() || null,
      hoAddressLine2: hoAddressLine2.trim() || null,
      hoCity: hoCity.trim() || null,
      hoState: hoState.trim() || null,
      hoCountry: hoCountry.trim() || null,
      hoPinCode: hoPinCode.trim() || null,
      hoAddress: buildHoAddress({
        line1: hoAddressLine1,
        line2: hoAddressLine2,
        city: hoCity,
        state: hoState,
        country: hoCountry,
        pinCode: hoPinCode,
      }),

      gstStatus,
      gstNo: gstStatus === 'REGISTERED' ? gstNo.trim() : null,
      gstPdfUrl: gstStatus === 'REGISTERED' ? gstPdfUrl : null,
      gstPdfName: gstStatus === 'REGISTERED' ? gstPdfName : null,

      contactPersons: contactPersons.filter((cp) => cp.name.trim() !== '' || cp.mobileNo.trim() !== '' || cp.email.trim() !== ''),

      agreementStartDate: agreementStartDate || null,
      agreementEndDate: agreementEndDate || null,
      agreementPdfUrl: agreementPdfUrl || null,
      agreementPdfName: agreementPdfName || null,
      lockinEndDate: lockinEndDate || null,
      noticePeriodMonths: noticePeriodMonths !== '' ? Number(noticePeriodMonths) : null,
      noticePeriodApplicable,

      escalationPercent: escalationPercent !== '' ? Number(escalationPercent) : null,
      escalationApplicable: escalationApplicable || null,
      documentationCharges: documentationCharges !== '' ? Number(documentationCharges) : null,

      products: productRows.map((p) => ({
        cabinName: p.cabinName.trim() || null,
        noOfSeats: p.noOfSeats !== '' ? Number(p.noOfSeats) : null,
        ratePerAgreement: p.ratePerAgreement !== '' ? Number(p.ratePerAgreement) : null,
        amount: p.amount !== '' ? Number(p.amount) : null,
        gstPercent: p.gstPercent !== '' ? Number(p.gstPercent) : 18,
        totalAmount: p.totalAmount !== '' ? Number(p.totalAmount) : null,
        paymentDuration: p.paymentDuration || 'MONTHLY',
        paymentDueDay: p.paymentDueDay !== '' ? Number(p.paymentDueDay) : null,
        firstPaymentDate: p.firstPaymentDate || null,
        agreementPdfUrl: p.hasSeparateAgreement && p.agreementPdfUrl ? p.agreementPdfUrl : null,
        agreementPdfName: p.hasSeparateAgreement && p.agreementPdfName ? p.agreementPdfName : null,
        agreementStartDate: p.hasSeparateAgreement && p.agreementStartDate ? p.agreementStartDate : null,
        agreementEndDate: p.hasSeparateAgreement && p.agreementEndDate ? p.agreementEndDate : null,
        lockinEndDate: p.hasSeparateAgreement && p.lockinEndDate ? p.lockinEndDate : null,
        billingType: p.billingType || 'REGULAR',
        proratedStartDate: p.proratedStartDate || null,
        proratedEndDate: p.proratedEndDate || null,
        escalationPercent: p.escalationPercent !== '' ? Number(p.escalationPercent) : null,
        escalationApplicable: p.escalationApplicable || null,
        preEscalationRate: p.preEscalationRate !== '' ? Number(p.preEscalationRate) : null,
        postEscalationRate: p.postEscalationRate !== '' ? Number(p.postEscalationRate) : null,
      })),

      willDeductTds,
      tanNo: willDeductTds ? tanNo.trim() : null,
      tdsPdfUrl: willDeductTds ? tdsPdfUrl : null,
      tdsPdfName: willDeductTds ? tdsPdfName : null,

      sorAmount: sorAmount !== '' ? Number(sorAmount) : null,
      sorRecdDate: sorRecdDate || null,
      paymentDueDay: paymentDueDay !== '' ? Number(paymentDueDay) : null,
      clientStatus,
    };

    try {
      const url = editingId ? `/api/admin/client-master/${editingId}` : '/api/admin/client-master';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (json.success) {
        toast.success(editingId ? 'Client entry updated!' : 'Client added to Master Registry!');
        setShowAddClientModal(false);
        resetForm();
        fetchData();
      } else {
        toast.error(json.error || 'Operation failed');
      }
    } catch {
      toast.error('An error occurred while saving client entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch to Invoices Section Handler
  const handleDispatchToInvoices = async (sendType: 'MANUAL' | 'AUTOMATIC_MONTH_END', ids: number[] = []) => {
    setDispatching(true);
    try {
      const res = await fetch('/api/admin/client-master/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendType,
          clientMasterIds: ids,
          locationId: selectedLocationFilter !== 'ALL' ? selectedLocationFilter : null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`✅ ${json.message}`);
        setSelectedIds([]);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to dispatch to Invoices section');
      }
    } catch {
      toast.error('Error dispatching to Invoices section');
    } finally {
      setDispatching(false);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client entry from Master Registry?')) return;

    try {
      const res = await fetch(`/api/admin/client-master/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Client entry deleted');
        fetchData();
      } else {
        toast.error(json.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete client entry');
    }
  };

  // Multi-select toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEntries.map((e) => e.id));
    }
  };

  const toggleSelectId = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        e.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.gstNo && e.gstNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.clientId && e.clientId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.cabinName && e.cabinName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.contactPersons.some((cp) => cp.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesClientStatus =
        selectedClientStatusFilter === 'ALL' || e.clientStatus === selectedClientStatusFilter;

      return matchesSearch && matchesClientStatus;
    });
  }, [entries, searchTerm, selectedClientStatusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalClients = entries.length;
    const activeClients = entries.filter((e) => e.clientStatus === 'Active').length;
    const onNotice = entries.filter((e) => e.clientStatus === 'On Notice').length;
    const totalSeats = entries.reduce((acc, curr) => acc + (Number(curr.noOfSeats) || 0), 0);
    const totalRev = entries.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
    return { totalClients, activeClients, onNotice, totalSeats, totalRev };
  }, [entries]);

  return (
    <div className="p-6 sm:p-10 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      {/* Auto-Dispatch Notice + Manual Button */}
      <FadeUp>
        <div className="bg-white border border-[var(--outline-variant)]/60 px-4 py-2.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-[#616161]">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Active client records are <strong className="text-[#1B1C1C]">automatically dispatched to Invoices</strong> on the last day of every month.</span>
          </div>
          <button
            type="button"
            onClick={() => handleDispatchToInvoices('AUTOMATIC_MONTH_END')}
            disabled={dispatching}
            className="px-3 py-1.5 bg-[var(--primary)] hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            {dispatching ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Dispatch to Invoices
          </button>
        </div>
      </FadeUp>

      {/* Title Header */}
      <FadeUp delay={0.05}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--outline-variant)]/40">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
              <Building2 size={16} /> Client Master Repository
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-[#1B1C1C]">
              Client Master Data Entry
            </h1>
            <p className="text-sm text-[#616161] mt-1 font-light">
              Add new clients, maintain company records, seating allocations, agreement terms, and dispatch records to Invoices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleDispatchToInvoices('MANUAL', selectedIds)}
                disabled={dispatching}
                className="px-5 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:bg-blue-700"
              >
                {dispatching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Selected ({selectedIds.length}) to Invoices
              </button>
            )}

            <button
              onClick={() => {
                resetForm();
                setShowAddClientModal(true);
              }}
              className="px-6 py-3 bg-[#006064] text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:bg-[#004D40]"
            >
              <Plus size={18} /> Add New Client Master Entry
            </button>
          </div>
        </div>
      </FadeUp>

      {/* KPI Summary Cards */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 border border-[var(--outline-variant)]/40 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#616161]">Total Master Clients</div>
            <div className="text-2xl font-display font-black mt-1 text-[#1B1C1C]">{kpis.totalClients}</div>
            <div className="text-[11px] text-[#616161] font-light">All records in database</div>
          </div>

          <div className="bg-white p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Active Agreements</div>
            <div className="text-2xl font-display font-black mt-1 text-emerald-800">{kpis.activeClients}</div>
            <div className="text-[11px] text-emerald-600 font-light">Included in month-end dispatch</div>
          </div>

          <div className="bg-white p-5 border border-amber-200 bg-amber-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">On Notice Clients</div>
            <div className="text-2xl font-display font-black mt-1 text-amber-800">{kpis.onNotice}</div>
            <div className="text-[11px] text-amber-600 font-light">Pending lock-in / exit</div>
          </div>

          <div className="bg-white p-5 border border-blue-200 bg-blue-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Total Allocated Seats</div>
            <div className="text-2xl font-display font-black mt-1 text-blue-800">{kpis.totalSeats}</div>
            <div className="text-[11px] text-blue-600 font-light">Seats allocated in cabins</div>
          </div>

          <div className="bg-white p-5 border border-purple-200 bg-purple-50/20 shadow-xs col-span-2 lg:col-span-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">Total Contract Value</div>
            <div className="text-2xl font-display font-black mt-1 text-purple-800">
              ₹{kpis.totalRev.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-purple-600 font-light">Monthly sum of all agreements</div>
          </div>
        </div>
      </FadeUp>

      {/* MASTER DATA TABLE */}
      <FadeUp delay={0.15}>
        <div className="bg-white border border-[var(--outline-variant)]/40 p-6 space-y-6 shadow-xs">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-200 pb-4">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3 top-3.5 text-[#616161]" />
              <input
                type="text"
                placeholder="Search by company, GST, Client ID, Cabin or Contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Admin-only Node/Location filter */}
              {isAdmin && locations.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#616161]">
                    <MapPin size={14} /> Node:
                  </div>
                  <select
                    value={selectedLocationFilter}
                    onChange={(e) => setSelectedLocationFilter(e.target.value)}
                    className="bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-medium"
                  >
                    <option value="ALL">All Nodes</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#616161]">
                <Filter size={14} /> Client Status:
              </div>
              <select
                value={selectedClientStatusFilter}
                onChange={(e) => setSelectedClientStatusFilter(e.target.value)}
                className="bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-medium"
              >
                <option value="ALL">All Statuses</option>
                {CLIENT_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchData}
                className="p-2 border border-[var(--outline-variant)] hover:bg-neutral-50 text-[#616161]"
                title="Refresh"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-[#616161] flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-[#006064]" /> Loading client master database...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-4xl text-neutral-300">🏢</div>
              <div className="text-sm font-bold text-[#1B1C1C]">No master records found</div>
              <p className="text-xs text-[#616161] max-w-sm mx-auto font-light">
                No entries match your search criteria. Click "Add New Client Master Entry" to add data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] text-[#616161] uppercase tracking-wider border-b border-[var(--outline-variant)] font-bold">
                    <th className="p-3 w-10 text-center">
                      <button onClick={toggleSelectAll} className="text-neutral-500 hover:text-black">
                        {selectedIds.length === filteredEntries.length && filteredEntries.length > 0 ? (
                          <CheckSquare size={16} className="text-[#006064]" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="p-3 w-12 text-center">SR.No</th>
                    <th className="p-3">Company & Address</th>
                    {isAdmin && <th className="p-3">Node / Created By</th>}
                    <th className="p-3">Client ID</th>
                    <th className="p-3">GST Details</th>
                    <th className="p-3">Contact Persons</th>
                    <th className="p-3">Agreement Dates</th>
                    <th className="p-3">Cabin & Seats</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-right">Total Amt (₹)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredEntries.map((entry, index) => {
                    const isSelected = selectedIds.includes(entry.id);
                    const displaySrNo = index + 1;
                    return (
                      <tr
                        key={entry.id}
                        className={`transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-neutral-50/60'}`}
                      >
                        <td className="p-3 text-center">
                          <button onClick={() => toggleSelectId(entry.id)} className="text-neutral-500 hover:text-black">
                            {isSelected ? <CheckSquare size={16} className="text-[#006064]" /> : <Square size={16} />}
                          </button>
                        </td>

                        <td className="p-3 text-center font-mono font-bold text-neutral-600 bg-neutral-50/50">
                          #{displaySrNo}
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-[#1B1C1C] text-sm">{entry.companyName}</div>
                          {entry.hoAddress && (
                            <div className="text-[10px] text-[#616161] line-clamp-1" title={entry.hoAddress}>
                              HO: {entry.hoAddress}
                            </div>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="p-3">
                            <div className="space-y-0.5">
                              {entry.createdBy?.assignedLocations && entry.createdBy.assignedLocations.length > 0 ? (
                                entry.createdBy.assignedLocations.map((al: any, i: number) => (
                                  <div key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[9px] font-bold uppercase tracking-wider mr-1">
                                    <MapPin size={9} /> {al.location.name}
                                  </div>
                                ))
                              ) : (
                                <span className="text-[9px] text-neutral-400">No Node</span>
                              )}
                              <div className="text-[10px] text-[#616161] mt-0.5">
                                by {entry.createdBy?.name || 'Unknown'}
                              </div>
                            </div>
                          </td>
                        )}

                        <td className="p-3 font-mono font-bold text-neutral-700">
                          {entry.clientId || 'N/A'}
                        </td>

                        <td className="p-3 space-y-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase ${
                              entry.gstStatus === 'REGISTERED' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {entry.gstStatus}
                          </span>
                          {entry.gstNo && <div className="font-mono text-[10px]">{entry.gstNo}</div>}
                        </td>

                        <td className="p-3 space-y-1">
                          {entry.contactPersons?.slice(0, 2).map((cp, idx) => (
                            <div key={idx} className="text-[10px]">
                              <span className="font-bold text-[#1B1C1C]">{cp.name}</span>
                              {cp.designation && <span className="text-neutral-500"> ({cp.designation})</span>}
                            </div>
                          ))}
                          {entry.contactPersons && entry.contactPersons.length > 2 && (
                            <div className="text-[9px] text-[#006064] font-bold">
                              +{entry.contactPersons.length - 2} more
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-[10px] space-y-0.5">
                          {entry.agreementStartDate && (
                            <div>
                              Start: <span className="font-bold">{new Date(entry.agreementStartDate).toLocaleDateString('en-IN')}</span>
                            </div>
                          )}
                          {entry.agreementEndDate && (
                            <div>
                              End: <span className="font-bold">{new Date(entry.agreementEndDate).toLocaleDateString('en-IN')}</span>
                            </div>
                          )}
                          {entry.agreementPdfUrl && (
                            <a
                              href={entry.agreementPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-[#006064] font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              <Paperclip size={9} /> Agreement PDF
                            </a>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="font-bold">
                            {entry.products && entry.products.length > 1
                              ? `${entry.products.length} Products (${entry.products.map((p) => p.cabinName).filter(Boolean).join(', ')})`
                              : entry.cabinName || 'N/A'}
                          </div>
                          <div className="text-[10px] text-[#616161]">
                            {entry.noOfSeats || 0} seats @ ₹{Number(entry.ratePerAgreement || 0).toLocaleString('en-IN')}
                          </div>
                        </td>

                        <td className="p-3 text-right font-bold text-[#1B1C1C]">
                          ₹{Number(entry.amount || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="p-3 text-right font-black text-sm text-[#006064]">
                          ₹{Number(entry.totalAmount || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                            {entry.clientStatus || 'Active'}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <button
                              onClick={() => setEntryToViewDetails(entry)}
                              className="p-1 text-xs text-neutral-600 hover:text-[#006064] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-neutral-100 w-full justify-center"
                              title="View full client master record"
                            >
                              <Eye size={12} /> View Record
                            </button>

                            {entry.isDispatchedToInvoices ? (
                              <button
                                disabled
                                className="px-2 py-1 bg-emerald-50 text-emerald-800 font-bold text-[9px] uppercase tracking-wider w-full flex items-center justify-center gap-1 opacity-90 cursor-not-allowed border border-emerald-300 shadow-xs"
                                title="This client entry is already present in the Invoices section for this month"
                              >
                                <CheckCircle2 size={10} className="text-emerald-600 shrink-0" /> Sent to Invoice
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDispatchToInvoices('MANUAL', [entry.id])}
                                disabled={dispatching}
                                className="px-2 py-1 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-blue-700 w-full flex items-center justify-center gap-1 shadow-xs"
                              >
                                <Send size={10} /> Send to Invoice
                              </button>
                            )}

                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => handleEditEntry(entry)}
                                className="p-1 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100"
                                title="Edit entry"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-1 text-neutral-500 hover:text-red-600 hover:bg-neutral-100"
                                title="Delete entry"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>

      {/* BIG POPUP MODAL: ADD CLIENT / EDIT CLIENT */}
      <AnimatePresence>
        {showAddClientModal && (
          <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-3 sm:p-6 pt-16 sm:pt-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white border border-[var(--outline-variant)] w-full max-w-5xl my-auto shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-white/10 flex items-center justify-center font-bold text-lg">
                    #{srNoDisplay}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {editingId ? `Edit Client Master Entry (#${srNoDisplay})` : 'Add New Client Master Entry'}
                    </h2>
                    <p className="text-xs text-white/80 font-light">
                      Enter company details, seating allocations, agreement parameters, and broker details below.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10 transition-colors"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Modal Form Scrollable Area */}
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8 overflow-y-auto flex-1 text-xs">
                {/* SECTION 1: Client ID & Broker Commission Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <Building2 size={16} className="text-[#006064]" /> 1. Client Identifier & Broker Details
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/60">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                        Client ID (Manual)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SSPACIA/AHD/CGM"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                        Broker Commission
                      </label>
                      <select
                        value={hasBrokerCommission ? 'YES' : 'NO'}
                        onChange={(e) => setHasBrokerCommission(e.target.value === 'YES')}
                        className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-bold"
                      >
                        <option value="NO">No</option>
                        <option value="YES">Yes</option>
                      </select>
                    </div>

                    {hasBrokerCommission && (
                      <>
                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                            Broker Commission (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 5.0"
                            value={brokerCommissionPercent}
                            onChange={(e) => setBrokerCommissionPercent(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-bold"
                          />
                        </div>

                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200 pt-3">
                          <div>
                            <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                              Invoice To Be Raised
                            </label>
                            <select
                              value={invoiceToBeRaised}
                              onChange={(e) => setInvoiceToBeRaised(e.target.value)}
                              className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-bold"
                            >
                              <option value="CLIENT">Client</option>
                              <option value="BROKER">Broker</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION 2: Head Office Address Format Improvement */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <MapPin size={16} className="text-[#006064]" /> 2. Head Office (HO) Address
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter company name..."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/60">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          Address Line 1
                        </label>
                        <input
                          type="text"
                          placeholder="Building, Suite, Street..."
                          value={hoAddressLine1}
                          onChange={(e) => setHoAddressLine1(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          placeholder="Landmark, Area..."
                          value={hoAddressLine2}
                          onChange={(e) => setHoAddressLine2(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ahmedabad"
                          value={hoCity}
                          onChange={(e) => setHoCity(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Gujarat"
                          value={hoState}
                          onChange={(e) => setHoState(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. India"
                          value={hoCountry}
                          onChange={(e) => setHoCountry(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                          Pin Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 380015"
                          value={hoPinCode}
                          onChange={(e) => setHoPinCode(e.target.value)}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: GST Registration Status */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <FileText size={16} className="text-[#006064]" /> 3. GST Registration Status & Attachment
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/60">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                        GST Registration Status
                      </label>
                      <select
                        value={gstStatus}
                        onChange={(e) => setGstStatus(e.target.value as 'REGISTERED' | 'UNREGISTERED')}
                        className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-bold"
                      >
                        <option value="UNREGISTERED">Unregistered</option>
                        <option value="REGISTERED">Registered</option>
                      </select>
                    </div>

                    {gstStatus === 'REGISTERED' && (
                      <>
                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                            GST Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 24AAACC1234H1ZD"
                            value={gstNo}
                            onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                            className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-mono uppercase font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold uppercase tracking-wider text-[#616161] mb-1.5">
                            Attach GST CERTIFICATE
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(e.target.files[0], 'GST');
                                }
                              }}
                              className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs"
                            />
                            {uploadingGstPdf && <Loader2 size={16} className="animate-spin text-[#006064]" />}
                          </div>
                          {gstPdfName && (
                            <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Attached: {gstPdfName}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION 4: Contact Persons Details & Validations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C]">
                      <Users size={16} className="text-[#006064]" /> 4. Contact Person(s) Details
                    </div>
                    <button
                      type="button"
                      onClick={handleAddContactPerson}
                      className="text-xs text-[#006064] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                    >
                      <UserPlus size={14} /> Add More Contact Person
                    </button>
                  </div>

                  <div className="space-y-3">
                    {contactPersons.map((cp, idx) => {
                      const isMobileValid = !cp.mobileNo || validateMobile(cp.mobileNo);
                      const isEmailValid = !cp.email || validateEmail(cp.email);

                      return (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 items-start"
                        >
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                              Contact Name #{idx + 1}
                            </label>
                            <input
                              type="text"
                              placeholder="Full name..."
                              value={cp.name}
                              onChange={(e) => handleUpdateContactPerson(idx, 'name', e.target.value)}
                              className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                              Designation
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Director, Manager..."
                              value={cp.designation}
                              onChange={(e) => handleUpdateContactPerson(idx, 'designation', e.target.value)}
                              className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                              Mobile No. (Exact 10 digits)
                            </label>
                            <input
                              type="text"
                              placeholder="10 digit number"
                              value={cp.mobileNo}
                              onChange={(e) => handleUpdateContactPerson(idx, 'mobileNo', e.target.value)}
                              className={`w-full bg-white border px-3 py-2 text-xs focus:outline-none font-mono ${
                                !isMobileValid ? 'border-red-500 bg-red-50/50' : 'border-[var(--outline-variant)] focus:border-[#006064]'
                              }`}
                            />
                            {!isMobileValid && (
                              <div className="text-[9px] text-red-600 font-bold mt-0.5">Must be exact 10 digits</div>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                              Email (@ required)
                            </label>
                            <input
                              type="email"
                              placeholder="email@domain.com"
                              value={cp.email}
                              onChange={(e) => handleUpdateContactPerson(idx, 'email', e.target.value)}
                              className={`w-full bg-white border px-3 py-2 text-xs focus:outline-none font-mono ${
                                !isEmailValid ? 'border-red-500 bg-red-50/50' : 'border-[var(--outline-variant)] focus:border-[#006064]'
                              }`}
                            />
                            {!isEmailValid && (
                              <div className="text-[9px] text-red-600 font-bold mt-0.5">Invalid email format</div>
                            )}
                          </div>

                          <div className="md:col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveContactPerson(idx)}
                              className="text-neutral-400 hover:text-red-600 p-1.5 transition-colors mt-4 md:mt-0"
                              title="Remove contact"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 5: Agreement Dates, Lock-in & Notice Terms (Includes Agreement PDF Attach option) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <Calendar size={16} className="text-[#006064]" /> 5. Agreement Dates, Lock-in & Notice Terms
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Agreement Start Date
                      </label>
                      <input
                        type="date"
                        value={agreementStartDate}
                        onChange={(e) => setAgreementStartDate(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Agreement End Date
                      </label>
                      <input
                        type="date"
                        value={agreementEndDate}
                        onChange={(e) => setAgreementEndDate(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Attach Agreement PDF
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0], 'AGREEMENT');
                            }
                          }}
                          className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs"
                        />
                        {uploadingAgreementPdf && <Loader2 size={16} className="animate-spin text-[#006064]" />}
                      </div>
                      {agreementPdfName && (
                        <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Attached: {agreementPdfName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Lock-in End Date
                      </label>
                      <input
                        type="date"
                        value={lockinEndDate}
                        onChange={(e) => setLockinEndDate(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Notice Period (Months)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2"
                        value={noticePeriodMonths}
                        onChange={(e) => setNoticePeriodMonths(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Notice Applicable
                      </label>
                      <select
                        value={noticePeriodApplicable}
                        onChange={(e) => setNoticePeriodApplicable(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
                      >
                        {NOTICE_APPLICABLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 6: Cabin, Seats, Rates & Billing Amounts (Multi-Product & Add More Products) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C]">
                      <DollarSign size={16} className="text-[#006064]" /> 6. Cabin, Seats, Rates & Billing Amounts
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(true)}
                        className="text-xs text-blue-700 font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                      >
                        <Sparkles size={14} /> Add Product Option
                      </button>

                      <button
                        type="button"
                        onClick={handleAddProductRow}
                        className="text-xs text-[#006064] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Add More Cabin / Product
                      </button>
                    </div>
                  </div>

                  {/* Product Rows */}
                  <div className="space-y-4">
                    {productRows.map((row, idx) => {
                      const isParking = isParkingProduct(row.cabinName);
                      const isDocCharges = isDocumentationChargesProduct(row.cabinName);
                      const seatsLabel = isParking ? 'No of Parking' : 'No of Seats';
                      const rateLabel = isParking ? 'Rate as per Agreement (₹)' : 'Rate per seat (₹)';
                      const amountLabel = isDocCharges ? 'Charges Amount (₹)' : isParking ? 'Amount (Parking * Rate)' : 'Amount (Seats * Rate)';

                      // Merge "Documentation Charges" into datalist options
                      const productOptions = availableProducts.includes('Documentation Charges')
                        ? availableProducts
                        : ['Documentation Charges', ...availableProducts];

                      return (
                        <div
                          key={idx}
                          className="bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/60 space-y-4 relative"
                        >
                          <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2">
                            <span className="font-bold text-xs uppercase text-[#006064]">
                              Item #{idx + 1} {isParking && <span className="ml-2 text-amber-700 text-[10px] bg-amber-100 px-1.5 py-0.5">Parking Mode</span>}
                              {isDocCharges && <span className="ml-2 text-purple-700 text-[10px] bg-purple-100 px-1.5 py-0.5">Documentation</span>}
                            </span>

                            {productRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProductRow(idx)}
                                className="text-neutral-400 hover:text-red-600 text-xs font-bold uppercase flex items-center gap-1"
                              >
                                <Trash2 size={13} /> Remove Item
                              </button>
                            )}
                          </div>

                          <div className={`grid grid-cols-1 ${isDocCharges ? 'md:grid-cols-4' : 'md:grid-cols-7'} gap-3 items-end`}>
                            <div className={isDocCharges ? '' : 'md:col-span-2'}>
                              <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                                Cabin Name / Product
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  list={`product-options-${idx}`}
                                  placeholder="Type or select product..."
                                  value={row.cabinName}
                                  onChange={(e) => handleUpdateProductRow(idx, 'cabinName', e.target.value)}
                                  className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-medium"
                                />
                                <datalist id={`product-options-${idx}`}>
                                  {productOptions.map((pName) => (
                                    <option key={pName} value={pName} />
                                  ))}
                                </datalist>
                              </div>
                            </div>

                            {/* No of Seats / Parking — hidden for Documentation Charges */}
                            {!isDocCharges && (
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                                  {seatsLabel}
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  placeholder={isParking ? 'No of parking...' : 'No of seats...'}
                                  value={row.noOfSeats}
                                  onChange={(e) =>
                                    handleUpdateProductRow(idx, 'noOfSeats', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold"
                                />
                              </div>
                            )}

                            {/* Rate — hidden for Documentation Charges */}
                            {!isDocCharges && (
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-[#616161] mb-1">
                                  {rateLabel}
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="Rate..."
                                  value={row.ratePerAgreement}
                                  onChange={(e) =>
                                    handleUpdateProductRow(idx, 'ratePerAgreement', e.target.value === '' ? '' : Number(e.target.value))
                                  }
                                  className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold text-right"
                                />
                              </div>
                            )}

                            {/* Amount */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[9px] font-bold uppercase text-[#616161]">
                                  {amountLabel}
                                </label>
                                {!isDocCharges && row.isAmountManuallyEdited && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetRowAmountAuto(idx)}
                                    className="text-[8px] text-[#006064] font-bold hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder={isDocCharges ? 'Doc charges...' : ''}
                                value={row.amount}
                                onChange={(e) =>
                                  handleUpdateProductRow(idx, 'amount', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-full bg-blue-50 border border-blue-200 px-3 py-2 text-xs focus:outline-none font-bold text-right text-blue-900"
                              />
                            </div>

                            {/* GST (%) */}
                            <div>
                              <label className="block text-[9px] font-bold uppercase text-[#616161] mb-1">
                                GST (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                placeholder="18"
                                value={row.gstPercent}
                                onChange={(e) =>
                                  handleUpdateProductRow(idx, 'gstPercent', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-full bg-amber-50 border border-amber-200 px-3 py-2 text-xs focus:outline-none font-bold text-right text-amber-900"
                              />
                            </div>

                            {/* Total Amt (Amt+GST) */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[9px] font-bold uppercase text-[#1B1C1C]">
                                  Total Amt (Amt+GST)
                                </label>
                                {row.isTotalAmountManuallyEdited && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetRowTotalAuto(idx)}
                                    className="text-[8px] text-[#006064] font-bold hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={row.totalAmount}
                                onChange={(e) =>
                                  handleUpdateProductRow(idx, 'totalAmount', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-full bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs focus:outline-none font-black text-right text-emerald-800"
                              />
                            </div>
                          </div>

                          {/* Item Payment Duration & Due Date Parameters */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-neutral-200/80 bg-white/60 p-2.5">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#006064] mb-1">
                                Payment Duration Type
                              </label>
                              <select
                                value={row.paymentDuration || 'MONTHLY'}
                                onChange={(e) => handleUpdateProductRow(idx, 'paymentDuration', e.target.value)}
                                className="w-full bg-white border border-[#006064]/30 px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold text-[#006064]"
                              >
                                <option value="MONTHLY">Monthly (1 Month)</option>
                                <option value="QUARTERLY">Quarterly (3 Months)</option>
                                <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                                <option value="YEARLY">Yearly (12 Months)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#006064] mb-1">
                                Payment Due Day (1 – 31)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                placeholder="e.g. 5 (5th of month)"
                                value={row.paymentDueDay ?? ''}
                                onChange={(e) =>
                                  handleUpdateProductRow(idx, 'paymentDueDay', e.target.value === '' ? '' : Number(e.target.value))
                                }
                                className="w-full bg-white border border-[#006064]/30 px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold text-[#1B1C1C]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase text-[#006064] mb-1">
                                First Payment Date (Optional)
                              </label>
                              <input
                                type="date"
                                value={row.firstPaymentDate || ''}
                                onChange={(e) => handleUpdateProductRow(idx, 'firstPaymentDate', e.target.value)}
                                className="w-full bg-white border border-[#006064]/30 px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-medium text-[#1B1C1C]"
                              />
                            </div>
                          </div>

                          {/* Extra Helper Tools: Prorate, Escalation Split, Separate Agreement */}
                          <div className="pt-2 border-t border-neutral-200/60 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeProratedRowIndex === idx) {
                                    setActiveProratedRowIndex(null);
                                  } else {
                                    setActiveProratedRowIndex(idx);
                                    const currentRate = row.ratePerAgreement !== '' && Number(row.ratePerAgreement) > 0
                                      ? Number(row.ratePerAgreement)
                                      : '';
                                    setProrateMonthlyRate(currentRate);
                                    setProrateSeats(row.noOfSeats !== '' && Number(row.noOfSeats) > 0 ? Number(row.noOfSeats) : 1);
                                    setProrateStartDate(new Date().toISOString().split('T')[0]);
                                  }
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-colors ${
                                  activeProratedRowIndex === idx
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                ⚡ Prorate Mid-Month Seats
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveEscalatedRowIndex(activeEscalatedRowIndex === idx ? null : idx);
                                  setEscSeats(row.noOfSeats || '');
                                  setEscOldRate(row.ratePerAgreement || '');
                                  setEscNewRate('');
                                  setEscDate(new Date().toISOString().split('T')[0]);
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-colors ${
                                  activeEscalatedRowIndex === idx
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-purple-50 text-purple-900 border border-purple-300 hover:bg-purple-100'
                                }`}
                              >
                                📈 Mid-Month Escalation Split
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateProductRow(idx, 'hasSeparateAgreement', !row.hasSeparateAgreement)
                                }
                                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1 transition-colors ${
                                  row.hasSeparateAgreement
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100'
                                }`}
                              >
                                📄 {row.hasSeparateAgreement ? 'Separate Agreement (Active)' : 'Attach Separate Agreement'}
                              </button>
                            </div>

                            {row.billingType && row.billingType !== 'REGULAR' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 uppercase">
                                Mode: {row.billingType}
                              </span>
                            )}
                          </div>

                          {/* Inline Prorate Calculator Drawer */}
                          {activeProratedRowIndex === idx && (() => {
                            const sCount = Number(prorateSeats) || 0;
                            const sRate = Number(prorateMonthlyRate) || 0;
                            const sDate = prorateStartDate || new Date().toISOString().split('T')[0];
                            const calc = calculateProratedAmount(sCount, sRate, sDate);
                            const baseSeats = Number(row.noOfSeats) || 0;
                            const baseRate = Number(row.ratePerAgreement) || sRate;
                            const baseAmt = (baseSeats > 0 && baseRate > 0) ? computeProductAmount(baseSeats, baseRate) : (Number(row.amount) || 0);
                            const combinedAmt = roundCurrency(baseAmt + calc.proratedSubtotal);
                            const combinedTotal = computeProductTotal(combinedAmt, 18);

                            return (
                              <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-3 shadow-xs">
                                <div className="flex items-center justify-between text-xs font-bold text-amber-950 uppercase">
                                  <span className="flex items-center gap-1.5">
                                    <span>⚡ Calculate Prorated Billing (Mid-Month Additions)</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveProratedRowIndex(null)}
                                    className="text-amber-800 hover:text-black font-bold p-0.5 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <p className="text-[11px] text-amber-900">
                                  Calculates exact pro-rata billing based on days remaining in the month.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                  <div>
                                    <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1">
                                      Addition Start Date
                                    </label>
                                    <input
                                      type="date"
                                      value={prorateStartDate}
                                      onChange={(e) => setProrateStartDate(e.target.value)}
                                      className="w-full bg-white border border-amber-400 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1">
                                      Seats Added (Extra)
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="e.g. 2"
                                      value={prorateSeats}
                                      onChange={(e) => setProrateSeats(e.target.value === '' ? '' : Number(e.target.value))}
                                      className="w-full bg-white border border-amber-400 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1">
                                      Rate Per Seat (₹/month)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="e.g. 300"
                                      value={prorateMonthlyRate}
                                      onChange={(e) => setProrateMonthlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                                      className="w-full bg-white border border-amber-400 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                </div>

                                {/* LIVE CALCULATION BREAKDOWN BOX */}
                                {sCount > 0 && sRate > 0 && (
                                  <div className="p-2.5 bg-amber-100/70 border border-amber-300/80 rounded text-xs text-amber-950 space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between font-bold text-[11px]">
                                      <span>
                                        Prorated for {calc.activeDays} of {calc.daysInMonth} days ({sCount} seats @ ₹{sRate}/seat):
                                      </span>
                                      <span className="font-mono text-emerald-800 text-sm font-black">
                                        ₹{calc.proratedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        <span className="text-[10px] text-gray-600 font-normal"> (+18% GST: ₹{calc.proratedTotal.toLocaleString('en-IN')})</span>
                                      </span>
                                    </div>
                                    {baseSeats > 0 && baseAmt > 0 && (
                                      <div className="text-[10px] text-amber-900 border-t border-amber-200 pt-1 flex items-center justify-between">
                                        <span>Existing {baseSeats} seats (₹{baseAmt.toLocaleString()}) + {sCount} Extra seats prorated (₹{calc.proratedSubtotal.toLocaleString()}):</span>
                                        <span className="font-bold text-emerald-900 font-mono">Combined Subtotal = ₹{combinedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ACTION BUTTONS */}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApplyProrateToRow(idx, 'ADD_NEW_ROW')}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Keeps current item intact and adds a new row for the extra prorated seats"
                                  >
                                    <span>➕ Add as Extra Prorated Row</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleApplyProrateToRow(idx, 'COMBINE_ROW')}
                                    className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-3.5 py-2 uppercase tracking-wider rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Combines base seats + extra prorated seats into this item"
                                  >
                                    <span>⚡ Combine into This Item</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleApplyProrateToRow(idx, 'REPLACE_ROW')}
                                    className="bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 font-bold text-xs px-3 py-2 uppercase tracking-wider rounded cursor-pointer"
                                    title="Replace entire item with only the prorated amount (e.g. for mid-month joining client)"
                                  >
                                    <span>Replace Item</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Inline Escalation Split Drawer */}
                          {activeEscalatedRowIndex === idx && (
                            <div className="p-3 bg-purple-50 border border-purple-300 rounded space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-purple-900 uppercase">
                                <span>📈 Mid-Month Escalation Rate Split (2 Rates in 1 Month)</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveEscalatedRowIndex(null)}
                                  className="text-purple-700 hover:text-purple-950 font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                              <p className="text-[11px] text-purple-800">
                                Computes split invoice: Pre-escalation days @ Old Rate + Post-escalation days @ New Rate.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">
                                    Escalation Date
                                  </label>
                                  <input
                                    type="date"
                                    value={escDate}
                                    onChange={(e) => setEscDate(e.target.value)}
                                    className="w-full bg-white border border-purple-300 px-2 py-1.5 text-xs font-bold text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">
                                    Seats
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Seats..."
                                    value={escSeats}
                                    onChange={(e) => setEscSeats(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-white border border-purple-300 px-2 py-1.5 text-xs font-bold text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">
                                    Old Rate (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Old rate..."
                                    value={escOldRate}
                                    onChange={(e) => setEscOldRate(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-white border border-purple-300 px-2 py-1.5 text-xs font-bold text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-purple-900 uppercase mb-0.5">
                                    New Rate (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="New rate..."
                                    value={escNewRate}
                                    onChange={(e) => setEscNewRate(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full bg-white border border-purple-300 px-2 py-1.5 text-xs font-bold text-black"
                                  />
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleApplyEscalationToRow(idx)}
                                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs py-2 uppercase tracking-wider rounded"
                                  >
                                    Apply Split Rate
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Separate Secondary Agreement Details Drawer */}
                          {row.hasSeparateAgreement && (
                            <div className="p-3 bg-teal-50 border border-teal-300 rounded space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-teal-900 uppercase">
                                <span>📄 Secondary / Expansion Agreement Details for Item #{idx + 1}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-900 uppercase mb-0.5">
                                    Agreement Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={row.agreementStartDate || ''}
                                    onChange={(e) => handleUpdateProductRow(idx, 'agreementStartDate', e.target.value)}
                                    className="w-full bg-white border border-teal-300 px-2 py-1.5 text-xs font-medium text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-900 uppercase mb-0.5">
                                    Agreement End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={row.agreementEndDate || ''}
                                    onChange={(e) => handleUpdateProductRow(idx, 'agreementEndDate', e.target.value)}
                                    className="w-full bg-white border border-teal-300 px-2 py-1.5 text-xs font-medium text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-900 uppercase mb-0.5">
                                    Lock-in End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={row.lockinEndDate || ''}
                                    onChange={(e) => handleUpdateProductRow(idx, 'lockinEndDate', e.target.value)}
                                    className="w-full bg-white border border-teal-300 px-2 py-1.5 text-xs font-medium text-black"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-teal-900 uppercase mb-0.5">
                                    Attach Agreement PDF
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleProductFileUpload(e.target.files[0], idx);
                                        }
                                      }}
                                      className="w-full bg-white border border-teal-300 px-2 py-1 text-xs text-black"
                                    />
                                    {uploadingProductAgrIdx === idx && (
                                      <Loader2 size={16} className="animate-spin text-teal-800" />
                                    )}
                                  </div>
                                  {row.agreementPdfName && (
                                    <div className="text-[10px] text-teal-800 font-bold mt-0.5 line-clamp-1">
                                      Attached: {row.agreementPdfName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand Total Summary Row */}
                  {(() => {
                    const grandAmount = productRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    const grandGst = productRows.reduce((sum, r) => {
                      const amt = Number(r.amount) || 0;
                      const gst = Number(r.gstPercent) || 0;
                      return sum + (amt * gst / 100);
                    }, 0);
                    const grandTotal = productRows.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
                    return (
                      <div className="bg-emerald-900 text-white p-4 border border-emerald-700 flex flex-wrap items-center justify-between gap-4">
                        <span className="font-black text-xs uppercase tracking-widest">Grand Total (All Items)</span>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-wider text-emerald-300 mb-0.5">Total Amount</div>
                            <div className="font-black text-sm">₹{roundCurrency(grandAmount).toLocaleString('en-IN')}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] uppercase tracking-wider text-emerald-300 mb-0.5">Total GST</div>
                            <div className="font-black text-sm">₹{roundCurrency(grandGst).toLocaleString('en-IN')}</div>
                          </div>
                          <div className="text-center bg-white/10 px-4 py-1.5 rounded">
                            <div className="text-[9px] uppercase tracking-wider text-emerald-200 mb-0.5">Grand Total</div>
                            <div className="font-black text-lg">₹{roundCurrency(grandTotal).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Escalation % & Escalation Applicable Date (Distinct Row) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Escalation %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 5.0"
                        value={escalationPercent}
                        onChange={(e) => setEscalationPercent(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Escalation Applicable Date
                      </label>
                      <input
                        type="date"
                        value={escalationApplicable}
                        onChange={(e) => setEscalationApplicable(e.target.value)}
                        className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 7: TDS Deduction Options */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <Percent size={16} className="text-[#006064]" /> 7. TDS Deduction & TAT Attachment
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/60">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1.5">
                        Will Client Deduct TDS?
                      </label>
                      <select
                        value={willDeductTds ? 'YES' : 'NO'}
                        onChange={(e) => setWillDeductTds(e.target.value === 'YES')}
                        className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-bold"
                      >
                        <option value="NO">No</option>
                        <option value="YES">Yes</option>
                      </select>
                    </div>

                    {willDeductTds && (
                      <>
                        <div>
                          <label className="block font-bold uppercase text-[#616161] mb-1.5">
                            TAT Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. MUMB12345F"
                            value={tanNo}
                            onChange={(e) => setTanNo(e.target.value.toUpperCase())}
                            className="w-full bg-white border border-[var(--outline-variant)] px-4 py-3 text-sm focus:outline-none focus:border-[#006064] font-mono uppercase font-bold"
                          />
                        </div>

                        <div>
                          <label className="block font-bold uppercase text-[#616161] mb-1.5">
                            Attach TAT CERTIFICATE
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(e.target.files[0], 'TDS');
                                }
                              }}
                              className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs"
                            />
                            {uploadingTdsPdf && <Loader2 size={16} className="animate-spin text-[#006064]" />}
                          </div>
                          {tdsPdfName && (
                            <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Attached: {tdsPdfName}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION 8: Security Deposit (SDR) & Payment Due Day */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1B1C1C] border-b border-neutral-200 pb-2">
                    <Shield size={16} className="text-[#006064]" /> 8. Security Deposit (SDR) & Payment Due Day
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        SDR Amount (Security Deposit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Security Deposit..."
                        value={sorAmount}
                        onChange={(e) => setSorAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold text-right"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        SDR Received Date
                      </label>
                      <input
                        type="date"
                        value={sorRecdDate}
                        onChange={(e) => setSorRecdDate(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Payment Due Day (1 to 31)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="e.g. 5 or 10"
                        value={paymentDueDay}
                        onChange={(e) => setPaymentDueDay(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Client Status
                      </label>
                      <select
                        value={clientStatus}
                        onChange={(e) => setClientStatus(e.target.value)}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      >
                        {CLIENT_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons Footer */}
                <div className="pt-6 border-t border-neutral-200 flex items-center justify-end gap-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    className="px-6 py-3 bg-[#F8F9FA] border border-[var(--outline-variant)] text-xs font-bold uppercase tracking-widest text-[#616161] hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-[#006064] text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving Client...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> {editingId ? 'Update Client Entry' : 'Confirm & Save to Master'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD NEW PRODUCT OPTION MODAL */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="font-bold text-sm uppercase text-[#1B1C1C] flex items-center gap-2">
                  <Sparkles size={16} className="text-[#006064]" /> Add New Product Option
                </h3>
                <button onClick={() => setShowAddProductModal(false)} className="text-neutral-400 hover:text-neutral-700">
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#616161] mb-1">
                  Product / Space Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Storage Space, Event Room, Special Cabin..."
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 border border-[var(--outline-variant)] text-xs font-bold uppercase text-[#616161]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddNewProductOption}
                  disabled={addingProduct}
                  className="px-5 py-2 bg-[#006064] text-white text-xs font-bold uppercase hover:bg-[#004D40] flex items-center gap-1.5"
                >
                  {addingProduct ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Product
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL RECORD VIEWER */}
      <AnimatePresence>
        {entryToViewDetails && (
          <div className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-3 sm:p-6 pt-16 sm:pt-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 sm:p-8 w-full max-w-4xl space-y-6 shadow-2xl my-auto max-h-[88vh] overflow-y-auto text-xs flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5">
                      SR.No #{entryToViewDetails.srNo}
                    </span>
                    <span className="font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5">
                      Status: {entryToViewDetails.clientStatus || 'Active'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1B1C1C] mt-1">
                    {entryToViewDetails.companyName}
                  </h3>
                  <p className="text-[#616161]">
                    Created by {entryToViewDetails.createdBy?.name || 'Community Manager'} on{' '}
                    {new Date(entryToViewDetails.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <button
                  onClick={() => setEntryToViewDetails(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Company & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                <div>
                  <div className="font-bold uppercase text-[#616161] text-[10px]">Head Office (HO) Address</div>
                  <div className="font-medium text-[#1B1C1C] mt-0.5">{entryToViewDetails.hoAddress || 'N/A'}</div>
                </div>
                <div>
                  <div className="font-bold uppercase text-[#616161] text-[10px]">Client ID</div>
                  <div className="font-mono font-bold text-[#1B1C1C] mt-0.5">{entryToViewDetails.clientId || 'N/A'}</div>
                </div>
                <div>
                  <div className="font-bold uppercase text-[#616161] text-[10px]">GST Status & Number</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">
                    {entryToViewDetails.gstStatus === 'REGISTERED' ? (
                      <span className="text-emerald-700">{entryToViewDetails.gstNo || 'Registered'}</span>
                    ) : (
                      <span className="text-neutral-500">Unregistered</span>
                    )}
                  </div>
                  {entryToViewDetails.gstPdfUrl && (
                    <a
                      href={entryToViewDetails.gstPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#006064] font-bold hover:underline flex items-center gap-1 mt-1"
                    >
                      <Download size={10} /> Download GST Certificate
                    </a>
                  )}
                </div>
              </div>

              {/* Broker Details */}
              {entryToViewDetails.hasBrokerCommission && (
                <div className="bg-amber-50 p-4 border border-amber-200 text-amber-900 space-y-1">
                  <div className="font-bold uppercase text-[10px]">Brokerage Commission Details</div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span>Commission %: {entryToViewDetails.brokerCommissionPercent ?? 0}%</span>
                    <span>Invoice To Be Raised: {entryToViewDetails.invoiceToBeRaised || 'CLIENT'}</span>
                  </div>
                </div>
              )}

              {/* Contact Persons */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
                  <Users size={14} className="text-[#006064]" /> Contact Person(s)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {entryToViewDetails.contactPersons?.map((cp, idx) => (
                    <div key={idx} className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 space-y-1">
                      <div className="font-bold text-[#1B1C1C] text-sm">{cp.name}</div>
                      {cp.designation && <div className="text-neutral-600">Designation: {cp.designation}</div>}
                      {cp.mobileNo && <div className="text-neutral-600 font-mono">Mobile: {cp.mobileNo}</div>}
                      {cp.email && <div className="text-neutral-600 font-mono">Email: {cp.email}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreement Dates & Terms */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
                  <Calendar size={14} className="text-[#006064]" /> Agreement Terms & Dates
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#616161]">Start Date</div>
                    <div className="font-bold mt-0.5">
                      {entryToViewDetails.agreementStartDate
                        ? new Date(entryToViewDetails.agreementStartDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#616161]">End Date</div>
                    <div className="font-bold mt-0.5">
                      {entryToViewDetails.agreementEndDate
                        ? new Date(entryToViewDetails.agreementEndDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#616161]">Lock-in End Date</div>
                    <div className="font-bold text-amber-800 mt-0.5">
                      {entryToViewDetails.lockinEndDate
                        ? new Date(entryToViewDetails.lockinEndDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#616161]">Notice Period</div>
                    <div className="font-bold mt-0.5">
                      {entryToViewDetails.noticePeriodMonths ? `${entryToViewDetails.noticePeriodMonths} months` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#616161]">Notice Applicable</div>
                    <div className="font-bold mt-0.5">{entryToViewDetails.noticePeriodApplicable || 'N/A'}</div>
                  </div>
                </div>

                {entryToViewDetails.agreementPdfUrl && (
                  <div className="pt-1">
                    <a
                      href={entryToViewDetails.agreementPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#006064] font-bold hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> Download Attached Agreement PDF ({entryToViewDetails.agreementPdfName || 'Agreement.pdf'})
                    </a>
                  </div>
                )}
              </div>

              {/* Cabins & Products Table */}
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
                  <DollarSign size={14} className="text-[#006064]" /> Cabin / Product Breakdown
                </h4>
                {entryToViewDetails.products && entryToViewDetails.products.length > 0 ? (
                  <table className="w-full border-collapse border border-[var(--outline-variant)]/60 text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FA] text-[#616161] uppercase text-[10px]">
                        <th className="p-2 border border-neutral-200">Cabin / Product</th>
                        <th className="p-2 border border-neutral-200 text-center">Seats / Parking</th>
                        <th className="p-2 border border-neutral-200 text-right">Rate (₹)</th>
                        <th className="p-2 border border-neutral-200 text-right">Amount (₹)</th>
                        <th className="p-2 border border-neutral-200 text-center">GST %</th>
                        <th className="p-2 border border-neutral-200 text-right">Total Amt (₹)</th>
                        <th className="p-2 border border-neutral-200 text-center">Duration</th>
                        <th className="p-2 border border-neutral-200 text-center">Due Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entryToViewDetails.products.map((p, i) => (
                        <tr key={i}>
                          <td className="p-2 border border-neutral-200 font-bold">{p.cabinName || 'N/A'}</td>
                          <td className="p-2 border border-neutral-200 text-center font-bold">{p.noOfSeats || 0}</td>
                          <td className="p-2 border border-neutral-200 text-right font-mono">₹{Number(p.ratePerAgreement || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-neutral-200 text-right font-mono">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-neutral-200 text-center">{p.gstPercent ?? 18}%</td>
                          <td className="p-2 border border-neutral-200 text-right font-mono font-bold text-[#006064]">₹{Number(p.totalAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-2 border border-neutral-200 text-center font-bold text-[#006064] text-[10px]">
                            {p.paymentDuration ? String(p.paymentDuration).replace('_', ' ') : 'MONTHLY'}
                          </td>
                          <td className="p-2 border border-neutral-200 text-center font-bold text-[10px]">
                            {p.paymentDueDay ? `${p.paymentDueDay}th` : 'Default'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60">
                      <div className="text-[10px] font-bold uppercase text-[#616161]">Cabin Name</div>
                      <div className="font-bold mt-0.5">{entryToViewDetails.cabinName || 'N/A'}</div>
                    </div>
                    <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60">
                      <div className="text-[10px] font-bold uppercase text-[#616161]">Seats & Rate</div>
                      <div className="font-bold mt-0.5">
                        {entryToViewDetails.noOfSeats || 0} seats @ ₹
                        {Number(entryToViewDetails.ratePerAgreement || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60">
                      <div className="text-[10px] font-bold uppercase text-[#616161]">Base Amount</div>
                      <div className="font-bold mt-0.5">
                        ₹{Number(entryToViewDetails.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60">
                      <div className="text-[10px] font-bold uppercase text-[#616161]">GST %</div>
                      <div className="font-bold mt-0.5">{entryToViewDetails.gstPercent ?? 18}%</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-300 p-3 text-emerald-900">
                      <div className="text-[10px] font-black uppercase">Total Amount</div>
                      <div className="font-black text-base text-emerald-800 mt-0.5">
                        ₹{Number(entryToViewDetails.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Escalation & Documentation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#616161]">Escalation %</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">{entryToViewDetails.escalationPercent ?? 0}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#616161]">Escalation Applicable Date</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">
                    {entryToViewDetails.escalationApplicable ? new Date(entryToViewDetails.escalationApplicable).toLocaleDateString('en-IN') : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#616161]">Documentation Charges</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">
                    ₹{Number(entryToViewDetails.documentationCharges || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* TDS & SDR Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                <div>
                  <div className="font-bold uppercase text-[#616161] text-[10px]">TDS Deduction & TAT</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">
                    {entryToViewDetails.willDeductTds ? (
                      <span className="text-blue-800">TDS Yes - TAT: {entryToViewDetails.tanNo || 'N/A'}</span>
                    ) : (
                      <span className="text-neutral-500">TDS Deduction No</span>
                    )}
                  </div>
                  {entryToViewDetails.tdsPdfUrl && (
                    <a
                      href={entryToViewDetails.tdsPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#006064] font-bold hover:underline flex items-center gap-1 mt-1"
                    >
                      <Download size={10} /> Download TAT Certificate
                    </a>
                  )}
                </div>

                <div>
                  <div className="font-bold uppercase text-[#616161] text-[10px]">Security Deposit (SDR) & Payment Due</div>
                  <div className="font-bold text-[#1B1C1C] mt-0.5">
                    Amount: ₹{Number(entryToViewDetails.sorAmount || 0).toLocaleString('en-IN')}
                  </div>
                  {entryToViewDetails.sorRecdDate && (
                    <div className="text-neutral-600 text-[10px]">
                      SDR Recd Date: {new Date(entryToViewDetails.sorRecdDate).toLocaleDateString('en-IN')}
                    </div>
                  )}
                  {entryToViewDetails.paymentDueDay && (
                    <div className="text-emerald-800 font-bold text-[10px] mt-0.5">
                      Payment Due Day: {entryToViewDetails.paymentDueDay} of month
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => handleDispatchToInvoices('MANUAL', [entryToViewDetails.id])}
                  disabled={dispatching}
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold uppercase tracking-wider hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Send size={14} /> Send Record to Invoices Section
                </button>

                <button
                  type="button"
                  onClick={() => setEntryToViewDetails(null)}
                  className="px-5 py-2.5 bg-[#F8F9FA] border border-[var(--outline-variant)] font-bold uppercase tracking-wider text-[#616161] hover:bg-neutral-100"
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
