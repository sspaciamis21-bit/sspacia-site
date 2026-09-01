'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
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
  Sparkles,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { ClientTerminationModal } from '@/components/admin/client-termination-modal';
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
  sdrAmount?: number | null;
  sdrRecdDate?: string | null;
  sdrPdfUrl?: string | null;
  sdrPdfName?: string | null;
  paymentDueDay?: number | null;
  clientStatus: string | null;
  isDispatchedToInvoices?: boolean;
  dispatchedMonths?: string[];
  targetBillingMonth?: string;
  createdAt: string;
  createdBy: { id: number; name: string; email: string; assignedLocations?: { location: LocationOption }[] };
  contactPersons: ContactPerson[];
  products?: ClientMasterProductItem[];
  termination?: {
    id: number;
    status: string;
    sorAmountHeld?: number | null;
    duesHeld?: number | null;
    tdsPending?: number | null;
    sdrRefundAmount?: number | null;
    isSdrRefundApplicable?: boolean;
    saApproval1At?: string | null;
    saApproval1Remarks?: string | null;
    closureFormSentAt?: string | null;
    signedClosureUploadedAt?: string | null;
    saApproval2At?: string | null;
    refundUtrNumber?: string | null;
  } | null;
}

function getTerminationStageInfo(status: string | null | undefined, termination?: any) {
  const termStatus = termination?.status || '';
  const s = status || '';

  if (s === 'Terminated' || termStatus === 'COMPLETED_TERMINATED') {
    return {
      label: 'Terminated',
      sublabel: 'Settlement Completed',
      bgClass: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
      badgeClass: 'bg-red-600 text-white',
      stepNum: 6,
      totalSteps: 6,
      isTerminating: true,
      isCompleted: true,
    };
  }

  if (s.includes('Accounts') || termStatus === 'IN_ACCOUNTS_QUEUE' || termStatus === 'SA_APPROVED_2') {
    return {
      label: 'In Accounts Queue',
      sublabel: 'Step 5/5: Refund Settlement',
      bgClass: 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100',
      badgeClass: 'bg-purple-700 text-white',
      stepNum: 5,
      totalSteps: 5,
      isTerminating: true,
      isCompleted: false,
    };
  }

  if (s.includes('Signed') || termStatus === 'SIGNED_FORM_UPLOADED') {
    return {
      label: 'Signed NOC Uploaded',
      sublabel: 'Step 4/5: Pending SA 2nd Approval',
      bgClass: 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100',
      badgeClass: 'bg-indigo-700 text-white',
      stepNum: 4,
      totalSteps: 5,
      isTerminating: true,
      isCompleted: false,
    };
  }

  if (s.includes('Closure') || termStatus === 'CLOSURE_FORM_SENT') {
    return {
      label: 'Closure Form Sent',
      sublabel: 'Step 3/5: Awaiting Signed Form',
      bgClass: 'bg-cyan-50 text-cyan-900 border-cyan-300 hover:bg-cyan-100',
      badgeClass: 'bg-cyan-700 text-white',
      stepNum: 3,
      totalSteps: 5,
      isTerminating: true,
      isCompleted: false,
    };
  }

  if (s.includes('SA 1st Approved') || termStatus === 'SA_APPROVED_1') {
    return {
      label: 'SA 1st Approved',
      sublabel: 'Step 2/5: Send Closure Form',
      bgClass: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
      badgeClass: 'bg-blue-700 text-white',
      stepNum: 2,
      totalSteps: 5,
      isTerminating: true,
      isCompleted: false,
    };
  }

  if (s.includes('Termination') || termStatus === 'PENDING_SA_APPROVAL_1' || termStatus) {
    return {
      label: 'Pending SA Approval',
      sublabel: 'Step 1/5: SA 1st Review',
      bgClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
      badgeClass: 'bg-amber-600 text-white',
      stepNum: 1,
      totalSteps: 5,
      isTerminating: true,
      isCompleted: false,
    };
  }

  return null;
}

const CLIENT_STATUS_OPTIONS = ['Active', 'Inactive', 'On Notice', 'Pending Renewal', 'Terminated'];
const NOTICE_APPLICABLE_OPTIONS = ['After Lock-in', 'Before Lock-in'];

