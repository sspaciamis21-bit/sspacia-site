'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  FileText,
  Trash2,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  X,
  Filter,
  RefreshCw,
  Receipt,
  Send,
  Upload,
  Eye,
  UserCheck,
  Calculator,
  FileCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Paperclip,
  Shield,
  Download,
  Tag,
  Edit2,
  PenTool,
  CheckCheck,
  Award,
  DollarSign,
  AlertOctagon,
  Sparkles,
  FolderArchive,
  Package,
  Plus,
  Sliders,
  Scissors
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { useAuth } from '@/context/AuthContext';
import { OldInvoicesArchive } from '@/components/admin/old-invoices-archive';

interface AttachedInvoice {
  id: number;
  invoiceRecordId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
}

interface ContactPerson {
  id?: number;
  name: string;
  designation: string;
  mobileNo: string;
  email: string;
}

interface InvoiceSplitGroup {
  id: string;
  name: string;
  productIndices: number[];
  noOfSeats: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  startDate?: string;
  endDate?: string;
  paymentDueDay?: number | string;
  dueDate?: string;
  attachedInvoice?: {
    fileName: string;
    fileUrl: string;
    fileSize?: number | null;
    uploadedAt?: string;
  } | null;
}

interface LocationOption {
  id: number;
  name: string;
}

interface InvoiceRecord {
  id: number;
  clientMasterId: number;
  srNo: number;
  companyName: string;
  cabinName: string | null;
  noOfSeats: number | null;
  ratePerAgreement: number | null;
  amount: number | null;
  gstPercent: number | null;
  totalAmount: number | null;
  paymentDuration?: string | null;
  paymentDueDay?: number | null;
  firstPaymentDate?: string | null;
  productGroupKey?: string | null;
  itemsJson?: string | null;
  splitsJson?: string | null;
  dueDate?: string | null;
  lateFeePerDay?: number | null;
  lateDays?: number | null;
  lateFeeAmount?: number | null;
  waivedLateDays?: number | null;
  waivedLateFee?: number | null;
  totalOverdueDays?: number;
  effectiveWaivedDays?: number;
  effectiveWaivedFee?: number;
  calculatedLateDays?: number;
  calculatedLateFee?: number;
  digitallySignedPdfUrl?: string | null;
  digitallySignedPdfName?: string | null;
  signedAt?: string | null;
  signedByName?: string | null;
  gstNo: string | null;
  billingMonth: string | null;
  sendType: 'MANUAL' | 'AUTOMATIC_MONTH_END';
  sentAt: string;
  status: 'PENDING_CM_REVIEW' | 'SENT_TO_ACCOUNTANT' | 'INVOICE_ATTACHED' | 'APPROVED' | 'REJECTED_WITH_REMARKS';
  remarks: string | null;
  createdAt: string;
  createdBy: { id: number; name: string; email: string; assignedLocations?: { location: LocationOption }[] };
  clientMaster?: {
    hoAddress?: string | null;
    gstStatus?: string | null;
    gstNo?: string | null;
    agreementStartDate?: string | null;
    agreementEndDate?: string | null;
    lockinEndDate?: string | null;
    noticePeriodMonths?: number | null;
    noticePeriodApplicable?: string | null;
    escalationPercent?: number | null;
    escalationApplicable?: number | null;
    willDeductTds?: boolean;
    tanNo?: string | null;
    clientId?: string | null;
    sorAmount?: number | null;
    sorRecdDate?: string | null;
    contactPersons?: ContactPerson[];
    products?: {
      id?: number;
      cabinName: string | null;
      noOfSeats: number | null;
      ratePerAgreement: number | null;
      amount: number | null;
      gstPercent: number | null;
      totalAmount: number | null;
      paymentDuration?: string | null;
      paymentDueDay?: number | null;
      agreementPdfUrl?: string | null;
      agreementPdfName?: string | null;
    }[];
  };
  attachedInvoice?: AttachedInvoice | null;
}

const ACCOUNTANT_CM_EMAIL = 'ssinfrazone21@gmail.com';