export default function ClientMasterRegistryPage() {
  const { user, isRole } = useAuth();
  const { setIsSidebarOpen } = useSidebar();
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPER-ADMIN' || isRole('ADMIN');
  const isCommunityManager = isRole('COMMUNITY_MANAGER');
  const userEmail = user?.email?.toLowerCase() || '';
  const isAccountant =
    userEmail === 'ssinfrazone21@gmail.com' ||
    userRole === 'ACCOUNTS' ||
    userRole === 'ACCOUNTANT' ||
    user?.name?.toLowerCase() === 'accounts';

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

  // Target Billing Month for Invoices Dispatch
  const [selectedTargetMonth, setSelectedTargetMonth] = useState<string>(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    if (now.getDate() >= 20) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return `${monthNames[nextMonth.getMonth()]} ${nextMonth.getFullYear()}`;
    }
    return `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
  });

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchModalIds, setDispatchModalIds] = useState<number[]>([]);
  const [dispatchModalTargetMonth, setDispatchModalTargetMonth] = useState<string>(selectedTargetMonth);
  const [forceReDispatch, setForceReDispatch] = useState<boolean>(false);

  const monthOptions = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const list: string[] = [];
    const now = new Date();
    for (let i = -3; i <= 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      list.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }
    return list;
  }, []);

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
  const [applyEscalationToTotal, setApplyEscalationToTotal] = useState<boolean>(true);
  const [showExistingEscalationPrompt, setShowExistingEscalationPrompt] = useState<boolean>(false);

  // Multi-Product Row State
  const [productRows, setProductRows] = useState<ProductRow[]>([createEmptyProductRow()]);

  // Master product options list (Invoice Products)
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Unified Mid-Month Calculator State (Handles Point 4 Seat Additions & Point 8 Rate Escalations)
  const [activeMidMonthRowIndex, setActiveMidMonthRowIndex] = useState<number | null>(null);
  const [midMonthMode, setMidMonthMode] = useState<'ADDITION' | 'ESCALATION'>('ADDITION');
  const [prorateStartDate, setProrateStartDate] = useState('');
  const [prorateMonthlyRate, setProrateMonthlyRate] = useState<number | ''>('');
  const [prorateSeats, setProrateSeats] = useState<number | ''>('');

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

  // Security Deposit (SDR) & Payment Due
  const [sorAmount, setSorAmount] = useState<number | ''>('');
  const [sorRecdDate, setSorRecdDate] = useState('');
  const [sdrPdfUrl, setSdrPdfUrl] = useState('');
  const [sdrPdfName, setSdrPdfName] = useState('');
  const [uploadingSdrPdf, setUploadingSdrPdf] = useState(false);
  const [paymentDueDay, setPaymentDueDay] = useState<number | ''>('');
  const [clientStatus, setClientStatus] = useState('Active');

  // Termination Checklist Modal States
  const [showTerminationModal, setShowTerminationModal] = useState(false);
  const [clientForTermination, setClientForTermination] = useState<any>(null);

  // Custom Editable Prorated Amount
  const [prorateCustomAmount, setProrateCustomAmount] = useState<number | ''>('');

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
      if (selectedTargetMonth) {
        params.set('billingMonth', selectedTargetMonth);
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
  }, [isAdmin, selectedLocationFilter, selectedTargetMonth]);

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

  // Upload Handlers for GST, TDS, Agreement, and SDR Receipts (Stored in Database)
  const handleFileUpload = async (file: File, type: 'GST' | 'TDS' | 'AGREEMENT' | 'SDR') => {
    if (type === 'GST') setUploadingGstPdf(true);
    if (type === 'TDS') setUploadingTdsPdf(true);
    if (type === 'AGREEMENT') setUploadingAgreementPdf(true);
    if (type === 'SDR') setUploadingSdrPdf(true);

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
        } else if (type === 'SDR') {
          setSdrPdfUrl(json.data.fileUrl);
          setSdrPdfName(json.data.fileName);
          toast.success('SDR Receipt uploaded successfully');
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
      if (type === 'SDR') setUploadingSdrPdf(false);
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

    const finalProratedSubtotal = prorateCustomAmount !== '' ? Number(prorateCustomAmount) : result.proratedSubtotal;
    const finalProratedGst = roundCurrency((finalProratedSubtotal * 18) / 100);
    const finalProratedTotal = Math.round(finalProratedSubtotal + finalProratedGst);

    setProductRows((prev) => {
      const updated = [...prev];
      const targetRow = updated[idx];
      const existingName = (targetRow.cabinName || '').replace(/\s*\((?:Prorated|\+\d+\s+Seats|Mid-Month).*?\)/gi, '').trim() || 'Workspace';
      const existingSeats = Number(targetRow.noOfSeats) || 0;
      const existingRate = Number(targetRow.ratePerAgreement) || Number(prorateMonthlyRate);
      const existingBaseAmount = (existingSeats > 0 && existingRate > 0) ? computeProductAmount(existingSeats, existingRate) : (Number(targetRow.amount) || 0);

      if (mode === 'ADD_NEW_ROW') {
        // 1. Insert a dedicated new row for the extra prorated seats
        const newProratedRow: ProductRow = {
          ...createEmptyProductRow(),
          cabinName: `${existingName} - Mid-Month Addition: ${prorateSeats} Extra Seats (Prorated ${day}-${result.daysInMonth} ${monthName})`,
          noOfSeats: Number(prorateSeats),
          ratePerAgreement: Number(prorateMonthlyRate),
          amount: finalProratedSubtotal,
          gstPercent: 18,
          totalAmount: finalProratedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          extraSeatsCount: Number(prorateSeats),
          extraSeatsDate: prorateStartDate,
          paymentDuration: targetRow.paymentDuration || 'MONTHLY',
          paymentDueDay: targetRow.paymentDueDay ?? 5,
          firstPaymentDate: targetRow.firstPaymentDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        updated.splice(idx + 1, 0, newProratedRow);
        toast.success(`Added Mid-Month Extra Prorated Item: ₹${finalProratedSubtotal.toLocaleString()} (${result.activeDays} days for ${prorateSeats} seats)`);
      } else if (mode === 'COMBINE_ROW') {
        // 2. Combine base seats + extra prorated seats in the current item row
        const combinedSeats = existingSeats + Number(prorateSeats);
        const combinedAmount = roundCurrency(existingBaseAmount + finalProratedSubtotal);
        const combinedTotal = computeProductTotal(combinedAmount, 18);

        updated[idx] = {
          ...targetRow,
          cabinName: `${existingName} (${combinedSeats} Seats - includes ${prorateSeats} extra seats added on ${day} ${monthName})`,
          noOfSeats: combinedSeats,
          ratePerAgreement: existingRate,
          amount: combinedAmount,
          gstPercent: 18,
          totalAmount: combinedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          extraSeatsCount: Number(prorateSeats),
          extraSeatsDate: prorateStartDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        toast.success(`Updated Item: Base (₹${existingBaseAmount.toLocaleString()}) + Prorated Extra (₹${finalProratedSubtotal.toLocaleString()}) = ₹${combinedAmount.toLocaleString()}`);
      } else {
        // 3. Replace current item with only the prorated amount (e.g. for brand new mid-month joiner)
        updated[idx] = {
          ...targetRow,
          cabinName: `${existingName} (Prorated ${day}-${result.daysInMonth} ${monthName})`,
          noOfSeats: Number(prorateSeats),
          ratePerAgreement: Number(prorateMonthlyRate),
          amount: finalProratedSubtotal,
          gstPercent: 18,
          totalAmount: finalProratedTotal,
          billingType: 'PRORATED',
          proratedStartDate: prorateStartDate,
          extraSeatsCount: Number(prorateSeats),
          extraSeatsDate: prorateStartDate,
          isAmountManuallyEdited: true,
          isTotalAmountManuallyEdited: true,
        };
        toast.success(`Applied Prorated: ₹${finalProratedSubtotal.toLocaleString()} for ${result.activeDays} days`);
      }

      return updated;
    });

    setActiveMidMonthRowIndex(null);
    setProrateCustomAmount('');
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
    setActiveMidMonthRowIndex(null);
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
    setSdrPdfUrl('');
    setSdrPdfName('');
    setProrateCustomAmount('');
    setPaymentDueDay('');
    setClientStatus('Active');
    setApplyEscalationToTotal(true);
    setShowExistingEscalationPrompt(false);

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

    // For existing entries, keep original amounts unaltered by default and show the prompt if escalation exists
    if (entry.escalationPercent && Number(entry.escalationPercent) > 0) {
      setApplyEscalationToTotal(false);
      setShowExistingEscalationPrompt(true);
    } else {
      setApplyEscalationToTotal(true);
      setShowExistingEscalationPrompt(false);
    }

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

    setSorAmount(entry.sorAmount ?? entry.sdrAmount ?? '');
    setSorRecdDate(entry.sorRecdDate ? new Date(entry.sorRecdDate).toISOString().split('T')[0] : (entry.sdrRecdDate ? new Date(entry.sdrRecdDate).toISOString().split('T')[0] : ''));
    setSdrPdfUrl(entry.sdrPdfUrl || '');
    setSdrPdfName(entry.sdrPdfName || '');
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

    const rawAmount = productRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const effectiveEscPct = (applyEscalationToTotal && escalationPercent !== '' && Number(escalationPercent) > 0)
      ? Number(escalationPercent)
      : 0;

    const escalationAmount = effectiveEscPct > 0 ? roundCurrency((rawAmount * effectiveEscPct) / 100) : 0;
    const escalatedSubtotal = roundCurrency(rawAmount + escalationAmount);

    const grandGst = productRows.reduce((sum, r) => {
      const rowAmt = Number(r.amount) || 0;
      const rowEscAmt = effectiveEscPct > 0 ? (rowAmt * effectiveEscPct) / 100 : 0;
      const rowEscSubtotal = rowAmt + rowEscAmt;
      const gstPct = r.gstPercent !== '' ? Number(r.gstPercent) : 18;
      return sum + ((rowEscSubtotal * gstPct) / 100);
    }, 0);

    const finalGrandTotal = Math.round(escalatedSubtotal + grandGst);

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

      amount: effectiveEscPct > 0 ? escalatedSubtotal : rawAmount,
      totalAmount: effectiveEscPct > 0 ? finalGrandTotal : productRows.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0),

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
      sdrAmount: sorAmount !== '' ? Number(sorAmount) : null,
      sdrRecdDate: sorRecdDate || null,
      sdrPdfUrl: sdrPdfUrl || null,
      sdrPdfName: sdrPdfName || null,
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
  const handleOpenDispatchModal = (ids: number[] = [], force: boolean = false) => {
    setDispatchModalIds(ids);
    setDispatchModalTargetMonth(selectedTargetMonth);
    setForceReDispatch(force);
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = async () => {
    setDispatching(true);
    try {
      const res = await fetch('/api/admin/client-master/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendType: dispatchModalIds.length > 0 ? 'MANUAL' : 'AUTOMATIC_MONTH_END',
          clientMasterIds: dispatchModalIds,
          billingMonth: dispatchModalTargetMonth,
          forceReDispatch,
          locationId: selectedLocationFilter !== 'ALL' ? selectedLocationFilter : null,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`✅ ${json.message}`);
        setSelectedIds([]);
        setShowDispatchModal(false);
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

  const handleDispatchToInvoices = async (sendType: 'MANUAL' | 'AUTOMATIC_MONTH_END', ids: number[] = []) => {
    handleOpenDispatchModal(ids, false);
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
      {/* Auto-Dispatch Notice + Month Selection & Manual Button */}
      <FadeUp>
        <div className="bg-white border border-[var(--outline-variant)]/60 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-[#616161]">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Active client agreements generate monthly invoices. Auto-dispatched on month-end, or dispatch manually anytime.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-purple-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Target Month:</span>
              <select
                value={selectedTargetMonth}
                onChange={(e) => setSelectedTargetMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-purple-950 focus:outline-none cursor-pointer"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenDispatchModal([], false)}
              disabled={dispatching}
              className="px-3.5 py-1.5 bg-[var(--primary)] hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {dispatching ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Dispatch All Active to Invoices
            </button>
          </div>
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
                onClick={() => handleOpenDispatchModal(selectedIds, false)}
                disabled={dispatching}
                className="px-5 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md hover:bg-blue-700 cursor-pointer"
              >
                {dispatching ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Selected ({selectedIds.length}) to Invoices ({selectedTargetMonth.split(' ')[0]})
              </button>
            )}

            <Link
              href={isAdmin ? "/admin/client-master/terminations" : "/manager/client-master/terminations"}
              className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <FileSpreadsheet size={16} className="text-amber-200" />
              <span>Termination Checklist 📋</span>
            </Link>

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

              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1.5 border border-purple-200">
                <Calendar size={14} className="text-purple-700" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Billing Month:</span>
                <select
                  value={selectedTargetMonth}
                  onChange={(e) => setSelectedTargetMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-purple-950 focus:outline-none cursor-pointer"
                >
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

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
                          {(() => {
                            const termInfo = getTerminationStageInfo(entry.clientStatus, entry.termination);
                            if (termInfo) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClientForTermination(entry);
                                    setShowTerminationModal(true);
                                  }}
                                  className={`group inline-flex flex-col text-left px-2.5 py-1 text-[10px] font-bold rounded border cursor-pointer transition-all shadow-xs ${termInfo.bgClass}`}
                                  title="Click to view/manage termination progress"
                                >
                                  <div className="flex items-center gap-1">
                                    {termInfo.isCompleted ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                    ) : (
                                      <Clock size={10} className="text-amber-700 animate-pulse shrink-0" />
                                    )}
                                    <span className="uppercase tracking-wider font-extrabold">{termInfo.label}</span>
                                  </div>
                                  <span className="text-[9px] font-semibold opacity-90 mt-0.5 whitespace-nowrap">
                                    {termInfo.sublabel}
                                  </span>
                                </button>
                              );
                            }

                            if (entry.clientStatus === 'Inactive') {
                              return (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                                  Inactive
                                </span>
                              );
                            }

                            if (entry.clientStatus === 'On Notice') {
                              return (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                                  On Notice
                                </span>
                              );
                            }

                            if (entry.clientStatus === 'Pending Renewal') {
                              return (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                  Pending Renewal
                                </span>
                              );
                            }

                            return (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {entry.clientStatus || 'Active'}
                              </span>
                            );
                          })()}
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
                              <div className="w-full flex flex-col gap-1">
                                <span
                                  className="px-2 py-1 bg-emerald-50 text-emerald-800 font-bold text-[9px] uppercase tracking-wider w-full flex items-center justify-center gap-1 border border-emerald-300 shadow-2xs"
                                  title={`Invoice for ${entry.companyName} has been generated for ${selectedTargetMonth}`}
                                >
                                  <CheckCircle2 size={10} className="text-emerald-600 shrink-0" /> Sent for {selectedTargetMonth.split(' ')[0]}
                                </span>
                                <button
                                  onClick={() => handleOpenDispatchModal([entry.id], true)}
                                  disabled={dispatching}
                                  className="text-[9px] text-blue-700 hover:text-blue-900 font-bold uppercase tracking-wider underline text-center cursor-pointer"
                                >
                                  + Re-dispatch
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenDispatchModal([entry.id])}
                                disabled={dispatching}
                                className="px-2 py-1.5 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider hover:bg-blue-700 w-full flex items-center justify-center gap-1 shadow-xs cursor-pointer"
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
                                  if (activeMidMonthRowIndex === idx) {
                                    setActiveMidMonthRowIndex(null);
                                  } else {
                                    setActiveMidMonthRowIndex(idx);
                                    const currentRate = row.ratePerAgreement !== '' && Number(row.ratePerAgreement) > 0
                                      ? Number(row.ratePerAgreement)
                                      : '';
                                    const currentSeats = row.noOfSeats !== '' && Number(row.noOfSeats) > 0 ? Number(row.noOfSeats) : 1;
                                    const today = new Date().toISOString().split('T')[0];

                                    setProrateMonthlyRate(currentRate);
                                    setProrateSeats(currentSeats);
                                    setProrateStartDate(today);
                                    setProrateCustomAmount('');

                                    setEscSeats(currentSeats);
                                    setEscOldRate(currentRate);
                                    setEscNewRate('');
                                    setEscDate(today);
                                  }
                                }}
                                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-1.5 transition-colors ${
                                  activeMidMonthRowIndex === idx
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100'
                                }`}
                                title="Calculate mid-month seat additions (Point 4) or mid-month rate escalation split (Point 8)"
                              >
                                <span>⚡ Mid-Month Seat & Rate Calculator</span>
                                {activeMidMonthRowIndex === idx && <span className="text-[9px]">▲</span>}
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

                          {/* Unified Mid-Month Seat & Rate Calculator Drawer */}
                          {activeMidMonthRowIndex === idx && (() => {
                            const sCount = Number(prorateSeats) || 0;
                            const sRate = Number(prorateMonthlyRate) || 0;
                            const sDate = prorateStartDate || new Date().toISOString().split('T')[0];
                            const calc = calculateProratedAmount(sCount, sRate, sDate);
                            const effectiveProratedSubtotal = prorateCustomAmount !== '' ? Number(prorateCustomAmount) : calc.proratedSubtotal;
                            const effectiveProratedGst = roundCurrency((effectiveProratedSubtotal * 18) / 100);
                            const effectiveProratedTotal = Math.round(effectiveProratedSubtotal + effectiveProratedGst);

                            const baseSeats = Number(row.noOfSeats) || 0;
                            const baseRate = Number(row.ratePerAgreement) || sRate;
                            const baseAmt = (baseSeats > 0 && baseRate > 0) ? computeProductAmount(baseSeats, baseRate) : (Number(row.amount) || 0);
                            const combinedAmt = roundCurrency(baseAmt + effectiveProratedSubtotal);

                            const escResult = (escOldRate && escNewRate && escDate && escSeats)
                              ? calculateEscalatedSplit(Number(escSeats), Number(escOldRate), Number(escNewRate), escDate)
                              : null;

                            return (
                              <div className="p-3.5 bg-amber-50/80 border-2 border-amber-400 rounded-lg space-y-3 shadow-xs">
                                {/* Header & Mode Tabs */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase">
                                    <span>⚡ Mid-Month Adjustments (Item #{idx + 1})</span>
                                  </div>

                                  <div className="flex items-center gap-1 bg-white p-1 rounded border border-amber-300 shadow-xs self-start sm:self-auto">
                                    <button
                                      type="button"
                                      onClick={() => setMidMonthMode('ADDITION')}
                                      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${
                                        midMonthMode === 'ADDITION'
                                          ? 'bg-amber-600 text-white shadow-xs'
                                          : 'text-amber-900 hover:bg-amber-50'
                                      }`}
                                    >
                                      ⚡ Point 4: Mid-Month Added Seats (Prorated)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setMidMonthMode('ESCALATION')}
                                      className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors cursor-pointer ${
                                        midMonthMode === 'ESCALATION'
                                          ? 'bg-purple-700 text-white shadow-xs'
                                          : 'text-purple-900 hover:bg-purple-50'
                                      }`}
                                    >
                                      📈 Point 8: Mid-Month Rate Escalation (2 Rates)
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMidMonthRowIndex(null);
                                      setProrateCustomAmount('');
                                    }}
                                    className="text-amber-800 hover:text-black font-bold p-1 cursor-pointer self-end sm:self-center"
                                    title="Close calculator"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* MODE 1: POINT 4 - MID-MONTH ADDED SEATS */}
                                {midMonthMode === 'ADDITION' && (
                                  <div className="space-y-3">
                                    <p className="text-[11px] text-amber-900 leading-relaxed">
                                      <strong>Point 4 Workflow:</strong> If seats are added in the middle of the month, calculate pro-rata billing for remaining days. You can add a dedicated extra prorated row (for separate first invoice) or combine into this item.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
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
                                      <div>
                                        <label className="block text-[10px] font-bold text-amber-950 uppercase mb-1 flex items-center justify-between">
                                          <span>Prorated Amount (₹)</span>
                                          <span className="text-[9px] text-amber-800 font-normal lowercase">(editable)</span>
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          placeholder={`₹${calc.proratedSubtotal || '0.00'}`}
                                          value={prorateCustomAmount !== '' ? prorateCustomAmount : (calc.proratedSubtotal > 0 ? calc.proratedSubtotal : '')}
                                          onChange={(e) => setProrateCustomAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                          className="w-full bg-white border border-amber-400 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-right"
                                        />
                                      </div>
                                    </div>

                                    {/* LIVE CALCULATION BREAKDOWN BOX */}
                                    {sCount > 0 && sRate > 0 && (
                                      <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded text-xs text-amber-950 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between font-bold text-[11px]">
                                          <span>
                                            Prorated for {calc.activeDays} of {calc.daysInMonth} days ({sCount} seats @ ₹{sRate}/seat):
                                          </span>
                                          <span className="font-mono text-emerald-800 text-sm font-black">
                                            ₹{effectiveProratedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            <span className="text-[10px] text-gray-600 font-normal"> (+18% GST: ₹{effectiveProratedTotal.toLocaleString('en-IN')})</span>
                                          </span>
                                        </div>
                                        {baseSeats > 0 && baseAmt > 0 && (
                                          <div className="text-[10px] text-amber-900 border-t border-amber-200 pt-1 flex items-center justify-between">
                                            <span>Existing {baseSeats} seats (₹{baseAmt.toLocaleString()}) + {sCount} Extra seats prorated (₹{effectiveProratedSubtotal.toLocaleString()}):</span>
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
                                        title="Keeps current item intact and adds a dedicated row for the extra prorated seats (Generates 1st separate invoice)"
                                      >
                                        <span>➕ Add as Dedicated Extra Prorated Row</span>
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
                                        title="Replace entire item with only the prorated amount (e.g. for brand new mid-month joining client)"
                                      >
                                        <span>Replace Item</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* MODE 2: POINT 8 - MID-MONTH RATE ESCALATION SPLIT */}
                                {midMonthMode === 'ESCALATION' && (
                                  <div className="space-y-3 bg-purple-50/70 p-3 rounded border border-purple-200">
                                    <p className="text-[11px] text-purple-900 leading-relaxed">
                                      <strong>Point 8 Workflow:</strong> If rate escalation applies in the middle of the month, computes a 2-rate split on the same month: Pre-escalation days @ Old Rate + Post-escalation days @ New Rate.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                      <div>
                                        <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">
                                          Escalation Date
                                        </label>
                                        <input
                                          type="date"
                                          value={escDate}
                                          onChange={(e) => setEscDate(e.target.value)}
                                          className="w-full bg-white border border-purple-300 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">
                                          Seats Affected
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          placeholder="Seats..."
                                          value={escSeats}
                                          onChange={(e) => setEscSeats(e.target.value === '' ? '' : Number(e.target.value))}
                                          className="w-full bg-white border border-purple-300 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">
                                          Old Rate (₹/seat)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="Old rate..."
                                          value={escOldRate}
                                          onChange={(e) => setEscOldRate(e.target.value === '' ? '' : Number(e.target.value))}
                                          className="w-full bg-white border border-purple-300 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-purple-950 uppercase mb-1">
                                          New Escalated Rate (₹/seat)
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          placeholder="New rate..."
                                          value={escNewRate}
                                          onChange={(e) => setEscNewRate(e.target.value === '' ? '' : Number(e.target.value))}
                                          className="w-full bg-white border border-purple-300 px-2.5 py-1.5 text-xs font-bold text-black rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                      </div>
                                    </div>

                                    {/* Live Breakdown Box */}
                                    {escResult && (
                                      <div className="p-2.5 bg-purple-100/90 border border-purple-300 rounded text-xs text-purple-950 space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between font-bold text-[11px]">
                                          <span>
                                            Split Calculation: {escResult.preDays} days @ ₹{escOldRate} (₹{escResult.preAmount.toLocaleString()}) + {escResult.postDays} days @ ₹{escNewRate} (₹{escResult.postAmount.toLocaleString()})
                                          </span>
                                          <span className="font-mono text-purple-950 text-sm font-black">
                                            Total Subtotal = ₹{escResult.totalSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            <span className="text-[10px] text-gray-700 font-normal"> (+18% GST: ₹{escResult.grandTotal.toLocaleString('en-IN')})</span>
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="flex items-center gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleApplyEscalationToRow(idx)}
                                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2 uppercase tracking-wider rounded flex items-center gap-1.5 shadow-xs cursor-pointer"
                                      >
                                        <span>📈 Apply 2-Rate Escalation Split to Item</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

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

                  {/* Grand Total Summary Row with Real-Time Escalation Breakdown */}
                  {(() => {
                    const rawAmount = productRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    const effectiveEscPct = (applyEscalationToTotal && escalationPercent !== '' && Number(escalationPercent) > 0)
                      ? Number(escalationPercent)
                      : 0;

                    const escalationAmount = effectiveEscPct > 0 ? roundCurrency((rawAmount * effectiveEscPct) / 100) : 0;
                    const escalatedSubtotal = roundCurrency(rawAmount + escalationAmount);

                    const grandGst = productRows.reduce((sum, r) => {
                      const rowAmt = Number(r.amount) || 0;
                      const rowEscAmt = effectiveEscPct > 0 ? (rowAmt * effectiveEscPct) / 100 : 0;
                      const rowEscSubtotal = rowAmt + rowEscAmt;
                      const gstPct = r.gstPercent !== '' ? Number(r.gstPercent) : 18;
                      return sum + ((rowEscSubtotal * gstPct) / 100);
                    }, 0);

                    const finalGrandTotal = Math.round(escalatedSubtotal + grandGst);

                    return (
                      <div className="bg-emerald-900 text-white p-4 border border-emerald-700 space-y-3 rounded-xs shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-xs uppercase tracking-widest">Grand Total (All Items)</span>
                            {effectiveEscPct > 0 ? (
                              <span className="px-2 py-0.5 bg-amber-400 text-amber-950 text-[10px] font-black uppercase rounded shadow-2xs">
                                +{effectiveEscPct}% Escalation Applied Pre-GST
                              </span>
                            ) : (
                              (escalationPercent !== '' && Number(escalationPercent) > 0) && (
                                <span className="px-2 py-0.5 bg-neutral-700 text-neutral-300 text-[10px] font-bold uppercase rounded">
                                  Escalation ({escalationPercent}%) Unapplied (Original Data Kept)
                                </span>
                              )
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                            <div className="text-center">
                              <div className="text-[9px] uppercase tracking-wider text-emerald-300 mb-0.5">
                                {effectiveEscPct > 0 ? 'Base Amount' : 'Total Amount'}
                              </div>
                              <div className="font-bold text-xs sm:text-sm font-mono">₹{roundCurrency(rawAmount).toLocaleString('en-IN')}</div>
                            </div>

                            {effectiveEscPct > 0 && (
                              <div className="text-center bg-emerald-800/80 px-2.5 py-1 rounded border border-emerald-600/60">
                                <div className="text-[9px] uppercase tracking-wider text-amber-300 mb-0.5">+{effectiveEscPct}% Escalation</div>
                                <div className="font-black text-xs sm:text-sm text-amber-200 font-mono">+₹{roundCurrency(escalationAmount).toLocaleString('en-IN')}</div>
                              </div>
                            )}

                            {effectiveEscPct > 0 && (
                              <div className="text-center">
                                <div className="text-[9px] uppercase tracking-wider text-emerald-300 mb-0.5">Escalated Subtotal</div>
                                <div className="font-bold text-xs sm:text-sm font-mono">₹{roundCurrency(escalatedSubtotal).toLocaleString('en-IN')}</div>
                              </div>
                            )}

                            <div className="text-center">
                              <div className="text-[9px] uppercase tracking-wider text-emerald-300 mb-0.5">Total GST (18%)</div>
                              <div className="font-bold text-xs sm:text-sm font-mono">₹{roundCurrency(grandGst).toLocaleString('en-IN')}</div>
                            </div>

                            <div className="text-center bg-white/15 px-3.5 py-1.5 rounded border border-white/30 shadow-inner">
                              <div className="text-[9px] uppercase tracking-wider text-emerald-200 mb-0.5">Grand Total</div>
                              <div className="font-black text-base sm:text-lg font-mono">₹{roundCurrency(finalGrandTotal).toLocaleString('en-IN')}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Escalation % & Escalation Applicable Date (Distinct Row) */}
                  {(() => {
                    const rawAmount = productRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                    const parsedEscPct = escalationPercent !== '' ? Number(escalationPercent) : 0;
                    const previewEscAmount = parsedEscPct > 0 ? roundCurrency((rawAmount * parsedEscPct) / 100) : 0;

                    return (
                      <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-bold uppercase text-[#616161]">
                                Global Escalation % (Applies Pre-GST)
                              </label>
                              {parsedEscPct > 0 && (
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.2 rounded border border-purple-200">
                                  +₹{previewEscAmount.toLocaleString('en-IN')} on Subtotal
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="e.g. 5.0"
                              value={escalationPercent}
                              onChange={(e) => {
                                setEscalationPercent(e.target.value === '' ? '' : Number(e.target.value));
                                if (!editingId) {
                                  setApplyEscalationToTotal(true);
                                }
                              }}
                              className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2.5 text-xs focus:outline-none focus:border-[#006064] font-bold"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                              Applied once across all items before GST calculation.
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-[#616161] mb-1">
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

                        {/* EXISTING ENTRY NOTIFICATION PROMPT / BANNER */}
                        {showExistingEscalationPrompt && editingId && escalationPercent !== '' && Number(escalationPercent) > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                              <div>
                                <div className="font-bold">Apply {escalationPercent}% Escalation to Final Amount?</div>
                                <div className="text-[10px] text-amber-800">
                                  This existing client master record has an escalation of {escalationPercent}%. {applyEscalationToTotal ? 'Escalation is currently active and applied to the final grand total.' : 'Existing saved totals are currently kept unaltered.'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setApplyEscalationToTotal(!applyEscalationToTotal);
                                  toast.success(applyEscalationToTotal ? 'Kept original amounts unaltered' : `Applied ${escalationPercent}% escalation to final amount!`);
                                }}
                                className={`px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs ${
                                  applyEscalationToTotal
                                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                    : 'bg-amber-600 text-white hover:bg-amber-700'
                                }`}
                              >
                                {applyEscalationToTotal ? '✓ Escalation Applied (Click to Revert)' : '⚡ Apply Escalation % to Final Amount'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        SDR Amount (Deposit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Security Deposit..."
                        value={sorAmount}
                        onChange={(e) => setSorAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold text-right"
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
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    {/* SDR RECEIPT ATTACHMENT */}
                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1 flex items-center justify-between">
                        <span>Attach SDR Receipt</span>
                        {sdrPdfName && <span className="text-emerald-700 text-[10px] lowercase font-normal truncate max-w-[90px]">({sdrPdfName})</span>}
                      </label>
                      {sdrPdfUrl ? (
                        <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 border border-emerald-300 rounded text-xs min-h-[38px]">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <a
                            href={sdrPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-emerald-800 hover:underline truncate flex-1 text-[11px]"
                            title="Click to view SDR receipt"
                          >
                            {sdrPdfName || 'View Receipt'}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setSdrPdfUrl('');
                              setSdrPdfName('');
                            }}
                            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                            title="Remove SDR receipt"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            id="sdr-receipt-file-input"
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 50 * 1024 * 1024) {
                                  toast.error('File size exceeds 50MB limit.');
                                  return;
                                }
                                handleFileUpload(file, 'SDR');
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="sdr-receipt-file-input"
                            className={`w-full py-2 px-2.5 border border-dashed border-neutral-300 bg-[#F8F9FA] hover:bg-neutral-100 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-neutral-700 transition-colors min-h-[38px] ${
                              uploadingSdrPdf ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploadingSdrPdf ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-[#006064]" />
                                <span className="text-[11px]">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip size={13} className="text-[#006064]" />
                                <span className="text-[11px]">Attach SDR Receipt</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold uppercase text-[#616161] mb-1">
                        Client Status
                      </label>
                      <select
                        value={clientStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Terminated') {
                            if (editingId) {
                              const found = entries.find((en) => en.id === editingId);
                              if (found) {
                                setShowAddClientModal(false);
                                setClientForTermination(found);
                                setShowTerminationModal(true);
                                return;
                              }
                            } else {
                              toast.info('Please save the client entry before initiating the termination checklist.');
                              return;
                            }
                          }
                          setClientStatus(val);
                        }}
                        className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs focus:outline-none focus:border-[#006064] font-bold"
                      >
                        {CLIENT_STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                        {clientStatus && !CLIENT_STATUS_OPTIONS.includes(clientStatus) && (
                          <option value={clientStatus}>
                            {clientStatus}
                          </option>
                        )}
                      </select>

                      {(() => {
                        if (!editingId) return null;
                        const found = entries.find((e) => e.id === editingId);
                        const termInfo = getTerminationStageInfo(clientStatus, found?.termination);
                        if (!termInfo) return null;

                        return (
                          <div className={`mt-2 p-2.5 border rounded text-[11px] flex items-center justify-between gap-2 shadow-xs ${termInfo.bgClass}`}>
                            <div className="flex items-center gap-1.5 font-medium">
                              {termInfo.isCompleted ? (
                                <AlertTriangle size={13} className="text-red-700 shrink-0" />
                              ) : (
                                <Clock size={13} className="text-amber-700 shrink-0 animate-pulse" />
                              )}
                              <div>
                                <div className="font-extrabold uppercase tracking-wide">
                                  {termInfo.label}
                                </div>
                                <div className="text-[10px] opacity-90 font-semibold">
                                  {termInfo.sublabel}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (found) {
                                  setShowAddClientModal(false);
                                  setClientForTermination(found);
                                  setShowTerminationModal(true);
                                }
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold text-white bg-[#006064] hover:bg-[#004d40] rounded uppercase tracking-wider cursor-pointer shrink-0 shadow-xs"
                            >
                              Open Live Checklist 📋
                            </button>
                          </div>
                        );
                      })()}
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
                    {(() => {
                      const termInfo = getTerminationStageInfo(entryToViewDetails.clientStatus, entryToViewDetails.termination);
                      if (termInfo) {
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded ${termInfo.bgClass}`}>
                              {termInfo.label} • {termInfo.sublabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const ent = entryToViewDetails;
                                setEntryToViewDetails(null);
                                setClientForTermination(ent);
                                setShowTerminationModal(true);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold text-white bg-[#006064] hover:bg-[#004d40] rounded uppercase tracking-wider shadow-xs cursor-pointer"
                            >
                              Open Checklist 📋
                            </button>
                          </div>
                        );
                      }
                      return (
                        <span className="font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5">
                          Status: {entryToViewDetails.clientStatus || 'Active'}
                        </span>
                      );
                    })()}
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
                    Amount: ₹{Number(entryToViewDetails.sorAmount || entryToViewDetails.sdrAmount || 0).toLocaleString('en-IN')}
                  </div>
                  {(entryToViewDetails.sorRecdDate || entryToViewDetails.sdrRecdDate) && (
                    <div className="text-neutral-600 text-[10px]">
                      SDR Recd Date: {new Date(entryToViewDetails.sorRecdDate || entryToViewDetails.sdrRecdDate || '').toLocaleDateString('en-IN')}
                    </div>
                  )}
                  {entryToViewDetails.sdrPdfUrl && (
                    <a
                      href={entryToViewDetails.sdrPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#006064] font-bold hover:underline flex items-center gap-1 mt-1"
                    >
                      <Paperclip size={10} /> View SDR Receipt ({entryToViewDetails.sdrPdfName || 'Document'})
                    </a>
                  )}
                  {entryToViewDetails.paymentDueDay && (
                    <div className="text-emerald-800 font-bold text-[10px] mt-0.5">
                      Master Due Day: {entryToViewDetails.paymentDueDay} of month
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    const id = entryToViewDetails.id;
                    setEntryToViewDetails(null);
                    handleOpenDispatchModal([id], false);
                  }}
                  disabled={dispatching}
                  className="px-5 py-2.5 bg-blue-600 text-white font-bold uppercase tracking-wider hover:bg-blue-700 flex items-center gap-1.5 cursor-pointer"
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

      {/* DISPATCH CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDispatchModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-[var(--outline-variant)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-[#1B1C1C]"
            >
              <div className="px-6 py-4 bg-[#006064] text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Send size={18} className="text-amber-300" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Dispatch Invoices to Billing Pipeline
                  </h3>
                </div>
                <button
                  onClick={() => setShowDispatchModal(false)}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-purple-50 p-4 border border-purple-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 mb-1.5">
                    Select Target Billing Month:
                  </label>
                  <select
                    value={dispatchModalTargetMonth}
                    onChange={(e) => setDispatchModalTargetMonth(e.target.value)}
                    className="w-full bg-white border border-purple-300 p-2 text-sm font-bold text-gray-900 focus:outline-none focus:border-[#006064]"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-purple-700 mt-1.5 font-medium">
                    Invoice records will be created in the Invoices section under <span className="font-bold">{dispatchModalTargetMonth}</span>.
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 border border-neutral-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Clients to Dispatch:</span>
                    <span className="font-bold text-gray-900">
                      {dispatchModalIds.length > 0 ? `${dispatchModalIds.length} Selected Clients` : `${kpis.activeClients} Active Clients`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Agreement Value Sum:</span>
                    <span className="font-bold text-[#006064]">
                      ₹{kpis.totalRev.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Mode:</span>
                    <span className="font-bold text-gray-900">
                      {forceReDispatch ? 'Force Re-dispatch (Allow duplicate month entry)' : 'Standard (Duplicate-Safe)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setShowDispatchModal(false)}
                    disabled={dispatching}
                    className="px-4 py-2 border border-neutral-300 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDispatch}
                    disabled={dispatching}
                    className="px-5 py-2 bg-[#006064] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#004d40] flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {dispatching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Confirm & Dispatch Invoices 🚀</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CLIENT TERMINATION CHECKLIST MODAL ── */}
      {clientForTermination && (
        <ClientTerminationModal
          isOpen={showTerminationModal}
          onClose={() => {
            setShowTerminationModal(false);
            setClientForTermination(null);
          }}
          client={clientForTermination}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}