export default function AdminInvoicesWorkflowPage() {
  const { user, isRole } = useAuth();

  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPER-ADMIN' || isRole('ADMIN');
  const isCommunityManager = isRole('COMMUNITY_MANAGER');
  const isAccountsRole = userRole === 'ACCOUNTS' || userRole === 'ACCOUNTANT' || isRole('ACCOUNTS') || isRole('ACCOUNTANT');
  const userEmail = user?.email?.toLowerCase() || '';

  // Determine strict access permission
  // CM with ssinfrazone21@gmail.com or role ACCOUNTS: Accountant ONLY
  // CM with any other email: CM ONLY
  // Admin: Both
  const isAccountantUser = isAccountsRole || userEmail === ACCOUNTANT_CM_EMAIL || user?.name?.toLowerCase() === 'accounts';
  const canAccessCM = isAdmin || (isCommunityManager && !isAccountantUser);
  const canAccessAccountant = isAdmin || isAccountantUser;

  const [userRoleView, setUserRoleView] = useState<'CM' | 'ACCOUNTANT'>(
    canAccessAccountant && !canAccessCM ? 'ACCOUNTANT' : 'CM'
  );

  useEffect(() => {
    if (userRoleView === 'CM' && !canAccessCM) {
      setUserRoleView('ACCOUNTANT');
    } else if (userRoleView === 'ACCOUNTANT' && !canAccessAccountant) {
      setUserRoleView('CM');
    }
  }, [canAccessCM, canAccessAccountant, userRoleView]);

  const [activeSection, setActiveSection] = useState<'ACTIVE_WORKFLOW' | 'OLD_INVOICES'>('ACTIVE_WORKFLOW');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('ALL');
  const [selectedCycleFilter, setSelectedCycleFilter] = useState('ALL');
  const [selectedDueDayFilter, setSelectedDueDayFilter] = useState('ALL');
  const [selectedBillingMonthFilter, setSelectedBillingMonthFilter] = useState('ALL');

  // Node/Location Filter for Admin
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('ALL');

  // Digital Signature Management State
  const [showSignatureSettingsModal, setShowSignatureSettingsModal] = useState(false);
  const [signatureSetting, setSignatureSetting] = useState<{
    signatureUrl: string;
    signerName: string;
    signerTitle: string;
    companyName: string;
    isActive: boolean;
  }>({
    signatureUrl: '',
    signerName: 'Community Manager',
    signerTitle: 'Authorized Signatory',
    companyName: 'SSPACIA Workspaces',
    isActive: true,
  });
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [newSignatureFile, setNewSignatureFile] = useState<File | null>(null);
  const [signatureSignerName, setSignatureSignerName] = useState('');
  const [signatureSignerTitle, setSignatureSignerTitle] = useState('');

  // Accountant Upload Invoice Modal
  const [entryToAttachInvoice, setEntryToAttachInvoice] = useState<InvoiceRecord | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);

  // CM Review Attached PDF Modal
  const [entryToReviewInvoice, setEntryToReviewInvoice] = useState<InvoiceRecord | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // USB DSC & Digital Signing Modal State
  const [targetInvoiceToSign, setTargetInvoiceToSign] = useState<InvoiceRecord | null>(null);
  const [showApplySignatureModal, setShowApplySignatureModal] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<{ connected: boolean; checking: boolean; certificates: any[] }>({
    connected: false,
    checking: false,
    certificates: [],
  });
  const [signingWithUsb, setSigningWithUsb] = useState(false);

  // View Full Record Details Modal
  const [entryToViewDetails, setEntryToViewDetails] = useState<InvoiceRecord | null>(null);

  // Flexible Late Fee Surcharge & Waive Days Modal
  const [waiveModalInvoice, setWaiveModalInvoice] = useState<InvoiceRecord | null>(null);
  const [waiveDaysInput, setWaiveDaysInput] = useState<string>('0');

  // Split Invoice (Product-Wise) Modal State
  const [splitModalInvoice, setSplitModalInvoice] = useState<InvoiceRecord | null>(null);
  const [splitGroups, setSplitGroups] = useState<InvoiceSplitGroup[]>([]);
  const [splitUploadingGroupIndex, setSplitUploadingGroupIndex] = useState<number | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Edit Invoice Record Modal State
  interface EditInvoiceItem {
    cabinName: string;
    noOfSeats: number | '';
    ratePerAgreement: number | '';
    amount: number | '';
    gstPercent: number | '';
    totalAmount: number | '';
    paymentDuration?: string;
    billingType?: string;
    note?: string;
  }

  const [entryToEditInvoice, setEntryToEditInvoice] = useState<InvoiceRecord | null>(null);
  const [editItems, setEditItems] = useState<EditInvoiceItem[]>([]);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCabinName, setEditCabinName] = useState('');
  const [editNoOfSeats, setEditNoOfSeats] = useState<number | ''>('');
  const [editRatePerAgreement, setEditRatePerAgreement] = useState<number | ''>('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editGstPercent, setEditGstPercent] = useState<number | ''>('');
  const [editTotalAmount, setEditTotalAmount] = useState<number | ''>('');
  const [editGstNo, setEditGstNo] = useState('');
  const [editBillingMonth, setEditBillingMonth] = useState('');
  const [editStatus, setEditStatus] = useState<InvoiceRecord['status']>('PENDING_CM_REVIEW');

  const fetchSignatureSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/digital-signature');
      const json = await res.json();
      if (json.success && json.data) {
        setSignatureSetting(json.data);
        setSignatureSignerName(json.data.signerName || 'Community Manager');
        setSignatureSignerTitle(json.data.signerTitle || 'Authorized Signatory');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSignatureSettings();
  }, [fetchSignatureSettings]);

  const handleSaveSignatureSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingSignature(true);
    try {
      let signatureUrl = signatureSetting.signatureUrl;

      if (newSignatureFile) {
        const formData = new FormData();
        formData.append('file', newSignatureFile);
        formData.append('signerName', signatureSignerName);
        formData.append('signerTitle', signatureSignerTitle);
        formData.append('companyName', signatureSetting.companyName || 'SSPACIA Workspaces');

        const res = await fetch('/api/admin/digital-signature', {
          method: 'POST',
          body: formData,
        });
        const json = await res.json();
        if (json.success) {
          toast.success('Digital signature stamp updated successfully! ✍️');
          setSignatureSetting(json.data);
          setShowSignatureSettingsModal(false);
          setNewSignatureFile(null);
          return;
        } else {
          toast.error(json.error || 'Failed to update signature');
          return;
        }
      }

      const res = await fetch('/api/admin/digital-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureUrl,
          signerName: signatureSignerName,
          signerTitle: signatureSignerTitle,
          companyName: signatureSetting.companyName || 'SSPACIA Workspaces',
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Digital signature settings saved! ✍️');
        setSignatureSetting(json.data);
        setShowSignatureSettingsModal(false);
      } else {
        toast.error(json.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Error saving signature settings');
    } finally {
      setUploadingSignature(false);
    }
  };

  const checkUsbBridge = useCallback(async () => {
    setBridgeStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch('http://127.0.0.1:8765/status', { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const certsRes = await fetch('http://127.0.0.1:8765/certificates', { signal: AbortSignal.timeout(2500) });
        const certsJson = await certsRes.json();
        setBridgeStatus({
          connected: true,
          checking: false,
          certificates: certsJson.certificates || [],
        });
        return;
      }
    } catch {
      // Bridge not running
    }
    setBridgeStatus({ connected: false, checking: false, certificates: [] });
  }, []);

  useEffect(() => {
    if (showApplySignatureModal) {
      checkUsbBridge();
    }
  }, [showApplySignatureModal, checkUsbBridge]);

  const handleSignWithUsbToken = async (invoice: InvoiceRecord) => {
    if (!invoice.attachedInvoice?.fileUrl) {
      toast.error('No attached invoice PDF found');
      return;
    }
    setSigningWithUsb(true);
    try {
      const pdfRes = await fetch(invoice.attachedInvoice.fileUrl);
      if (!pdfRes.ok) throw new Error('Could not fetch attached invoice PDF');
      const arrayBuffer = await pdfRes.arrayBuffer();

      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const pdfBase64 = window.btoa(binary);

      toast.info('Connecting to ProxKey USB Token... Please enter PIN if prompted.', { duration: 6000 });
      const bridgeRes = await fetch('http://127.0.0.1:8765/sign-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          signerName: signatureSignerName || 'PRAVEEN DILIPKUMAR AGARWAL',
        }),
      });

      const bridgeJson = await bridgeRes.json();
      if (!bridgeRes.ok || !bridgeJson.success) {
        throw new Error(bridgeJson.error || 'Failed to sign with USB token');
      }

      const dscData = bridgeJson.data;

      const saveRes = await fetch(`/api/admin/Invoices/${invoice.id}/save-usb-signed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedPdfBase64: pdfBase64,
          signerName: dscData.signerName || 'PRAVEEN DILIPKUMAR AGARWAL',
          serialNumber: dscData.serialNumber,
          issuer: dscData.issuer,
          thumbprint: dscData.thumbprint,
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error || 'Failed to save signed invoice');

      toast.success('🎉 Invoice digitally signed with ProxKey USB Token (PantaSign CA)!');
      setShowApplySignatureModal(false);
      setTargetInvoiceToSign(null);
      fetchData();
    } catch (err: any) {
      console.error('USB Signing Error:', err);
      toast.error(err.message || 'Failed to sign with USB Token. Ensure ProxKey is plugged in.');
    } finally {
      setSigningWithUsb(false);
    }
  };

  const handleApplyDigitalSignature = async (invoiceId: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${invoiceId}/apply-digital-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signatureSignerName || signatureSetting.signerName,
          signerTitle: signatureSignerTitle || signatureSetting.signerTitle,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Digital signature stamp successfully applied to invoice PDF! ✅');
        setShowApplySignatureModal(false);
        setTargetInvoiceToSign(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to apply digital signature');
      }
    } catch {
      toast.error('Error applying digital signature');
    } finally {
      setActionLoading(false);
    }
  };

  // Late Fee Surcharge & Flexible Waive-Off Handlers
  const handleOpenWaiveModal = (inv: InvoiceRecord) => {
    setWaiveModalInvoice(inv);
    const initialWaived = inv.waivedLateDays ?? inv.effectiveWaivedDays ?? 0;
    setWaiveDaysInput(String(initialWaived));
  };

  const handleQuickWaiveAll = async (inv: InvoiceRecord) => {
    const totalOverdue = inv.totalOverdueDays || inv.calculatedLateDays || 0;
    const ratePerDay = Number(inv.lateFeePerDay || 100);
    const totalLateFee = totalOverdue * ratePerDay;
    const prevLateFee = Number(inv.lateFeeAmount || 0);
    const baseTotal = Math.max(0, (Number(inv.totalAmount) || 0) - prevLateFee);

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${inv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateDays: 0,
          lateFeeAmount: 0,
          waivedLateDays: totalOverdue,
          waivedLateFee: totalLateFee,
          totalAmount: baseTotal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`100% Late Surcharge waived (${totalOverdue} days) for ${inv.companyName}! 🎉`);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to waive late fee');
      }
    } catch {
      toast.error('Error waiving late fee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveWaiveModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!waiveModalInvoice) return;

    const totalOverdue = waiveModalInvoice.totalOverdueDays || waiveModalInvoice.calculatedLateDays || 0;
    const ratePerDay = Number(waiveModalInvoice.lateFeePerDay || 100);
    const parsedWaived = parseInt(waiveDaysInput, 10);
    const waivedDays = isNaN(parsedWaived) ? 0 : Math.max(0, Math.min(totalOverdue, parsedWaived));
    const chargeableDays = Math.max(0, totalOverdue - waivedDays);
    const newLateFee = chargeableDays * ratePerDay;
    const waivedFee = waivedDays * ratePerDay;

    // Base total without previously applied late fee
    const prevLateFee = Number(waiveModalInvoice.lateFeeAmount || 0);
    const baseTotal = Math.max(0, (Number(waiveModalInvoice.totalAmount) || 0) - prevLateFee);
    const newTotal = baseTotal + newLateFee;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${waiveModalInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lateDays: chargeableDays,
          lateFeeAmount: newLateFee,
          waivedLateDays: waivedDays,
          waivedLateFee: waivedFee,
          totalAmount: newTotal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (waivedDays >= totalOverdue) {
          toast.success(`100% Late Surcharge waived (${totalOverdue} days)!`);
        } else if (waivedDays > 0) {
          toast.success(`Waived ${waivedDays} days (₹${waivedFee.toLocaleString('en-IN')}). Remaining ${chargeableDays} days (₹${newLateFee.toLocaleString('en-IN')}) applied.`);
        } else {
          toast.success(`Full Late Fee Surcharge of ₹${newLateFee.toLocaleString('en-IN')} (${chargeableDays} days) applied.`);
        }
        setWaiveModalInvoice(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to update late fee');
      }
    } catch {
      toast.error('Error updating late fee');
    } finally {
      setActionLoading(false);
    }
  };

  // ── SPLIT INVOICE (PRODUCT-WISE) HANDLERS ──
  const handleOpenSplitModal = (inv: InvoiceRecord) => {
    setSplitModalInvoice(inv);
    let items: any[] = [];
    if (inv.itemsJson) {
      try {
        const raw = JSON.parse(inv.itemsJson);
        if (Array.isArray(raw) && raw.length > 0) items = raw;
      } catch {}
    }
    if (items.length === 0) {
      items = [{
        cabinName: inv.cabinName || 'Workspace',
        noOfSeats: inv.noOfSeats || 1,
        amount: inv.amount || 0,
        gstPercent: inv.gstPercent || 18,
        totalAmount: inv.totalAmount || 0,
      }];
    }

    if (inv.splitsJson) {
      try {
        const existingSplits = JSON.parse(inv.splitsJson);
        if (Array.isArray(existingSplits) && existingSplits.length > 0) {
          setSplitGroups(existingSplits);
          return;
        }
      } catch {}
    }

    // Default initialization: If >= 2 items, create 2 initial groups, else 1 group
    if (items.length >= 2) {
      const half = Math.ceil(items.length / 2);
      const group1Indices = items.slice(0, half).map((_, i) => i);
      const group2Indices = items.slice(half).map((_, i) => i + half);

      const calcGroup = (id: string, name: string, indices: number[]): InvoiceSplitGroup => {
        const selectedItems = indices.map(i => items[i]).filter(Boolean);
        const seats = selectedItems.reduce((s, it) => s + (Number(it.noOfSeats) || 0), 0);
        const amt = selectedItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
        const tot = selectedItems.reduce((s, it) => s + (Number(it.totalAmount) || 0), 0);
        const firstDue = selectedItems[0]?.paymentDueDay || inv.paymentDueDay || 5;
        const start = selectedItems[0]?.startDate || selectedItems[0]?.agreementStartDate || '';
        const end = selectedItems[0]?.endDate || selectedItems[0]?.agreementEndDate || '';
        return {
          id,
          name,
          productIndices: indices,
          noOfSeats: seats,
          amount: amt,
          gstAmount: Math.max(0, tot - amt),
          totalAmount: tot,
          startDate: start,
          endDate: end,
          paymentDueDay: firstDue,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          attachedInvoice: null,
        };
      };

      setSplitGroups([
        calcGroup('split_1', 'Sub-Invoice #1 (Primary)', group1Indices),
        calcGroup('split_2', 'Sub-Invoice #2 (Additional)', group2Indices),
      ]);
    } else {
      setSplitGroups([
        {
          id: 'split_1',
          name: 'Sub-Invoice #1 (Full)',
          productIndices: [0],
          noOfSeats: Number(items[0]?.noOfSeats || inv.noOfSeats || 0),
          amount: Number(items[0]?.amount || inv.amount || 0),
          gstAmount: Math.max(0, (Number(items[0]?.totalAmount || inv.totalAmount || 0) - Number(items[0]?.amount || inv.amount || 0))),
          totalAmount: Number(items[0]?.totalAmount || inv.totalAmount || 0),
          startDate: items[0]?.startDate || items[0]?.agreementStartDate || '',
          endDate: items[0]?.endDate || items[0]?.agreementEndDate || '',
          paymentDueDay: items[0]?.paymentDueDay || inv.paymentDueDay || 5,
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          attachedInvoice: null,
        }
      ]);
    }
  };

  const handleUpdateProductGroupAssignment = (productIndex: number, targetGroupId: string) => {
    if (!splitModalInvoice) return;
    let items: any[] = [];
    try {
      items = JSON.parse(splitModalInvoice.itemsJson || '[]');
    } catch {}

    const updatedGroups = splitGroups.map(group => {
      let nextIndices = group.productIndices.filter(i => i !== productIndex);
      if (group.id === targetGroupId) {
        if (!nextIndices.includes(productIndex)) {
          nextIndices.push(productIndex);
        }
      }
      nextIndices.sort((a, b) => a - b);
      const selectedItems = nextIndices.map(i => items[i]).filter(Boolean);
      const seats = selectedItems.reduce((s, it) => s + (Number(it.noOfSeats) || 0), 0);
      const amt = selectedItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const tot = selectedItems.reduce((s, it) => s + (Number(it.totalAmount) || 0), 0);
      return {
        ...group,
        productIndices: nextIndices,
        noOfSeats: seats,
        amount: amt,
        gstAmount: Math.max(0, tot - amt),
        totalAmount: tot,
      };
    });

    setSplitGroups(updatedGroups);
  };

  const handleAddSplitGroup = () => {
    const newId = `split_${Date.now()}`;
    const newGroupNumber = splitGroups.length + 1;
    setSplitGroups([
      ...splitGroups,
      {
        id: newId,
        name: `Sub-Invoice #${newGroupNumber}`,
        productIndices: [],
        noOfSeats: 0,
        amount: 0,
        gstAmount: 0,
        totalAmount: 0,
        startDate: '',
        endDate: '',
        dueDate: splitModalInvoice?.dueDate ? new Date(splitModalInvoice.dueDate).toISOString().split('T')[0] : '',
        paymentDueDay: splitModalInvoice?.paymentDueDay || 5,
        attachedInvoice: null,
      }
    ]);
  };

  const handleRemoveSplitGroup = (groupId: string) => {
    if (splitGroups.length <= 1) {
      toast.error('You must keep at least 1 group');
      return;
    }
    const groupToRemove = splitGroups.find(g => g.id === groupId);
    const remainingGroups = splitGroups.filter(g => g.id !== groupId);
    if (groupToRemove && groupToRemove.productIndices.length > 0 && remainingGroups[0]) {
      groupToRemove.productIndices.forEach(pIdx => {
        if (!remainingGroups[0].productIndices.includes(pIdx)) {
          remainingGroups[0].productIndices.push(pIdx);
        }
      });
      let items: any[] = [];
      try {
        items = JSON.parse(splitModalInvoice?.itemsJson || '[]');
      } catch {}
      const selectedItems = remainingGroups[0].productIndices.map(i => items[i]).filter(Boolean);
      remainingGroups[0].noOfSeats = selectedItems.reduce((s, it) => s + (Number(it.noOfSeats) || 0), 0);
      remainingGroups[0].amount = selectedItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const tot = selectedItems.reduce((s, it) => s + (Number(it.totalAmount) || 0), 0);
      remainingGroups[0].gstAmount = Math.max(0, tot - remainingGroups[0].amount);
      remainingGroups[0].totalAmount = tot;
    }
    setSplitGroups(remainingGroups);
  };

  const handleUpdateSplitGroupField = (groupId: string, field: 'name' | 'startDate' | 'endDate' | 'dueDate' | 'paymentDueDay', value: any) => {
    setSplitGroups(splitGroups.map(g => g.id === groupId ? { ...g, [field]: value } : g));
  };

  const handleSaveSplitInvoice = async () => {
    if (!splitModalInvoice) return;
    let items: any[] = [];
    try {
      items = JSON.parse(splitModalInvoice.itemsJson || '[]');
    } catch {}

    const assignedIndices = new Set(splitGroups.flatMap(g => g.productIndices));
    if (items.length > 0 && assignedIndices.size < items.length) {
      toast.error(`Please assign all ${items.length} products to a Sub-Invoice group before saving.`);
      return;
    }

    const validGroups = splitGroups.filter(g => g.productIndices.length > 0);
    if (validGroups.length === 0) {
      toast.error('At least one group must have assigned products.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${splitModalInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splitsJson: validGroups.length > 1 ? JSON.stringify(validGroups) : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        if (validGroups.length > 1) {
          toast.success(`Invoice split into ${validGroups.length} Sub-Invoices successfully!`);
        } else {
          toast.success('Unified single invoice saved.');
        }
        setSplitModalInvoice(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to save invoice split');
      }
    } catch {
      toast.error('Error saving split invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSplitToSingle = async () => {
    if (!splitModalInvoice) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${splitModalInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          splitsJson: null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Reset back to single unified invoice.');
        setSplitModalInvoice(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to reset invoice');
      }
    } catch {
      toast.error('Error resetting split invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadSplitPdf = async (groupIndex: number, file: File) => {
    if (!entryToAttachInvoice) return;
    let splits: InvoiceSplitGroup[] = [];
    try {
      splits = JSON.parse(entryToAttachInvoice.splitsJson || '[]');
    } catch {}

    if (!splits[groupIndex]) return;

    setSplitUploadingGroupIndex(groupIndex);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success) throw new Error(uploadJson.error || 'PDF upload failed');

      const { fileUrl, fileName, fileSize } = uploadJson.data;

      splits[groupIndex].attachedInvoice = {
        fileName,
        fileUrl,
        fileSize,
        uploadedAt: new Date().toISOString(),
      };

      const attachRes = await fetch('/api/admin/attached-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entryToAttachInvoice.id,
          fileUrl: splits[0]?.attachedInvoice?.fileUrl || fileUrl,
          fileName: splits[0]?.attachedInvoice?.fileName || fileName,
          fileSize: splits[0]?.attachedInvoice?.fileSize || fileSize,
          splitsJson: JSON.stringify(splits),
        }),
      });
      const attachJson = await attachRes.json();
      if (attachJson.success) {
        toast.success(`PDF attached for ${splits[groupIndex].name}!`);
        setEntryToAttachInvoice({
          ...entryToAttachInvoice,
          splitsJson: JSON.stringify(splits),
          status: 'INVOICE_ATTACHED',
        });
        fetchData();
      } else {
        toast.error(attachJson.error || 'Failed to update invoice split attachment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading split PDF');
    } finally {
      setSplitUploadingGroupIndex(null);
    }
  };

  const handleOpenEditModal = (inv: InvoiceRecord) => {
    setEntryToEditInvoice(inv);
    setEditCompanyName(inv.companyName || '');
    setEditCabinName(inv.cabinName || '');
    setEditNoOfSeats(inv.noOfSeats ?? '');
    setEditRatePerAgreement(inv.ratePerAgreement ?? '');
    setEditAmount(inv.amount ?? '');
    setEditGstPercent(inv.gstPercent ?? 18);
    setEditTotalAmount(inv.totalAmount ?? '');
    setEditGstNo(inv.gstNo || '');
    setEditBillingMonth(inv.billingMonth || '');
    setEditStatus(inv.status);

    let parsed: EditInvoiceItem[] = [];
    if (inv.itemsJson) {
      try {
        const raw = JSON.parse(inv.itemsJson);
        if (Array.isArray(raw) && raw.length > 0) {
          parsed = raw.map((it: any) => ({
            cabinName: it.cabinName || '',
            noOfSeats: it.noOfSeats ?? '',
            ratePerAgreement: it.ratePerAgreement ?? '',
            amount: it.amount ?? '',
            gstPercent: it.gstPercent ?? 18,
            totalAmount: it.totalAmount ?? '',
            paymentDuration: it.paymentDuration || 'MONTHLY',
            billingType: it.billingType || 'REGULAR',
            note: it.note,
          }));
        }
      } catch {
        parsed = [];
      }
    }

    if (parsed.length === 0) {
      parsed = [{
        cabinName: inv.cabinName || 'Workspace',
        noOfSeats: inv.noOfSeats ?? '',
        ratePerAgreement: inv.ratePerAgreement ?? '',
        amount: inv.amount ?? '',
        gstPercent: inv.gstPercent ?? 18,
        totalAmount: inv.totalAmount ?? '',
        paymentDuration: inv.paymentDuration || 'MONTHLY',
        billingType: 'REGULAR',
      }];
    }

    setEditItems(parsed);
  };

  const recalculateEditTotals = (items: EditInvoiceItem[]) => {
    const totalSeats = items.reduce((sum, it) => sum + (Number(it.noOfSeats) || 0), 0);
    const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const total = items.reduce((sum, it) => sum + (Number(it.totalAmount) || 0), 0);
    const roundedTotal = Math.round(total);

    const names = items.map((it) => it.cabinName.trim()).filter(Boolean);
    let summaryName = '';
    if (names.length === 0) {
      summaryName = 'Workspace';
    } else if (names.length === 1) {
      summaryName = names[0];
    } else {
      summaryName = `${names.length} Spaces (${names.join(', ')})`;
    }

    setEditNoOfSeats(totalSeats);
    setEditAmount(roundedSubtotal);
    setEditTotalAmount(roundedTotal);
    setEditCabinName(summaryName);
  };

  const handleDeleteEditItem = (index: number) => {
    const itemToDelete = editItems[index];
    const itemName = itemToDelete?.cabinName || `Item #${index + 1}`;
    if (!confirm(`Are you sure you want to delete "${itemName}" from this invoice?`)) {
      return;
    }
    const updated = editItems.filter((_, idx) => idx !== index);
    setEditItems(updated);
    recalculateEditTotals(updated);
    toast.success(`Product "${itemName}" deleted from invoice!`);
  };

  const handleUpdateEditItem = (index: number, field: keyof EditInvoiceItem, value: any) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: value };

    if (field === 'noOfSeats' || field === 'ratePerAgreement' || field === 'gstPercent') {
      const seats = field === 'noOfSeats' ? (value === '' ? 0 : Number(value)) : (Number(item.noOfSeats) || 0);
      const rate = field === 'ratePerAgreement' ? (value === '' ? 0 : Number(value)) : (Number(item.ratePerAgreement) || 0);
      const gstP = field === 'gstPercent' ? (value === '' ? 18 : Number(value)) : (Number(item.gstPercent) || 18);

      if (seats > 0 && rate > 0) {
        const lineAmt = Math.round(seats * rate * 100) / 100;
        const lineGst = Math.round(((lineAmt * gstP) / 100) * 100) / 100;
        item.amount = lineAmt;
        item.totalAmount = Math.round(lineAmt + lineGst);
      }
    } else if (field === 'amount') {
      const lineAmt = value === '' ? 0 : Number(value);
      const gstP = Number(item.gstPercent) || 18;
      const lineGst = Math.round(((lineAmt * gstP) / 100) * 100) / 100;
      item.totalAmount = Math.round(lineAmt + lineGst);
    }

    updated[index] = item;
    setEditItems(updated);
    recalculateEditTotals(updated);
  };

  const handleAddEditItem = () => {
    const newItem: EditInvoiceItem = {
      cabinName: 'Workspace',
      noOfSeats: 1,
      ratePerAgreement: 0,
      amount: 0,
      gstPercent: 18,
      totalAmount: 0,
      paymentDuration: 'MONTHLY',
      billingType: 'REGULAR',
    };
    const updated = [...editItems, newItem];
    setEditItems(updated);
    recalculateEditTotals(updated);
  };

  const canUseNodeFilter = isAdmin || canAccessAccountant;

  // Fetch locations for Admin & Accountant filter dropdown
  const fetchLocations = useCallback(async () => {
    if (!canUseNodeFilter) return;
    try {
      const res = await fetch('/api/admin/locations?limit=100');
      const json = await res.json();
      const locList = json.data || json.locations || (Array.isArray(json) ? json : []);
      if (Array.isArray(locList)) {
        setLocations(locList.map((l: any) => ({ id: l.id, name: l.name })));
      }
    } catch { /* ignore */ }
  }, [canUseNodeFilter]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (canUseNodeFilter && selectedLocationFilter !== 'ALL') {
        params.set('locationId', selectedLocationFilter);
      }
      const url = `/api/admin/Invoices${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load invoice records');
    } finally {
      setLoading(false);
    }
  }, [canUseNodeFilter, selectedLocationFilter]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update Status (Send to Accountant, Approve, Reject)
  const handleUpdateStatus = async (id: number, status: string, remarks?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks })
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        if (status === 'SENT_TO_ACCOUNTANT') toast.success('Sent to Accountant for Tally PDF processing!');
        if (status === 'APPROVED') toast.success('Invoice Approved successfully! ✅');
        if (status === 'REJECTED_WITH_REMARKS') toast.success('Revision remarks sent back to Accountant!');

        fetchData();
        setShowRejectModal(false);
        setRejectRemarks('');
        setEntryToReviewInvoice(null);
      } else {
        toast.error(json.error || 'Failed to update status');
      }
    } catch {
      toast.error('Error updating invoice status');    
    } finally {
      setActionLoading(false);
    }
  };

  // Save Edit Invoice Record
  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryToEditInvoice) return;
    if (editItems.length === 0) {
      toast.error('Invoice must contain at least one product item');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${entryToEditInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: editCompanyName,
          cabinName: editCabinName,
          noOfSeats: editNoOfSeats,
          ratePerAgreement: editRatePerAgreement,
          amount: editAmount,
          gstPercent: editGstPercent,
          totalAmount: editTotalAmount,
          gstNo: editGstNo,
          billingMonth: editBillingMonth,
          status: editStatus,
          itemsJson: JSON.stringify(editItems),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Invoice record and products updated successfully!');
        setEntryToEditInvoice(null);
        fetchData();
      } else {
        toast.error(json.error || 'Failed to update invoice record');
      }
    } catch {
      toast.error('Error updating invoice record');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Invoice Record
  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice record from the Invoices section?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/Invoices/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Invoice record deleted successfully!');
        fetchData();
      } else {
        toast.error(json.error || 'Failed to delete invoice record');
      }
    } catch {
      toast.error('Error deleting invoice record');
    } finally {
      setActionLoading(false);
    }
  };

  // Accountant PDF Upload
  const handleUploadInvoicePdf = async () => {
    if (!entryToAttachInvoice || !selectedInvoiceFile) {
      toast.error('Please select a PDF file first');
      return;
    }

    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedInvoiceFile);

      const uploadRes = await fetch('/api/admin/upload-pdf', {
        method: 'POST',
        body: formData
      });
      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        throw new Error(uploadJson.error || 'PDF Upload failed');
      }

      const { fileUrl, fileName, fileSize } = uploadJson.data;

      const attachRes = await fetch('/api/admin/attached-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: entryToAttachInvoice.id,
          fileUrl,
          fileName,
          fileSize
        })
      });
      const attachJson = await attachRes.json();

      if (attachJson.success) {
        toast.success('Tally Invoice PDF attached & sent to Community Manager!');
        setEntryToAttachInvoice(null);
        setSelectedInvoiceFile(null);
        fetchData();
      } else {
        toast.error(attachJson.error || 'Failed to attach invoice');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process PDF upload');
    } finally {
      setUploadingPdf(false);
    }
  };

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.companyName) set.add(inv.companyName.trim());
    });
    return Array.from(set).sort();
  }, [invoices]);

  const availableCycleOptions = useMemo(() => {
    const targetInvoices = selectedCompanyFilter === 'ALL'
      ? invoices
      : invoices.filter((e) => e.companyName.trim() === selectedCompanyFilter);

    const map = new Map<string, { label: string; count: number; itemsName: string; totalAmt: number }>();
    for (const inv of targetInvoices) {
      const key = inv.productGroupKey || `${inv.paymentDueDay || 'DEFAULT'}_${inv.paymentDuration || 'MONTHLY'}`;
      const durationLabel = inv.paymentDuration ? String(inv.paymentDuration).replace('_', ' ') : 'MONTHLY';
      const dueDayLabel = inv.paymentDueDay ? `Due: ${inv.paymentDueDay}th` : 'End of Month';
      const itemsLabel = inv.cabinName ? `(${inv.cabinName})` : '';
      const label = `${durationLabel} [${dueDayLabel}] ${itemsLabel} - ₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')}`;

      if (!map.has(key)) {
        map.set(key, {
          label,
          count: 1,
          itemsName: inv.cabinName || 'Items',
          totalAmt: Number(inv.totalAmount || 0),
        });
      } else {
        const existing = map.get(key)!;
        existing.count += 1;
        existing.totalAmt += Number(inv.totalAmount || 0);
      }
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));
  }, [invoices, selectedCompanyFilter]);

  // Filtered entries for CM View vs Accountant View
  const filteredInvoices = useMemo(() => {
    return invoices.filter((e) => {
      const matchesSearch =
        e.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.gstNo && e.gstNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.cabinName && e.cabinName.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesRoleFilter = true;
      if (userRoleView === 'ACCOUNTANT') {
        matchesRoleFilter = ['SENT_TO_ACCOUNTANT', 'REJECTED_WITH_REMARKS', 'INVOICE_ATTACHED', 'APPROVED'].includes(e.status);
      }

      const matchesStatus =
        selectedStatusFilter === 'ALL' || e.status === selectedStatusFilter;

      const matchesCompany =
        selectedCompanyFilter === 'ALL' || e.companyName.trim() === selectedCompanyFilter;

      const currentCycleKey = e.productGroupKey || `${e.paymentDueDay || 'DEFAULT'}_${e.paymentDuration || 'MONTHLY'}`;
      const matchesCycle =
        selectedCycleFilter === 'ALL' || currentCycleKey === selectedCycleFilter;

      const matchesDueDay =
        selectedDueDayFilter === 'ALL' || String(e.paymentDueDay) === selectedDueDayFilter;

      const matchesBillingMonth =
        selectedBillingMonthFilter === 'ALL' || e.billingMonth === selectedBillingMonthFilter;

      return matchesSearch && matchesRoleFilter && matchesStatus && matchesCompany && matchesCycle && matchesDueDay && matchesBillingMonth;
    });
  }, [invoices, searchTerm, userRoleView, selectedStatusFilter, selectedCompanyFilter, selectedCycleFilter, selectedDueDayFilter, selectedBillingMonthFilter]);

  const groupedInvoicesByCompany = useMemo(() => {
    const map = new Map<string, InvoiceRecord[]>();
    for (const inv of filteredInvoices) {
      const key = inv.companyName.trim() || 'Unknown Company';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(inv);
    }
    return Array.from(map.entries()).map(([companyName, items]) => ({
      companyName,
      items,
      clientMasterId: items[0]?.clientMasterId,
      gstNo: items[0]?.gstNo || items[0]?.clientMaster?.gstNo,
      nodeLocations: items[0]?.createdBy?.assignedLocations || [],
      createdByName: items[0]?.createdBy?.name || 'Community Manager',
      totalCompanyAmount: items.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
    }));
  }, [filteredInvoices]);

  // KPIs
  const kpis = useMemo(() => {
    const totalInvoices = invoices.length;
    const pendingCM = invoices.filter((e) => e.status === 'PENDING_CM_REVIEW').length;
    const sentToAccountant = invoices.filter((e) => e.status === 'SENT_TO_ACCOUNTANT').length;
    const pendingCMApproval = invoices.filter((e) => e.status === 'INVOICE_ATTACHED').length;
    const approved = invoices.filter((e) => e.status === 'APPROVED').length;
    const rejected = invoices.filter((e) => e.status === 'REJECTED_WITH_REMARKS').length;

    return { totalInvoices, pendingCM, sentToAccountant, pendingCMApproval, approved, rejected };
  }, [invoices]);

  // Status Badge Renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_CM_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            <Clock size={11} /> Arrived from Client Master (CM Review)
          </span>
        );
      case 'SENT_TO_ACCOUNTANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
            <Send size={11} /> Sent to Accountant
          </span>
        );
      case 'INVOICE_ATTACHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Paperclip size={11} /> Invoice Attached (Pending CM Approval)
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} /> Invoice Approved ✅
          </span>
        );
      case 'REJECTED_WITH_REMARKS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle size={11} /> Revision Requested ❌
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      {/* ── TOP LEVEL SECTION SWITCHER (Active Invoices vs Old Invoices Archive) ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-white border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveSection('ACTIVE_WORKFLOW')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSection === 'ACTIVE_WORKFLOW'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText size={15} />
              <span>Active Monthly Invoices & Tally</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-mono">
                {invoices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('OLD_INVOICES')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeSection === 'OLD_INVOICES'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FolderArchive size={15} />
              <span>Old Invoices History Archive</span>
              <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded text-[10px] font-mono font-bold">
                NEW
              </span>
            </button>
          </div>

          {activeSection === 'ACTIVE_WORKFLOW' && canAccessCM && canAccessAccountant && (
            <div className="flex items-center bg-[#F8F9FA] border border-[var(--outline-variant)] p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setUserRoleView('CM')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  userRoleView === 'CM'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[#616161] hover:text-[#1B1C1C]'
                }`}
              >
                <UserCheck size={14} /> CM View
              </button>
              <button
                type="button"
                onClick={() => setUserRoleView('ACCOUNTANT')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  userRoleView === 'ACCOUNTANT'
                    ? 'bg-[var(--primary)] text-white shadow-xs'
                    : 'text-[#616161] hover:text-[#1B1C1C]'
                }`}
              >
                <Calculator size={14} /> Accountant View
              </button>
            </div>
          )}
        </div>
      </FadeUp>

      {/* ── RENDER OLD INVOICES ARCHIVE OR ACTIVE INVOICE WORKFLOW ── */}
      {activeSection === 'OLD_INVOICES' ? (
        <OldInvoicesArchive
          isSuperAdmin={isAdmin}
          userRoleView={userRoleView}
          canAccessCM={canAccessCM}
          canAccessAccountant={canAccessAccountant}
          currentUserLocationId={(user as any)?.locationId || (user as any)?.assignedLocations?.[0]?.locationId}
          currentUserLocationName={(user as any)?.location?.name || (user as any)?.assignedLocations?.[0]?.location?.name}
        />
      ) : (
        <>
          {/* Header */}
          <FadeUp delay={0.05}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--outline-variant)]/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--primary)] mb-1">
                  <FileCheck size={16} /> {userRoleView === 'CM' ? 'CM Monthly Invoices Review' : 'Accountant Tally PDF Attachment'}
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-[#1B1C1C]">
                  Invoices & Tally PDF Processing
                </h1>
                <p className="text-sm text-[#616161] mt-1 font-light">
                  {userRoleView === 'CM'
                    ? 'Review entries that arrived automatically or manually from Client Master, send to Accountant, and review attached Tally PDF invoices.'
                    : 'Inspect client entries sent by CM, attach Tally PDF invoices, review CM revision remarks, and re-submit.'}
                </p>
              </div>
            </div>
          </FadeUp>

          {/* KPI Cards */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 border border-[var(--outline-variant)]/40 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#616161]">Total Invoices</div>
            <div className="text-2xl font-display font-black mt-1 text-[#1B1C1C]">{kpis.totalInvoices}</div>
            <div className="text-[11px] text-[#616161] font-light">Dispatched from Client Master</div>
          </div>

          <div className="bg-white p-5 border border-purple-200 bg-purple-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">Pending CM Review</div>
            <div className="text-2xl font-display font-black mt-1 text-purple-800">{kpis.pendingCM}</div>
            <div className="text-[11px] text-purple-600 font-light">New arrivals</div>
          </div>

          <div className="bg-white p-5 border border-blue-200 bg-blue-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">With Accountant</div>
            <div className="text-2xl font-display font-black mt-1 text-blue-800">{kpis.sentToAccountant}</div>
            <div className="text-[11px] text-blue-600 font-light">Pending Tally PDF</div>
          </div>

          <div className="bg-white p-5 border border-amber-200 bg-amber-50/20 shadow-xs">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Pending CM Approval</div>
            <div className="text-2xl font-display font-black mt-1 text-amber-800">{kpis.pendingCMApproval}</div>
            <div className="text-[11px] text-amber-600 font-light">Tally PDF attached</div>
          </div>

          <div className="bg-white p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs col-span-2 lg:col-span-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Approved Invoices</div>
            <div className="text-2xl font-display font-black mt-1 text-emerald-800">{kpis.approved}</div>
            <div className="text-[11px] text-emerald-600 font-light">Approved by CM</div>
          </div>
        </div>
      </FadeUp>

      {/* TABLE WORKFLOW */}
      <FadeUp delay={0.2}>
        <div className="bg-white border border-[var(--outline-variant)]/40 p-6 space-y-6 shadow-xs">
          {/* Search & Filter Bar - 2-Tier Structured Layout */}
          <div className="bg-[#F8F9FA] border border-[var(--outline-variant)]/60 p-4 space-y-3.5 shadow-xs">
            {/* Tier 1: Primary Dimensions & Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Select Company */}
                <div className="flex items-center gap-1.5 bg-white border border-[#006064]/30 px-3 py-1.5 shadow-2xs">
                  <Building2 size={14} className="text-[#006064]" />
                  <span className="text-[11px] font-bold text-[#006064] uppercase tracking-wider">Company:</span>
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => {
                      setSelectedCompanyFilter(e.target.value);
                      setSelectedCycleFilter('ALL');
                    }}
                    className="bg-transparent text-xs font-extrabold text-[#1B1C1C] focus:outline-none cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="ALL">All Companies ({companyOptions.length})</option>
                    {companyOptions.map((cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Due Date Filter */}
                <div className="flex items-center gap-1.5 bg-white border border-teal-300 px-3 py-1.5 shadow-2xs">
                  <Clock size={14} className="text-teal-700" />
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Due Day:</span>
                  <select
                    value={selectedDueDayFilter}
                    onChange={(e) => setSelectedDueDayFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#1B1C1C] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Due Days</option>
                    <option value="5">5th of Month</option>
                    <option value="7">7th of Month</option>
                    <option value="10">10th of Month</option>
                    <option value="15">15th of Month</option>
                    <option value="20">20th of Month</option>
                    <option value="25">25th of Month</option>
                    <option value="30">30th of Month</option>
                  </select>
                </div>

                {/* 3. Payment Duration */}
                <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1.5 shadow-2xs">
                  <Calendar size={14} className="text-amber-700" />
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Duration:</span>
                  <select
                    value={selectedCycleFilter}
                    onChange={(e) => setSelectedCycleFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#1B1C1C] focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    <option value="ALL">All Cycles ({availableCycleOptions.length})</option>
                    {availableCycleOptions.map((cyc) => (
                      <option key={cyc.key} value={cyc.key}>
                        {cyc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Action: Digital Signature Stamp Hub */}
              {(canAccessCM || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setShowSignatureSettingsModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#006064] hover:bg-teal-900 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-colors"
                >
                  <PenTool size={13} />
                  <span>Digital Signature Stamp</span>
                </button>
              )}
            </div>

            {/* Tier 2: Search, Node Scoping, Status Filter & Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-neutral-200/80">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={14} className="absolute left-3 top-2.5 text-[#616161]" />
                <input
                  type="text"
                  placeholder="Search by company, GST, or cabin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[var(--outline-variant)] pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Node Filter */}
                {canUseNodeFilter && locations.length > 0 && (
                  <div className="flex items-center gap-1 bg-white border border-[var(--outline-variant)] px-2.5 py-1.5">
                    <MapPin size={13} className="text-[#616161]" />
                    <span className="text-[10px] font-bold uppercase text-[#616161]">Node:</span>
                    <select
                      value={selectedLocationFilter}
                      onChange={(e) => setSelectedLocationFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#1B1C1C] focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Nodes</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-white border border-[var(--outline-variant)] px-2.5 py-1.5">
                  <Filter size={13} className="text-[#616161]" />
                  <span className="text-[10px] font-bold uppercase text-[#616161]">Status:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#1B1C1C] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING_CM_REVIEW">Pending CM Review</option>
                    <option value="SENT_TO_ACCOUNTANT">Sent to Accountant</option>
                    <option value="INVOICE_ATTACHED">Invoice Attached</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED_WITH_REMARKS">Revision Requested</option>
                  </select>
                </div>

                {/* Reset all filters button if active */}
                {(selectedCompanyFilter !== 'ALL' || selectedDueDayFilter !== 'ALL' || selectedCycleFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompanyFilter('ALL');
                      setSelectedDueDayFilter('ALL');
                      setSelectedCycleFilter('ALL');
                      setSelectedStatusFilter('ALL');
                      setSearchTerm('');
                    }}
                    className="px-2.5 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[10px] font-bold uppercase tracking-wider"
                    title="Reset all active filters"
                  >
                    Clear Filters
                  </button>
                )}

                <button
                  onClick={fetchData}
                  className="p-1.5 bg-white border border-[var(--outline-variant)] hover:bg-neutral-100 text-[#616161] shadow-2xs"
                  title="Refresh data"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 text-center text-[#616161] flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin text-[var(--primary)]" /> Loading workflow queue...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="text-4xl text-neutral-300">📁</div>
              <div className="text-sm font-bold text-[#1B1C1C]">No invoices found in queue</div>
              <p className="text-xs text-[#616161] max-w-sm mx-auto font-light">
                {userRoleView === 'CM'
                  ? 'No entries have arrived from Client Master yet. Dispatches will appear here.'
                  : 'No entries sent by Community Manager pending Accountant action.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto space-y-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#006064] text-white uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-3 w-12 text-center">SR.No</th>
                    <th className="p-3">Company Name</th>
                    <th className="p-3">Payment Cycle & Duration</th>
                    <th className="p-3">Node & Person</th>
                    <th className="p-3">Cabin & Seats / Items</th>
                    <th className="p-3">Arrival Date & Dispatch Type</th>
                    <th className="p-3">Billing Month</th>
                    <th className="p-3 text-right">Total Amt (₹)</th>
                    <th className="p-3">Workflow Status</th>
                    <th className="p-3 text-center w-40">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-neutral-600 bg-neutral-50/50">
                        #{invoice.srNo}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-[#1B1C1C] text-sm">{invoice.companyName}</div>
                        {invoice.gstNo && <div className="text-[10px] font-mono text-neutral-500">GST: {invoice.gstNo}</div>}
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 bg-[#006064] text-white text-[10px] font-bold uppercase tracking-wider inline-block text-center w-fit">
                            {invoice.paymentDuration ? String(invoice.paymentDuration).replace('_', ' ') : 'MONTHLY'}
                          </span>
                          {invoice.paymentDueDay && (
                            <span className="text-[10px] font-bold text-teal-900 bg-teal-50 px-1.5 py-0.5 border border-teal-200 w-fit">
                              Due: {invoice.paymentDueDay}th of month
                            </span>
                          )}
                          {((invoice.totalOverdueDays && invoice.totalOverdueDays > 0) || (invoice.calculatedLateDays && invoice.calculatedLateDays > 0) || Number(invoice.lateFeeAmount || 0) > 0 || Number(invoice.waivedLateDays || 0) > 0) ? (
                            <div className="space-y-1 mt-1 font-sans">
                              {/* Overdue Badge */}
                              <span className="text-[9px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.5 border border-red-200 flex items-center gap-1 w-fit">
                                <AlertOctagon size={10} /> Overdue {invoice.totalOverdueDays || invoice.calculatedLateDays || invoice.lateDays || 0} days
                              </span>

                              {/* Waived Days Note */}
                              {Number(invoice.waivedLateDays || invoice.effectiveWaivedDays || 0) > 0 && (
                                <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 flex items-center gap-1 w-fit">
                                  ✓ {invoice.waivedLateDays || invoice.effectiveWaivedDays} days waived (-₹{Number(invoice.waivedLateFee || invoice.effectiveWaivedFee || (Number(invoice.waivedLateDays || 0) * 100)).toLocaleString('en-IN')})
                                </span>
                              )}

                              {/* Late Fee Charged Line */}
                              <div className="text-[9px] font-bold">
                                {Number(invoice.calculatedLateFee || invoice.lateFeeAmount || 0) > 0 ? (
                                  <span className="text-red-900">
                                    Late Fee: ₹{Number(invoice.calculatedLateFee || invoice.lateFeeAmount || 0).toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-bold">Late Fee: ₹0 (Waived)</span>
                                )}
                              </div>

                              {/* Manage / Waive Days Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenWaiveModal(invoice)}
                                disabled={actionLoading}
                                className="text-[8.5px] bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 mt-0.5"
                                title="Click to waive full or specific number of days"
                              >
                                <Sliders size={9} />
                                <span>Waive / Adjust Days</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="space-y-0.5">
                          {invoice.createdBy?.assignedLocations && invoice.createdBy.assignedLocations.length > 0 ? (
                            invoice.createdBy.assignedLocations.map((al: any, i: number) => (
                              <div key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[9px] font-bold uppercase tracking-wider mr-1">
                                <MapPin size={9} /> {al.location.name}
                              </div>
                            ))
                          ) : (
                            <span className="text-[9px] text-neutral-400">No Node</span>
                          )}
                          <div className="text-[11px] font-bold text-[#1B1C1C] mt-0.5">
                            {invoice.createdBy?.name || 'System'}
                          </div>
                          <div className="text-[9px] text-neutral-400">
                            {invoice.createdBy?.email}
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold">{invoice.cabinName || 'N/A'}</div>
                        <div className="text-[10px] text-[#616161]">
                          {invoice.noOfSeats || 0} seats @ ₹{Number(invoice.ratePerAgreement || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-[#1B1C1C]">
                          {new Date(invoice.sentAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                              invoice.sendType === 'AUTOMATIC_MONTH_END'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <Tag size={9} />
                            {invoice.sendType === 'AUTOMATIC_MONTH_END' ? 'AUTOMATIC MONTH-END' : 'MANUAL DISPATCH'}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 font-bold text-neutral-700">
                        {invoice.billingMonth || 'N/A'}
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-black text-sm text-[var(--primary)]">
                          ₹{Number(invoice.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        {Number(invoice.lateFeeAmount || 0) > 0 ? (
                          <div className="text-[9px] text-red-600 font-bold">
                            Includes ₹{Number(invoice.lateFeeAmount).toLocaleString('en-IN')} Late Fee
                          </div>
                        ) : Number(invoice.waivedLateDays || 0) > 0 ? (
                          <div className="text-[9px] text-emerald-700 font-bold">
                            Late Fee Waived (₹0)
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3">
                        <div className="space-y-1.5">
                          {renderStatusBadge(invoice.status)}

                          {invoice.splitsJson && (() => {
                            let spCount = 0;
                            try { spCount = JSON.parse(invoice.splitsJson || '[]').length; } catch {}
                            if (spCount > 1) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSplitModal(invoice)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 text-[9px] font-bold uppercase tracking-wider rounded cursor-pointer hover:bg-purple-100 transition-colors"
                                  title="Click to view or adjust sub-invoice splits"
                                >
                                  <Scissors size={9} /> Split: {spCount} Sub-Invoices
                                </button>
                              );
                            }
                            return null;
                          })()}

                          {invoice.digitallySignedPdfUrl && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9px] font-bold uppercase rounded">
                              <Award size={10} className="text-emerald-700" /> Digitally Signed
                            </div>
                          )}

                          {/* Show Revision Remarks if rejected by CM */}
                          {invoice.status === 'REJECTED_WITH_REMARKS' && invoice.remarks && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-800 text-[10px] space-y-1">
                              <div className="font-bold flex items-center gap-1">
                                <AlertTriangle size={11} /> CM Revision Remarks:
                              </div>
                              <div className="italic">"{invoice.remarks}"</div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex flex-col gap-1.5 items-center justify-center">
                          {/* CM ACTIONS */}
                          {userRoleView === 'CM' && (
                            <>
                              {invoice.status === 'PENDING_CM_REVIEW' && (
                                <button
                                  onClick={() => handleUpdateStatus(invoice.id, 'SENT_TO_ACCOUNTANT')}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-blue-700 flex items-center gap-1 w-full justify-center shadow-xs"
                                >
                                  <Send size={11} /> Send to Accountant
                                </button>
                              )}

                              {/* Split Invoice Action for CM */}
                              {['PENDING_CM_REVIEW', 'SENT_TO_ACCOUNTANT', 'REJECTED_WITH_REMARKS'].includes(invoice.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSplitModal(invoice)}
                                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-[9.5px] uppercase tracking-wider flex items-center gap-1 w-full justify-center shadow-2xs transition-colors"
                                >
                                  <Scissors size={10} /> {invoice.splitsJson ? 'Adjust Sub-Invoices' : 'Split Invoice'}
                                </button>
                              )}

                              {invoice.status === 'INVOICE_ATTACHED' && (invoice.attachedInvoice || invoice.splitsJson) && (
                                <>
                                  <button
                                    onClick={() => setEntryToReviewInvoice(invoice)}
                                    className="px-3 py-1.5 bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-amber-700 flex items-center gap-1 w-full justify-center shadow-xs"
                                  >
                                    <Eye size={11} /> Review Tally PDF
                                  </button>

                                  <button
                                    onClick={() => {
                                      setTargetInvoiceToSign(invoice);
                                      setShowApplySignatureModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-[#006064] text-white font-bold text-[10px] uppercase tracking-wider hover:bg-teal-900 flex items-center gap-1 w-full justify-center shadow-xs"
                                  >
                                    <PenTool size={11} /> Apply Digital Signature
                                  </button>
                                </>
                              )}

                              {invoice.digitallySignedPdfUrl && (
                                <a
                                  href={invoice.digitallySignedPdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-800 flex items-center gap-1 w-full justify-center shadow-xs"
                                >
                                  <Download size={11} /> Signed PDF
                                </a>
                              )}
                            </>
                          )}

                          {/* ACCOUNTANT ACTIONS */}
                          {userRoleView === 'ACCOUNTANT' && (
                            <>
                              {['SENT_TO_ACCOUNTANT', 'REJECTED_WITH_REMARKS', 'INVOICE_ATTACHED'].includes(invoice.status) ? (
                                <button
                                  onClick={() => {
                                    setEntryToAttachInvoice(invoice);
                                    setSelectedInvoiceFile(null);
                                  }}
                                  className={`px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-white flex items-center justify-center gap-1 w-full shadow-xs ${
                                    invoice.status === 'REJECTED_WITH_REMARKS'
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-[var(--primary)] hover:opacity-90'
                                  }`}
                                >
                                  <Paperclip size={11} />
                                  {invoice.attachedInvoice ? 'Replace Tally PDF' : 'Attach Tally PDF'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                  <CheckCircle2 size={12} /> Finalized
                                </span>
                              )}
                            </>
                          )}

                          <div className="flex items-center gap-1 mt-1 border-t border-neutral-100 pt-1 w-full justify-center">
                            <button
                              onClick={() => setEntryToViewDetails(invoice)}
                              className="p-1 text-neutral-500 hover:text-black hover:bg-neutral-100"
                              title="View details"
                            >
                              <Eye size={12} />
                            </button>
                            {userRoleView === 'CM' && (
                              <button
                                onClick={() => handleOpenEditModal(invoice)}
                                className="p-1 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100"
                                title="Edit invoice record"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="p-1 text-neutral-500 hover:text-red-600 hover:bg-neutral-100"
                              title="Delete invoice record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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

      {/* RENDER ALL INVOICE WORKFLOW MODALS IN A CLEAN PORTAL OVERLAY */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <>
          {/* MODAL 1: Accountant Attach Tally Invoice PDF */}
          <AnimatePresence>
        {entryToAttachInvoice && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-xl space-y-4 shadow-2xl text-xs my-auto max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 shrink-0">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Paperclip size={18} className="text-[var(--primary)]" /> Attach Tally PDF Invoice
                </h3>
                <button
                  onClick={() => {
                    setEntryToAttachInvoice(null);
                    setSelectedInvoiceFile(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 space-y-1 shrink-0">
                <div className="font-bold text-[#1B1C1C] text-sm">Company: {entryToAttachInvoice.companyName}</div>
                <div className="text-[#616161]">
                  SR No: #{entryToAttachInvoice.srNo} | Billing Month: {entryToAttachInvoice.billingMonth}
                </div>
                <div className="font-bold text-[var(--primary)]">
                  Total Amount: ₹{Number(entryToAttachInvoice.totalAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {entryToAttachInvoice.status === 'REJECTED_WITH_REMARKS' && entryToAttachInvoice.remarks && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 space-y-1 shrink-0">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Community Manager Revision Remarks:
                  </div>
                  <div className="italic">"{entryToAttachInvoice.remarks}"</div>
                </div>
              )}

              {/* CHECK IF SPLIT INVOICES EXIST */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                {entryToAttachInvoice.splitsJson && (() => {
                  let splits: InvoiceSplitGroup[] = [];
                  try {
                    splits = JSON.parse(entryToAttachInvoice.splitsJson || '[]');
                  } catch {}

                  if (splits.length > 1) {
                    return (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1.5">
                          <Scissors size={14} className="text-purple-700" />
                          <span>This invoice is split into {splits.length} Sub-Invoices. Please attach a Tally PDF for each:</span>
                        </div>

                        <div className="space-y-3">
                          {splits.map((grp, idx) => (
                            <div key={grp.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[#1B1C1C] text-xs flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 bg-purple-700 text-white text-[10px] rounded">#{idx + 1}</span> {grp.name}
                                </span>
                                <span className="font-mono font-bold text-teal-800 text-xs">
                                  ₹{Number(grp.totalAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>

                              {/* DATES BADGES FOR ACCOUNTANT */}
                              <div className="flex flex-wrap items-center gap-2 text-[10px] bg-purple-50/80 p-1.5 border border-purple-200 rounded text-purple-950 font-medium">
                                <div className="flex items-center gap-1">
                                  <Calendar size={11} className="text-purple-700 shrink-0" />
                                  <span><strong>Invoice Period:</strong> {grp.startDate ? new Date(grp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month Start'} to {grp.endDate ? new Date(grp.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month End'}</span>
                                </div>
                                <span className="text-purple-300">|</span>
                                <div className="flex items-center gap-1 text-red-800 font-bold">
                                  <Clock size={11} className="text-red-600 shrink-0" />
                                  <span>Due Date: {grp.dueDate ? new Date(grp.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (grp.paymentDueDay ? `Day ${grp.paymentDueDay}` : 'Standard')}</span>
                                </div>
                              </div>

                              <div className="text-[10px] text-neutral-500">
                                {grp.noOfSeats} seats | Subtotal: ₹{Number(grp.amount || 0).toLocaleString('en-IN')} + GST: ₹{Number(grp.gstAmount || 0).toLocaleString('en-IN')}
                              </div>

                              {grp.attachedInvoice?.fileUrl ? (
                                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2 rounded text-emerald-900">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-700" />
                                    <div>
                                      <div className="font-bold text-[11px]">{grp.attachedInvoice.fileName}</div>
                                      <div className="text-[9px] text-emerald-700">PDF Attached</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={grp.attachedInvoice.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 bg-white border border-emerald-300 text-emerald-800 font-bold text-[10px] rounded hover:bg-emerald-100"
                                    >
                                      View
                                    </a>
                                    <label className="px-2 py-1 bg-emerald-700 text-white font-bold text-[10px] rounded hover:bg-emerald-800 cursor-pointer">
                                      Replace
                                      <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleUploadSplitPdf(idx, e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUploadSplitPdf(idx, e.target.files[0]);
                                      }
                                    }}
                                    disabled={splitUploadingGroupIndex === idx}
                                    className="w-full bg-white border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700"
                                  />
                                  {splitUploadingGroupIndex === idx && (
                                    <Loader2 size={16} className="animate-spin text-teal-800" />
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Single Invoice PDF Upload (if not split) */}
                {(!entryToAttachInvoice.splitsJson || (() => {
                  try { return JSON.parse(entryToAttachInvoice.splitsJson || '[]').length <= 1; } catch { return true; }
                })()) && (
                  <div className="space-y-2">
                    <label className="block font-bold uppercase text-[#616161]">
                      Select Tally Invoice PDF File *
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedInvoiceFile(e.target.files[0]);
                        }
                      }}
                      className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] px-3 py-2 text-xs"
                    />
                    {selectedInvoiceFile && (
                      <div className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check size={14} /> Selected: {selectedInvoiceFile.name} (
                        {(selectedInvoiceFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEntryToAttachInvoice(null);
                    setSelectedInvoiceFile(null);
                  }}
                  className="px-4 py-2 font-bold uppercase tracking-wider text-[#616161] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                {(!entryToAttachInvoice.splitsJson || (() => {
                  try { return JSON.parse(entryToAttachInvoice.splitsJson || '[]').length <= 1; } catch { return true; }
                })()) ? (
                  <button
                    type="button"
                    onClick={handleUploadInvoicePdf}
                    disabled={uploadingPdf || !selectedInvoiceFile}
                    className="px-6 py-2.5 bg-[var(--primary)] text-white font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploadingPdf ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Uploading PDF...
                      </>
                    ) : (
                      <>
                        <Upload size={14} /> Attach & Send to CM
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEntryToAttachInvoice(null);
                      setSelectedInvoiceFile(null);
                      fetchData();
                    }}
                    className="px-6 py-2.5 bg-emerald-700 text-white font-bold uppercase tracking-wider hover:bg-emerald-800 flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Done / Send to CM
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CM Review Attached Tally Invoice PDF */}
      <AnimatePresence>
        {entryToReviewInvoice && (entryToReviewInvoice.attachedInvoice || entryToReviewInvoice.splitsJson) && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-2xl space-y-4 shadow-2xl text-xs my-auto max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 shrink-0">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Eye size={18} className="text-[var(--primary)]" /> Review Attached Tally Invoice PDF
                </h3>
                <button
                  onClick={() => setEntryToReviewInvoice(null)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 space-y-1 shrink-0">
                <div className="font-bold text-[#1B1C1C] text-sm">Company: {entryToReviewInvoice.companyName}</div>
                <div className="text-[#616161]">
                  SR No: #{entryToReviewInvoice.srNo} | Billing Month: {entryToReviewInvoice.billingMonth}
                </div>
                <div className="font-bold text-[var(--primary)]">
                  Total Amount: ₹{Number(entryToReviewInvoice.totalAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                {/* IF SPLIT INVOICES EXIST */}
                {entryToReviewInvoice.splitsJson && (() => {
                  let splits: InvoiceSplitGroup[] = [];
                  try {
                    splits = JSON.parse(entryToReviewInvoice.splitsJson || '[]');
                  } catch {}

                  if (splits.length > 1) {
                    return (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-purple-50 border border-purple-200 text-purple-900 text-[11px] font-bold flex items-center gap-1.5">
                          <Scissors size={14} className="text-purple-700" />
                          <span>This invoice is split into {splits.length} Sub-Invoices with attached Tally PDFs:</span>
                        </div>

                        <div className="space-y-2.5">
                          {splits.map((grp, idx) => (
                            <div key={grp.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-sm flex items-center justify-between gap-3">
                              <div>
                                <div className="font-extrabold text-[#1B1C1C] text-xs flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 bg-purple-700 text-white text-[10px] rounded">#{idx + 1}</span>
                                  {grp.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] text-purple-900 mt-1">
                                  <span>📅 <strong>Period:</strong> {grp.startDate ? new Date(grp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month Start'} → {grp.endDate ? new Date(grp.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month End'}</span>
                                  <span>•</span>
                                  <span className="text-red-700 font-bold">⏰ <strong>Due:</strong> {grp.dueDate ? new Date(grp.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (grp.paymentDueDay ? `Day ${grp.paymentDueDay}` : 'Standard')}</span>
                                </div>
                                <div className="text-[10px] text-neutral-500 mt-0.5">
                                  {grp.noOfSeats} seats | Total: <strong className="text-teal-900 font-mono">₹{Number(grp.totalAmount || 0).toLocaleString('en-IN')}</strong>
                                </div>
                                {grp.attachedInvoice?.fileName && (
                                  <div className="text-[9.5px] text-emerald-800 font-bold flex items-center gap-1 mt-1">
                                    <FileCheck size={11} /> {grp.attachedInvoice.fileName}
                                  </div>
                                )}
                              </div>

                              {grp.attachedInvoice?.fileUrl ? (
                                <a
                                  href={grp.attachedInvoice.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-[#1B1C1C] text-white font-bold text-[10px] uppercase tracking-wider hover:bg-neutral-800 flex items-center gap-1 rounded shrink-0"
                                >
                                  <Eye size={12} /> View PDF
                                </a>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-1 border border-amber-200 rounded shrink-0">
                                  Pending PDF
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* SINGLE INVOICE PDF REVIEW (if not split) */}
                {entryToReviewInvoice.attachedInvoice && (!entryToReviewInvoice.splitsJson || (() => {
                  try { return JSON.parse(entryToReviewInvoice.splitsJson || '[]').length <= 1; } catch { return true; }
                })()) && (
                  <div className="p-4 border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-red-600" />
                      <div>
                        <div className="font-bold text-[#1B1C1C]">
                          {entryToReviewInvoice.attachedInvoice.fileName}
                        </div>
                        <div className="text-[10px] text-[#616161]">Attached Tally PDF Invoice</div>
                      </div>
                    </div>

                    <a
                      href={entryToReviewInvoice.attachedInvoice.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#1B1C1C] text-white font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                    >
                      <Eye size={14} /> View / Download PDF
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 font-bold uppercase tracking-wider hover:bg-red-100 flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Request Revision / Reject
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(entryToReviewInvoice.id, 'APPROVED')}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 text-white font-bold uppercase tracking-wider hover:bg-emerald-700 flex items-center gap-2 shadow-xs"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve Invoice ✅
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CM Reject Remarks Modal */}
      <AnimatePresence>
        {showRejectModal && entryToReviewInvoice && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-md space-y-4 shadow-xl text-xs"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="text-base font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle size={18} /> Request Revision (CM Remarks)
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#616161] mb-2">
                  Enter Revision Remarks for Accountant *
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain what needs correction in the Tally invoice..."
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] p-3 text-xs focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 font-bold uppercase tracking-wider text-[#616161] hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!rejectRemarks.trim()) {
                      toast.error('Please enter revision remarks');
                      return;
                    }
                    handleUpdateStatus(entryToReviewInvoice.id, 'REJECTED_WITH_REMARKS', rejectRemarks.trim());
                  }}
                  disabled={actionLoading || !rejectRemarks.trim()}
                  className="px-5 py-2.5 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Remarks to Accountant
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3.5: USB DSC & Digital Signing Modal */}
      <AnimatePresence>
        {showApplySignatureModal && targetInvoiceToSign && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-xl space-y-5 shadow-2xl text-xs"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#006064] text-white">
                    <Award size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1B1C1C] uppercase tracking-wide">
                      Apply Digital Signature (DSC)
                    </h3>
                    <p className="text-[10px] text-[#616161]">
                      {targetInvoiceToSign.companyName} | SR #{targetInvoiceToSign.srNo} | Amount: ₹{Number(targetInvoiceToSign.totalAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowApplySignatureModal(false);
                    setTargetInvoiceToSign(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Signatory Settings Preview */}
              <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">Signatory Name</span>
                  <span className="font-bold text-[#1B1C1C]">{signatureSignerName || 'PRAVEEN DILIPKUMAR AGARWAL'}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-neutral-400 block">Designation / Company</span>
                  <span className="font-bold text-[#1B1C1C]">{signatureSignerTitle || 'Director'} | SSPACIA INDIA PVT LTD</span>
                </div>
              </div>

              {/* OPTION A: Physical ProxKey USB Token (Real Class 3 DSC) */}
              <div className="p-4 border-2 border-[#006064]/30 bg-teal-50/40 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-[#006064] flex items-center gap-1.5">
                    <PenTool size={14} /> Method 1: Watchdata ProxKey USB Token (PantaSign Class 3)
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                    bridgeStatus.connected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {bridgeStatus.connected ? '● USB Bridge Connected' : '○ Bridge Disconnected'}
                  </span>
                </div>

                {bridgeStatus.connected ? (
                  <div className="space-y-3">
                    <div className="text-[11px] text-emerald-900 bg-emerald-50 p-2.5 border border-emerald-200 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Hardware USB Token Ready for Cryptographic Signing</div>
                        <div className="text-[10px] text-emerald-800 mt-0.5">
                          Certificate: <span className="font-mono font-bold">PRAVEEN DILIPKUMAR AGARWAL</span> (PantaSign Sub CA for DSC 2022 / CCA India)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSignWithUsbToken(targetInvoiceToSign)}
                      disabled={signingWithUsb}
                      className="w-full py-3 bg-[#006064] hover:bg-[#004d40] text-white font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {signingWithUsb ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Signing with ProxKey USB Token...
                        </>
                      ) : (
                        <>
                          <Award size={16} /> ✍ Sign with ProxKey USB Token (PantaSign Class 3)
                        </>
                      )}
                    </button>
                    <p className="text-[9px] text-center text-neutral-500 italic">
                      Clicking will trigger your ProxKey Token PIN dialog on Windows.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 border border-amber-200 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold">ProxKey USB Bridge is not running on this computer</div>
                        <div className="text-[10px] text-neutral-700 leading-relaxed">
                          1. Plug in your <strong>Watchdata ProxKey USB Dongle</strong>.<br />
                          2. Double-click <strong className="font-mono text-[#006064]">start-dsc-bridge.bat</strong> in the website project folder.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={checkUsbBridge}
                        disabled={bridgeStatus.checking}
                        className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold uppercase text-[10px] tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {bridgeStatus.checking ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Re-Check USB Connection
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* OPTION B: Server-Side High-Speed Digital Stamp */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#1B1C1C] text-[11px]">Method 2: Server-Side Cryptographic Signature</div>
                  <div className="text-[10px] text-neutral-500">Sign immediately with server cryptographic certificate & dynamic timestamp.</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyDigitalSignature(targetInvoiceToSign.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap cursor-pointer"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : '⚡ Fast Server Sign'}
                </button>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplySignatureModal(false);
                    setTargetInvoiceToSign(null);
                  }}
                  className="px-4 py-2 font-bold uppercase tracking-wider text-[#616161] hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Full Invoice Record Viewer */}
      <AnimatePresence>
        {entryToViewDetails && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 sm:p-8 w-full max-w-4xl space-y-6 shadow-2xl my-auto max-h-[88vh] overflow-y-auto text-xs flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5">
                      SR.No #{entryToViewDetails.srNo}
                    </span>
                    {renderStatusBadge(entryToViewDetails.status)}
                    {entryToViewDetails.createdBy?.assignedLocations && entryToViewDetails.createdBy.assignedLocations.length > 0 && (
                      entryToViewDetails.createdBy.assignedLocations.map((al: any, i: number) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold uppercase">
                          <MapPin size={10} /> {al.location.name}
                        </span>
                      ))
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-[#1B1C1C]">
                    {entryToViewDetails.companyName}
                  </h3>
                  <p className="text-[#616161] mt-0.5">
                    Dispatched on {new Date(entryToViewDetails.sentAt).toLocaleDateString('en-IN')} via{' '}
                    <span className="font-bold">{entryToViewDetails.sendType === 'AUTOMATIC_MONTH_END' ? 'AUTOMATIC MONTH-END' : 'MANUAL DISPATCH'}</span> by{' '}
                    <span className="font-bold text-[#1B1C1C]">{entryToViewDetails.createdBy?.name || 'System'}</span> ({entryToViewDetails.createdBy?.email})
                  </p>
                </div>
                <button
                  onClick={() => setEntryToViewDetails(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* SECTION 1: Cabin, Seating & Line-Item Products Breakdown */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <Building2 size={14} /> Cabin, Seating & Billing Amounts
                </div>

                {(() => {
                  let items: any[] = [];
                  if (entryToViewDetails.itemsJson) {
                    try {
                      const parsed = JSON.parse(entryToViewDetails.itemsJson);
                      if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
                    } catch {}
                  }
                  if (items.length === 0 && entryToViewDetails.clientMaster?.products) {
                    items = entryToViewDetails.clientMaster.products;
                  }

                  if (items.length > 0) {
                    return (
                      <div className="space-y-3">
                        {items.map((p: any, idx: number) => {
                          const isParking = p.cabinName?.toLowerCase().includes('parking');
                          return (
                            <div key={idx} className="bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/50 relative">
                              <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
                                <div className="font-extrabold uppercase text-[#006064] text-[10px] tracking-wider flex items-center gap-2">
                                  ITEM #{idx + 1}
                                  {isParking && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider">
                                      PARKING MODE
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono font-bold text-xs text-[#006064]">
                                  Total: ₹{Number(p.totalAmount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                                <div>
                                  <div className="font-bold uppercase text-[#616161] text-[9px]">Cabin / Product Name</div>
                                  <div className="font-bold text-[#1B1C1C] mt-0.5">{p.cabinName || 'N/A'}</div>
                                  {p.note && <div className="text-[10px] text-teal-800 font-medium mt-0.5 italic">{p.note}</div>}
                                </div>

                                <div>
                                  <div className="font-bold uppercase text-[#616161] text-[9px]">
                                    {isParking ? 'No of Parking' : 'No of Seats'}
                                  </div>
                                  <div className="font-bold text-[#1B1C1C] mt-0.5">{p.noOfSeats || 0}</div>
                                </div>

                                <div>
                                  <div className="font-bold uppercase text-[#616161] text-[9px]">Rate As Per Agreement (₹)</div>
                                  <div className="font-bold text-[#1B1C1C] mt-0.5">₹{Number(p.ratePerAgreement || 0).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                  <div className="font-bold uppercase text-[#616161] text-[9px]">Amount (₹)</div>
                                  <div className="font-bold text-blue-700 mt-0.5">₹{Number(p.amount || 0).toLocaleString('en-IN')}</div>
                                </div>

                                <div>
                                  <div className="font-bold uppercase text-[#616161] text-[9px]">GST (%)</div>
                                  <div className="font-bold text-neutral-700 mt-0.5">{p.gstPercent ?? 18}%</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* GRAND TOTAL SUMMARY BAR FOR THIS INVOICE CYCLE */}
                        <div className="p-4 bg-[#00363A] text-white flex flex-wrap items-center justify-between gap-4">
                          <div className="font-extrabold uppercase text-xs tracking-wider">
                            Grand Total (Items Included in Invoice Entry)
                          </div>
                          <div className="flex items-center gap-6 text-xs font-mono">
                            <div>
                              <span className="text-white/70 text-[9px] uppercase tracking-wider block">Total Subtotal</span>
                              <span className="font-bold text-sm">
                                ₹{Number(items.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/70 text-[9px] uppercase tracking-wider block">Total GST</span>
                              <span className="font-bold text-sm">
                                ₹{Number(items.reduce((sum, p) => sum + (Number(p.totalAmount || 0) - Number(p.amount || 0)), 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="bg-white/10 px-3 py-1.5 border border-white/20">
                              <span className="text-white/70 text-[9px] uppercase tracking-wider block">Grand Total</span>
                              <span className="font-black text-base text-emerald-300">
                                ₹{Number(items.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                        <div>
                          <div className="font-bold uppercase text-[#616161] text-[9px]">Cabin Name</div>
                          <div className="font-bold text-[#1B1C1C] mt-0.5 text-sm">{entryToViewDetails.cabinName || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-[#616161] text-[9px]">Seats & Agreement Rate</div>
                          <div className="font-bold text-[#1B1C1C] mt-0.5">
                            {entryToViewDetails.noOfSeats || 0} seats @ ₹
                            {Number(entryToViewDetails.ratePerAgreement || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-[#616161] text-[9px]">GST %</div>
                          <div className="font-bold text-[#1B1C1C] mt-0.5">{entryToViewDetails.gstPercent ?? 18}%</div>
                        </div>
                        <div>
                          <div className="font-bold uppercase text-[#616161] text-[9px]">Total Amount (Amt + GST)</div>
                          <div className="font-black text-base text-[var(--primary)] mt-0.5">
                            ₹{Number(entryToViewDetails.totalAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* SECTION 1.5: Overdue Surcharge & Waive-Off Breakdown */}
              {((entryToViewDetails.totalOverdueDays && entryToViewDetails.totalOverdueDays > 0) || Number(entryToViewDetails.lateFeeAmount || 0) > 0 || Number(entryToViewDetails.waivedLateDays || 0) > 0) && (
                <div className="p-4 bg-red-50/70 border border-red-200 space-y-3 rounded-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-red-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertOctagon size={14} className="text-red-600" />
                      <span>Late Payment Surcharge &amp; Overdue Status</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-red-100 text-red-800 px-2 py-0.5 border border-red-300">
                      Due Date: {entryToViewDetails.dueDate ? new Date(entryToViewDetails.dueDate).toLocaleDateString('en-IN') : `Day ${entryToViewDetails.paymentDueDay || 7} of Month`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 border border-red-200/60 text-xs">
                    <div>
                      <div className="font-bold uppercase text-gray-500 text-[9px]">Total Overdue Days</div>
                      <div className="font-bold text-red-700 mt-0.5 font-mono text-sm">
                        {entryToViewDetails.totalOverdueDays || entryToViewDetails.lateDays || 0} Days
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5">Rate: ₹{Number(entryToViewDetails.lateFeePerDay || 100)}/day</div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-gray-500 text-[9px]">Waived Late Days</div>
                      <div className="font-bold text-emerald-700 mt-0.5 font-mono text-sm">
                        {entryToViewDetails.waivedLateDays || 0} Days
                      </div>
                      <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                        -₹{Number(entryToViewDetails.waivedLateFee || (Number(entryToViewDetails.waivedLateDays || 0) * 100)).toLocaleString('en-IN')} Relaxed
                      </div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-gray-500 text-[9px]">Billed Late Days</div>
                      <div className="font-bold text-gray-900 mt-0.5 font-mono text-sm">
                        {entryToViewDetails.lateDays || 0} Days
                      </div>
                      <div className="text-[9px] text-gray-500 mt-0.5">Chargeable Surcharge</div>
                    </div>

                    <div>
                      <div className="font-bold uppercase text-gray-500 text-[9px]">Effective Late Surcharge</div>
                      <div className="font-black text-sm text-red-700 mt-0.5 font-mono">
                        +₹{Number(entryToViewDetails.lateFeeAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[9px] font-bold text-teal-800 mt-0.5">
                        Invoice Total: ₹{Number(entryToViewDetails.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 1.8: Sub-Invoice Splits Breakdown (if split) */}
              {entryToViewDetails.splitsJson && (() => {
                let splits: InvoiceSplitGroup[] = [];
                try { splits = JSON.parse(entryToViewDetails.splitsJson || '[]'); } catch {}
                if (splits.length > 1) {
                  return (
                    <div className="p-4 bg-purple-50/60 border border-purple-200 space-y-3 rounded-xs">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Scissors size={14} className="text-purple-700" />
                          <span>Sub-Invoice Splits Breakdown ({splits.length} Groups)</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2 py-0.5 border border-purple-300">
                          Product-Wise Split Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {splits.map((grp, gIdx) => (
                          <div key={grp.id} className="bg-white p-3 border border-purple-200 rounded-sm space-y-2">
                            <div className="flex items-center justify-between border-b border-purple-100 pb-1.5">
                              <span className="font-extrabold text-xs text-[#1B1C1C] flex items-center gap-1">
                                <span className="px-1.5 py-0.2 bg-purple-700 text-white text-[9px] rounded">#{gIdx + 1}</span> {grp.name}
                              </span>
                              <span className="font-mono font-bold text-teal-800 text-xs">
                                ₹{Number(grp.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] text-purple-900 bg-purple-50 p-1.5 border border-purple-100 rounded">
                              <span>📅 <strong>Period:</strong> {grp.startDate ? new Date(grp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month Start'} → {grp.endDate ? new Date(grp.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Month End'}</span>
                              <span>•</span>
                              <span className="text-red-700 font-bold">⏰ <strong>Due:</strong> {grp.dueDate ? new Date(grp.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (grp.paymentDueDay ? `Day ${grp.paymentDueDay}` : 'Standard')}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-1 text-[10px] text-neutral-600">
                              <div><span className="text-neutral-400 block">Seats:</span> <strong>{grp.noOfSeats}</strong></div>
                              <div><span className="text-neutral-400 block">Subtotal:</span> <strong>₹{Number(grp.amount || 0).toLocaleString('en-IN')}</strong></div>
                              <div><span className="text-neutral-400 block">GST:</span> <strong>₹{Number(grp.gstAmount || 0).toLocaleString('en-IN')}</strong></div>
                            </div>
                            {grp.attachedInvoice?.fileName && (
                              <div className="pt-1 border-t border-neutral-100 flex items-center justify-between text-[9px]">
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <FileCheck size={10} /> {grp.attachedInvoice.fileName}
                                </span>
                                {grp.attachedInvoice?.fileUrl && (
                                  <a
                                    href={grp.attachedInvoice.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-800 font-bold underline"
                                  >
                                    View PDF
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* SECTION 2: Head Office & GST Details */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <FileText size={14} /> Head Office Address & GST Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Head Office (HO) Address</div>
                    <div className="font-medium text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.hoAddress || 'Not Provided'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">GST Number & Status</div>
                    <div className="font-mono font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.gstNo ? `GST: ${entryToViewDetails.gstNo}` : (entryToViewDetails.clientMaster?.gstStatus || 'UNREGISTERED')}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Agreement Dates, Lock-In & Notice Terms */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <Calendar size={14} /> Agreement Dates, Lock-In & Notice Terms
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Agreement Start Date</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.agreementStartDate
                        ? new Date(entryToViewDetails.clientMaster.agreementStartDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Agreement End Date</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.agreementEndDate
                        ? new Date(entryToViewDetails.clientMaster.agreementEndDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Lock-In End Date</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.lockinEndDate
                        ? new Date(entryToViewDetails.clientMaster.lockinEndDate).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Notice Period</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.noticePeriodMonths
                        ? `${entryToViewDetails.clientMaster.noticePeriodMonths} Months (${entryToViewDetails.clientMaster.noticePeriodApplicable || 'After Lock-in'})`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Escalation %</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.escalationPercent
                        ? `${entryToViewDetails.clientMaster.escalationPercent}%`
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Escalation Applicable Date</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.escalationApplicable
                        ? new Date(entryToViewDetails.clientMaster.escalationApplicable).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: TDS & Security Deposit (SDR) */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                  <Tag size={14} /> TDS Deduction, TAT & Security Deposit (SDR)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8F9FA] p-4 border border-[var(--outline-variant)]/40">
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Will Deduct TDS?</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.willDeductTds ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">TAT Number</div>
                    <div className="font-mono font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.tanNo || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Client ID (Manual)</div>
                    <div className="font-mono font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.clientId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[#616161] text-[9px]">Security Deposit (SDR)</div>
                    <div className="font-bold text-[#1B1C1C] mt-0.5">
                      {entryToViewDetails.clientMaster?.sorAmount
                        ? `₹${Number(entryToViewDetails.clientMaster.sorAmount).toLocaleString('en-IN')}`
                        : 'N/A'}
                      {entryToViewDetails.clientMaster?.sorRecdDate && (
                        <span className="text-[10px] text-neutral-500 font-normal block">
                          SDR Recd: {new Date(entryToViewDetails.clientMaster.sorRecdDate).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Contact Person(s) */}
              {entryToViewDetails.clientMaster?.contactPersons && entryToViewDetails.clientMaster.contactPersons.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] flex items-center gap-1.5">
                    <UserCheck size={14} /> Contact Person(s) Details
                  </div>
                  <div className="border border-[var(--outline-variant)]/40 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F9FA] font-bold text-[#616161] uppercase text-[9px] border-b border-neutral-200">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Designation</th>
                          <th className="p-2.5">Mobile No</th>
                          <th className="p-2.5">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {entryToViewDetails.clientMaster.contactPersons.map((cp, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-[#1B1C1C]">{cp.name}</td>
                            <td className="p-2.5 text-neutral-600">{cp.designation || 'N/A'}</td>
                            <td className="p-2.5 font-mono">{cp.mobileNo || 'N/A'}</td>
                            <td className="p-2.5 font-mono">{cp.email || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 6: Attached Tally PDF Invoice */}
              {entryToViewDetails.attachedInvoice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="text-emerald-700 h-5 w-5" />
                    <div>
                      <span className="font-bold text-emerald-900">Attached Tally Invoice PDF: </span>
                      <span className="text-emerald-800">{entryToViewDetails.attachedInvoice.fileName}</span>
                    </div>
                  </div>
                  <a
                    href={entryToViewDetails.attachedInvoice.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-1.5 bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-800 flex items-center gap-1"
                  >
                    <Eye size={12} /> View Tally PDF
                  </a>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
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

      {/* MODAL 5: EDIT INVOICE RECORD MODAL */}
      <AnimatePresence>
        {entryToEditInvoice && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white border border-[var(--outline-variant)] w-full max-w-4xl shadow-2xl overflow-hidden font-sans text-xs my-auto max-h-[90vh] flex flex-col"
            >
              <div className="p-5 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-white/10 flex items-center justify-center font-bold text-sm">
                    #{entryToEditInvoice.srNo}
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-tight uppercase">
                      Edit Invoice Record & Products (#{entryToEditInvoice.srNo})
                    </h2>
                    <p className="text-xs text-white/80 font-light">
                      Edit details or delete specific product items before sending to the accountant.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEntryToEditInvoice(null)}
                  className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditInvoice} className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Basic Invoice Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-3.5 border border-neutral-200 rounded">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full bg-white border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                      GST No
                    </label>
                    <input
                      type="text"
                      value={editGstNo}
                      onChange={(e) => setEditGstNo(e.target.value)}
                      className="w-full bg-white border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                      Billing Month
                    </label>
                    <input
                      type="text"
                      value={editBillingMonth}
                      onChange={(e) => setEditBillingMonth(e.target.value)}
                      placeholder="e.g. August 2026"
                      className="w-full bg-white border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                      Cabin Name / Invoice Summary
                    </label>
                    <input
                      type="text"
                      value={editCabinName}
                      onChange={(e) => setEditCabinName(e.target.value)}
                      placeholder="e.g. Dedicated Cabin, Flex Desk"
                      className="w-full bg-white border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                      Workflow Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-white border border-[var(--outline-variant)] px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#006064]"
                    >
                      <option value="PENDING_CM_REVIEW">Pending CM Review</option>
                      <option value="SENT_TO_ACCOUNTANT">Sent to Accountant</option>
                      <option value="INVOICE_ATTACHED">Invoice Attached</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED_WITH_REMARKS">Rejected with Remarks</option>
                    </select>
                  </div>
                </div>

                {/* INVOICE PRODUCTS & LINE ITEMS (EDITABLE & DELETABLE) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-900 uppercase flex items-center gap-1.5">
                        <Package size={14} className="text-[#006064]" />
                        <span>Invoice Products & Line Items ({editItems.length})</span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        You can edit quantities, rates, or <strong>delete specific products</strong> before sending to accountant.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddEditItem}
                      className="px-3 py-1 bg-teal-50 text-[#006064] hover:bg-teal-100 border border-teal-300 font-bold text-[11px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Plus size={12} /> Add Product Item
                    </button>
                  </div>

                  {editItems.length === 0 ? (
                    <div className="p-6 bg-red-50 border border-red-200 text-center rounded text-red-800 text-xs font-medium space-y-2">
                      <div>⚠️ No product items left on this invoice.</div>
                      <button
                        type="button"
                        onClick={handleAddEditItem}
                        className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs uppercase rounded"
                      >
                        + Add a Product
                      </button>
                    </div>
                  ) : (
                    <div className="border border-neutral-300 rounded overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-neutral-100 text-neutral-700 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-300">
                          <tr>
                            <th className="p-2 w-8 text-center">#</th>
                            <th className="p-2">Product / Cabin Name</th>
                            <th className="p-2 w-20 text-center">Seats</th>
                            <th className="p-2 w-28 text-right">Rate (₹)</th>
                            <th className="p-2 w-28 text-right">Amount (₹)</th>
                            <th className="p-2 w-16 text-center">GST %</th>
                            <th className="p-2 w-32 text-right">Total (₹)</th>
                            <th className="p-2 w-16 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 bg-white font-sans">
                          {editItems.map((item, itIdx) => (
                            <tr key={itIdx} className="hover:bg-teal-50/40 transition-colors">
                              <td className="p-2 text-center font-bold text-neutral-500 text-[11px]">
                                {itIdx + 1}
                              </td>

                              <td className="p-2">
                                <input
                                  type="text"
                                  required
                                  value={item.cabinName}
                                  onChange={(e) => handleUpdateEditItem(itIdx, 'cabinName', e.target.value)}
                                  placeholder="e.g. Dedicated Cabin"
                                  className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-bold text-black rounded focus:outline-none focus:border-[#006064]"
                                />
                                {item.note && (
                                  <div className="text-[10px] text-amber-700 italic mt-0.5">{item.note}</div>
                                )}
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.noOfSeats}
                                  onChange={(e) => handleUpdateEditItem(itIdx, 'noOfSeats', e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-bold text-black text-center rounded focus:outline-none focus:border-[#006064]"
                                />
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.ratePerAgreement}
                                  onChange={(e) => handleUpdateEditItem(itIdx, 'ratePerAgreement', e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-bold text-black text-right rounded focus:outline-none focus:border-[#006064]"
                                />
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.amount}
                                  onChange={(e) => handleUpdateEditItem(itIdx, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-white border border-neutral-300 px-2 py-1 text-xs font-bold text-black text-right font-mono rounded focus:outline-none focus:border-[#006064]"
                                />
                              </td>

                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.gstPercent}
                                  onChange={(e) => handleUpdateEditItem(itIdx, 'gstPercent', e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-white border border-neutral-300 px-1 py-1 text-xs font-bold text-black text-center rounded focus:outline-none focus:border-[#006064]"
                                />
                              </td>

                              <td className="p-2 text-right font-mono font-black text-emerald-800 text-xs">
                                ₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}
                              </td>

                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEditItem(itIdx)}
                                  className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded transition-colors cursor-pointer"
                                  title="Delete this product from the invoice"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* LIVE RECALCULATED TOTALS CARD */}
                <div className="p-4 bg-teal-50/80 border-2 border-teal-600/60 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-900">
                      Recalculated Invoice Summary:
                    </div>
                    <div className="text-xs text-teal-950 font-bold">
                      {editItems.length} Product Line Item{editItems.length !== 1 ? 's' : ''} • {editNoOfSeats} Total Seats
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-neutral-500 uppercase">Subtotal Amount</div>
                      <div className="font-mono font-bold text-neutral-900 text-sm">
                        ₹{Number(editAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] font-bold text-neutral-500 uppercase">GST (18%)</div>
                      <div className="font-mono font-bold text-neutral-700 text-sm">
                        ₹{Math.max(0, Number(editTotalAmount || 0) - Number(editAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right bg-white px-3 py-1.5 rounded border border-teal-300 shadow-xs">
                      <div className="text-[9px] font-bold text-teal-900 uppercase">Grand Total (Incl. GST)</div>
                      <div className="font-mono font-black text-emerald-800 text-base">
                        ₹{Number(editTotalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setEntryToEditInvoice(null)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1B1C1C] font-bold text-xs uppercase tracking-wider rounded"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={actionLoading || editItems.length === 0}
                    className="px-5 py-2.5 bg-[#006064] hover:bg-teal-900 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save Invoice Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: DIGITAL SIGNATURE STAMP SETTINGS */}
      <AnimatePresence>
        {showSignatureSettingsModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white border border-[var(--outline-variant)] w-full max-w-lg shadow-2xl overflow-hidden font-sans text-xs my-auto max-h-[88vh] flex flex-col"
            >
              <div className="p-5 bg-[#006064] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <PenTool className="h-5 w-5" />
                  <div>
                    <h2 className="text-base font-bold tracking-tight uppercase">
                      Official Digital Signature Stamp Hub
                    </h2>
                    <p className="text-xs text-white/80 font-light">
                      Upload or change your electronic signature stamp for 1-click invoice signing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSignatureSettingsModal(false)}
                  className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSignatureSettings} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                    Signatory Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Authorized Signatory / CM Name"
                    value={signatureSignerName}
                    onChange={(e) => setSignatureSignerName(e.target.value)}
                    className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006064]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                    Signatory Designation / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Community Manager"
                    value={signatureSignerTitle}
                    onChange={(e) => setSignatureSignerTitle(e.target.value)}
                    className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#006064]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#616161] mb-1">
                    Upload Signature Image / Stamp (Transparent PNG Recommended)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewSignatureFile(e.target.files[0]);
                      }
                    }}
                    className="w-full bg-white border border-[var(--outline-variant)] px-3 py-2 text-xs"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    A clear transparent PNG image works best on invoice PDFs.
                  </p>
                </div>

                {/* Stamp Visual Live Preview */}
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-bold uppercase text-neutral-600">
                    Official Adobe Signature Box Preview on Invoice PDF:
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-300 rounded space-y-1">
                    <div className="font-bold text-[11px] text-black">
                      for {signatureSetting.companyName || 'SSPACIA INDIA PVT LTD'}
                    </div>

                    <div className="p-3 bg-white border-2 border-black grid grid-cols-2 gap-3 relative shadow-xs">
                      {/* Watermark preview */}
                      {(newSignatureFile || signatureSetting.signatureUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none p-1">
                          {newSignatureFile ? (
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-200">
                              [{newSignatureFile.name}]
                            </span>
                          ) : (
                            <img src={signatureSetting.signatureUrl} alt="" className="max-h-12 object-contain" />
                          )}
                        </div>
                      )}

                      <div className="font-black text-xs text-black leading-snug">
                        {(signatureSignerName || 'PRAVEEN DILIPKUMAR AGARWAL').split(' ').filter(Boolean).map((part: string, idx: number) => (
                          <div key={idx}>{part}</div>
                        ))}
                      </div>

                      <div className="text-[9px] text-black space-y-0.5 font-sans leading-tight">
                        <div>Digitally signed by {(signatureSignerName || 'PRAVEEN DILIPKUMAR AGARWAL').split(' ')[0]}</div>
                        <div>{(signatureSignerName || 'PRAVEEN DILIPKUMAR AGARWAL').split(' ').slice(1).join(' ')}</div>
                        <div>Date: 2026.08.20 {new Date().toLocaleTimeString('en-GB')}</div>
                        <div>+05'30'</div>
                      </div>
                    </div>

                    <div className="text-center font-bold text-[10px] text-black pt-0.5">
                      Authorised Signatory
                    </div>
                  </div>

                  <div className="p-2.5 bg-teal-50 border border-teal-200 text-teal-900 text-[10px] space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <Award size={12} className="text-[#006064]" /> ProxKey USB Dongle Support:
                    </div>
                    <div>
                      When signing an invoice row, you can choose between <strong>ProxKey USB Hardware Token (PantaSign Class 3)</strong> or <strong>Fast Server-Side Cryptographic Sign</strong>.
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowSignatureSettingsModal(false)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#1B1C1C] font-bold text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={uploadingSignature}
                    className="px-5 py-2 bg-[#006064] hover:bg-teal-900 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                  >
                    {uploadingSignature ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save Stamp Settings
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: FLEXIBLE LATE FEE SURCHARGE & WAIVE DAYS MANAGER */}
      <AnimatePresence>
        {waiveModalInvoice && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-gray-300 w-full max-w-lg shadow-2xl overflow-hidden text-xs my-auto max-h-[90vh] flex flex-col rounded-xs"
            >
              {/* HEADER */}
              <div className="p-5 bg-gradient-to-r from-red-900 to-[#1B1C1C] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-600/30 border border-red-400/50 rounded-full flex items-center justify-center font-bold">
                    <Sliders size={18} className="text-red-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-tight">
                      Waive / Adjust Late Fee Surcharge
                    </h2>
                    <p className="text-[11px] text-red-200/80">
                      Choose exactly how many overdue days to waive for this invoice.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWaiveModalInvoice(null)}
                  className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CONTENT */}
              <form onSubmit={handleSaveWaiveModal} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* COMPANY & OVERDUE SUMMARY */}
                <div className="bg-neutral-50 p-4 border border-neutral-200 space-y-2 rounded-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 text-sm">{waiveModalInvoice.companyName}</span>
                    <span className="font-mono text-[10px] font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5">
                      SR #{waiveModalInvoice.srNo}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/70 text-[11px]">
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Overdue</span>
                      <span className="font-mono font-bold text-red-700">
                        {waiveModalInvoice.totalOverdueDays || waiveModalInvoice.calculatedLateDays || 0} Days
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Daily Rate</span>
                      <span className="font-mono font-bold text-gray-800">
                        ₹{Number(waiveModalInvoice.lateFeePerDay || 100)} / day
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase font-bold block">Max Surcharge</span>
                      <span className="font-mono font-bold text-red-700">
                        ₹{((waiveModalInvoice.totalOverdueDays || waiveModalInvoice.calculatedLateDays || 0) * Number(waiveModalInvoice.lateFeePerDay || 100)).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WAIVE DAYS INPUT & CALCULATION PREVIEW */}
                {(() => {
                  const totalOverdue = waiveModalInvoice.totalOverdueDays || waiveModalInvoice.calculatedLateDays || 0;
                  const ratePerDay = Number(waiveModalInvoice.lateFeePerDay || 100);
                  const parsedWaived = parseInt(waiveDaysInput, 10);
                  const waivedDays = isNaN(parsedWaived) ? 0 : Math.max(0, Math.min(totalOverdue, parsedWaived));
                  const chargeableDays = Math.max(0, totalOverdue - waivedDays);
                  const newLateFee = chargeableDays * ratePerDay;
                  const waivedFee = waivedDays * ratePerDay;
                  const prevLateFee = Number(waiveModalInvoice.lateFeeAmount || 0);
                  const baseTotal = Math.max(0, (Number(waiveModalInvoice.totalAmount) || 0) - prevLateFee);
                  const newTotal = baseTotal + newLateFee;

                  return (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          How many days do you want to waive off? (0 to {totalOverdue} days)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max={totalOverdue}
                            value={waiveDaysInput}
                            onChange={(e) => setWaiveDaysInput(e.target.value)}
                            placeholder="e.g. 5"
                            className="w-full bg-white border border-gray-300 px-3 py-2 text-sm font-mono font-bold text-gray-900 outline-none focus:border-[#006064] focus:ring-1 focus:ring-[#006064]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            / {totalOverdue} days
                          </span>
                        </div>
                      </div>

                      {/* QUICK PRESET SHORTCUTS */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setWaiveDaysInput(String(totalOverdue))}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                        >
                          🎉 Waive All ({totalOverdue} Days)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaiveDaysInput(String(Math.floor(totalOverdue / 2)))}
                          className="px-2.5 py-1 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 text-[10px] font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                        >
                          ⚖️ Waive 50% ({Math.floor(totalOverdue / 2)} Days)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaiveDaysInput("0")}
                          className="px-2.5 py-1 bg-red-50 text-red-800 hover:bg-red-100 border border-red-300 text-[10px] font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                        >
                          🛑 Charge All (0 Days Waived)
                        </button>
                      </div>

                      {/* CALCULATION LIVE PREVIEW CARD */}
                      <div className="bg-gradient-to-br from-teal-50 to-neutral-50 p-4 border border-teal-200/80 rounded-xs space-y-2 font-sans shadow-2xs">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#006064] border-b border-teal-200/60 pb-1 flex items-center justify-between">
                          <span>Live Surcharge Breakdown:</span>
                          <span className="font-mono">Real-time Calculation</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2.5 border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 font-bold uppercase block">Waived Surcharge</span>
                            <span className="text-base font-black text-emerald-700 font-mono">
                              -₹{waivedFee.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-emerald-600 block mt-0.5">({waivedDays} days relaxed)</span>
                          </div>

                          <div className="bg-white p-2.5 border border-red-200">
                            <span className="text-[10px] text-red-800 font-bold uppercase block">Chargeable Surcharge</span>
                            <span className="text-base font-black text-red-700 font-mono">
                              +₹{newLateFee.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-red-600 block mt-0.5">({chargeableDays} days billed @ ₹{ratePerDay})</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-teal-200/70 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-gray-500 text-[10px] block">Base Invoice Amount:</span>
                            <span className="font-bold text-gray-800 font-mono">₹{baseTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#006064] text-[10px] font-bold uppercase block">New Final Total Amount:</span>
                            <span className="text-base font-black text-teal-900 font-mono">₹{newTotal.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setWaiveModalInvoice(null)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#006064] hover:bg-teal-900 text-white font-bold text-xs uppercase tracking-wider rounded-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Confirm &amp; Apply Waive Off</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: CM SPLIT INVOICE (PRODUCT-WISE) MODAL */}
      <AnimatePresence>
        {splitModalInvoice && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-3xl space-y-4 shadow-2xl text-xs my-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                    <Scissors size={18} className="text-purple-700" />
                    <span>Split Invoice (Product-Wise)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Group products into separate sub-invoices for the accountant to attach distinct Tally PDFs. The parent company record stays unified.
                  </p>
                </div>
                <button
                  onClick={() => setSplitModalInvoice(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Invoice Info Bar */}
              <div className="bg-[#F8F9FA] p-3 border border-[var(--outline-variant)]/60 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div>
                  <span className="font-bold text-[#1B1C1C] text-xs">{splitModalInvoice.companyName}</span>
                  <span className="text-neutral-500 text-[10px] ml-2">SR #{splitModalInvoice.srNo} | {splitModalInvoice.billingMonth}</span>
                </div>
                <div className="font-bold text-xs text-[#006064]">
                  Parent Invoice Total: ₹{Number(splitModalInvoice.totalAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Split Groups List & Allocation */}
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Sub-Invoice Groups Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                      <Package size={14} className="text-purple-700" /> Sub-Invoice Groups ({splitGroups.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSplitGroup}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 rounded cursor-pointer transition-colors"
                    >
                      <Plus size={12} /> Add Another Sub-Invoice
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {splitGroups.map((group, gIdx) => (
                      <div key={group.id} className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-sm space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => handleUpdateSplitGroupField(group.id, 'name', e.target.value)}
                            className="font-extrabold text-xs text-purple-950 bg-white border border-purple-300 px-2 py-1 rounded w-full focus:outline-none focus:border-purple-600 shadow-2xs"
                            placeholder={`Sub-Invoice #${gIdx + 1}`}
                          />
                          {splitGroups.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSplitGroup(group.id)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              title="Remove group"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* INVOICE BILLING PERIOD & DUE DATE INPUTS */}
                        <div className="grid grid-cols-3 gap-2 bg-white p-2.5 border border-purple-100 rounded text-[10px]">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">
                              Invoice Start
                            </label>
                            <input
                              type="date"
                              value={group.startDate || ''}
                              onChange={(e) => handleUpdateSplitGroupField(group.id, 'startDate', e.target.value)}
                              className="w-full bg-neutral-50 border border-gray-200 px-1.5 py-1 text-[10px] font-mono rounded focus:bg-white focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-gray-500 mb-0.5">
                              Invoice End
                            </label>
                            <input
                              type="date"
                              value={group.endDate || ''}
                              onChange={(e) => handleUpdateSplitGroupField(group.id, 'endDate', e.target.value)}
                              className="w-full bg-neutral-50 border border-gray-200 px-1.5 py-1 text-[10px] font-mono rounded focus:bg-white focus:border-purple-600"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-red-600 mb-0.5">
                              Payment Due Date
                            </label>
                            <input
                              type="date"
                              value={group.dueDate || ''}
                              onChange={(e) => handleUpdateSplitGroupField(group.id, 'dueDate', e.target.value)}
                              className="w-full bg-neutral-50 border border-red-200 px-1.5 py-1 text-[10px] font-mono font-bold text-red-700 rounded focus:bg-white focus:border-red-600"
                              title="Last date for client to pay this sub-invoice"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white p-2 border border-purple-100 rounded text-[11px]">
                          <div>
                            <span className="text-neutral-500">Seats:</span> <strong className="text-neutral-800">{group.noOfSeats}</strong>
                            <span className="mx-1.5 text-neutral-300">|</span>
                            <span className="text-neutral-500">Items:</span> <strong className="text-neutral-800">{group.productIndices.length}</strong>
                          </div>
                          <div className="font-mono font-bold text-teal-800">
                            ₹{Number(group.totalAmount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Items Assignment Table */}
                <div className="space-y-2 pt-2 border-t border-neutral-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Assign Each Product to a Sub-Invoice:
                  </h4>

                  {(() => {
                    let items: any[] = [];
                    try {
                      items = JSON.parse(splitModalInvoice.itemsJson || '[]');
                    } catch {}
                    if (items.length === 0) {
                      items = [{
                        cabinName: splitModalInvoice.cabinName || 'Workspace',
                        noOfSeats: splitModalInvoice.noOfSeats || 1,
                        amount: splitModalInvoice.amount || 0,
                        gstPercent: splitModalInvoice.gstPercent || 18,
                        totalAmount: splitModalInvoice.totalAmount || 0,
                      }];
                    }

                    return (
                      <div className="border border-neutral-200 rounded-sm overflow-hidden">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-neutral-200 font-bold uppercase text-[#616161]">
                              <th className="p-2.5">#</th>
                              <th className="p-2.5">Product / Cabin</th>
                              <th className="p-2.5 text-center">Seats</th>
                              <th className="p-2.5 text-center">Product Due Day</th>
                              <th className="p-2.5 text-right">Subtotal</th>
                              <th className="p-2.5 text-right">Total (Incl GST)</th>
                              <th className="p-2.5 text-center">Assigned Sub-Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {items.map((item, pIdx) => {
                              const currentGroup = splitGroups.find(g => g.productIndices.includes(pIdx));
                              return (
                                <tr key={pIdx} className="hover:bg-neutral-50/70">
                                  <td className="p-2.5 font-mono text-neutral-500 font-bold">{pIdx + 1}</td>
                                  <td className="p-2.5 font-bold text-[#1B1C1C]">
                                    {item.cabinName || 'Workspace item'}
                                    {item.billingType === 'PRORATED' && (
                                      <span className="ml-1 text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">
                                        Prorated
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-semibold">{item.noOfSeats || 0}</td>
                                  <td className="p-2.5 text-center font-mono text-[10px] text-gray-600">
                                    <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">
                                      Due: Day {item.paymentDueDay || splitModalInvoice.paymentDueDay || 5}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono">₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-teal-800">₹{Number(item.totalAmount || 0).toLocaleString('en-IN')}</td>
                                  <td className="p-2.5 text-center">
                                    <select
                                      value={currentGroup?.id || ''}
                                      onChange={(e) => handleUpdateProductGroupAssignment(pIdx, e.target.value)}
                                      className="bg-white border border-purple-300 text-purple-950 font-bold px-2 py-1 text-[11px] rounded focus:outline-none focus:border-purple-600 shadow-2xs"
                                    >
                                      {splitGroups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                          {g.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200 shrink-0">
                <div>
                  {splitModalInvoice.splitsJson && (
                    <button
                      type="button"
                      onClick={handleResetSplitToSingle}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} /> Reset to Single Invoice
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSplitModalInvoice(null)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-[#616161] hover:bg-neutral-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSplitInvoice}
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold uppercase tracking-wider flex items-center gap-2 rounded shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Save Split Invoices</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>,
    document.body
  )}

        </>
      )}
    </div>
  );
}

