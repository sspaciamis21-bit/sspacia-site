'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Percent,
  Building2,
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  FileText,
  DollarSign,
  Download,
  Printer,
  ChevronRight,
  X,
  RefreshCw,
  Coins,
  CreditCard,
  Tag,
  Briefcase,
  Layers,
  ArrowLeft,
  Check,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';

interface ExecutiveExpenseItem {
  id: number;
  title: string;
  locationId: number | null;
  locationName: string;
  category: string;
  amount: number;
  isProvisional: boolean;
  expenseDate: string;
  paymentMode: string;
  referenceNo: string;
  vendorPayee: string;
  notes: string;
  createdById: number | null;
  createdAt: string;
}

interface ExecutiveExpensesApiResponse {
  success: boolean;
  locations: Array<{ id: number; name: string; slug: string }>;
  expenses: ExecutiveExpenseItem[];
  analytics: {
    totalRevenue: number;
    totalSettledExpenses: number;
    totalProvisionalExpenses: number;
    totalAllExpenses: number;
    grossProfitWithoutProvisional: number;
    grossProfitMarginWithoutProvisional: number;
    grossProfitWithProvisional: number;
    grossProfitMarginWithProvisional: number;
    categoryTotals: Record<string, { settled: number; provisional: number; total: number; count: number }>;
    centreTotals: Record<string, { total: number; settled: number; provisional: number }>;
    count: {
      total: number;
      settled: number;
      provisional: number;
    };
  };
}

const CATEGORIES = [
  { id: 'RENT_LEASE', label: 'Rent & Property Lease', icon: Building2, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'ELECTRICITY_UTILITIES', label: 'Electricity & Utilities', icon: Zap, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'FITOUT_CAPEX', label: 'Fitout & Capex Expansion', icon: Layers, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'LEGAL_COMPLIANCE', label: 'Legal & Compliance', icon: ShieldCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { id: 'SALARIES_MGMT', label: 'Salaries & Management', icon: Briefcase, color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { id: 'MARKETING_SALES', label: 'Marketing & Acquisition', icon: Sparkles, color: 'text-pink-700 bg-pink-50 border-pink-200' },
  { id: 'MAINTENANCE_REPAIRS', label: 'Maintenance & Repairs', icon: RefreshCw, color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { id: 'MISCELLANEOUS', label: 'Operations & Misc', icon: Tag, color: 'text-neutral-700 bg-neutral-100 border-neutral-200' },
];

export function ExecutiveExpensesClient() {
  const [data, setData] = useState<ExecutiveExpensesApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [provisionalFilter, setProvisionalFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ── Executive Gross Profit Option: Include Provisional or Not (Y / N) ──
  const [includeProvisionalInGrossProfit, setIncludeProvisionalInGrossProfit] = useState<boolean>(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExecutiveExpenseItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formLocationId, setFormLocationId] = useState<string>('ALL');
  const [formCategory, setFormCategory] = useState<string>('RENT_LEASE');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formIsProvisional, setFormIsProvisional] = useState<boolean>(false);
  const [formExpenseDate, setFormExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formPaymentMode, setFormPaymentMode] = useState<string>('Bank Transfer');
  const [formReferenceNo, setFormReferenceNo] = useState<string>('');
  const [formVendorPayee, setFormVendorPayee] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocation !== 'ALL') params.set('locationId', selectedLocation);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (provisionalFilter !== 'ALL') params.set('provisional', provisionalFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/executive-expenses?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load executive expenses');
      }
      const json: ExecutiveExpensesApiResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error('[Executive Expenses Fetch Error]', err);
      toast.error('Failed to load executive expense telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, selectedCategory, provisionalFilter, searchQuery]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormTitle('');
    setFormLocationId(selectedLocation !== 'ALL' ? selectedLocation : 'ALL');
    setFormCategory('RENT_LEASE');
    setFormAmount('');
    setFormIsProvisional(false);
    setFormExpenseDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMode('Bank Transfer');
    setFormReferenceNo('');
    setFormVendorPayee('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ExecutiveExpenseItem) => {
    setEditingExpense(item);
    setFormTitle(item.title);
    setFormLocationId(item.locationId ? String(item.locationId) : 'ALL');
    setFormCategory(item.category || 'MISCELLANEOUS');
    setFormAmount(String(item.amount));
    setFormIsProvisional(item.isProvisional);
    setFormExpenseDate(item.expenseDate ? item.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormPaymentMode(item.paymentMode || 'Bank Transfer');
    setFormReferenceNo(item.referenceNo || '');
    setFormVendorPayee(item.vendorPayee || '');
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Please enter an expense title.');
      return;
    }
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        locationId: formLocationId === 'ALL' ? null : Number(formLocationId),
        category: formCategory,
        amount: numAmount,
        isProvisional: formIsProvisional,
        expenseDate: formExpenseDate,
        paymentMode: formPaymentMode,
        referenceNo: formReferenceNo.trim(),
        vendorPayee: formVendorPayee.trim(),
        notes: formNotes.trim(),
      };

      let res: Response;
      if (editingExpense) {
        res = await fetch(`/api/admin/executive-expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/admin/executive-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to save expense entry');
      }

      toast.success(
        editingExpense
          ? 'Executive expense updated successfully.'
          : 'New executive expense recorded successfully.'
      );
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      console.error('[Save Expense Error]', err);
      toast.error(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete executive expense entry "${title}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/executive-expenses/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to delete expense entry');
      }
      toast.success('Expense entry deleted.');
      fetchExpenses();
    } catch (err: any) {
      console.error('[Delete Expense Error]', err);
      toast.error(err.message || 'Failed to delete expense');
    }
  };

  const handleToggleProvisionalDirect = async (item: ExecutiveExpenseItem) => {
    try {
      const updatedProvisional = !item.isProvisional;
      const res = await fetch(`/api/admin/executive-expenses/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          isProvisional: updatedProvisional,
        }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(
        updatedProvisional
          ? 'Marked as Provisional Estimate.'
          : 'Marked as Settled Outflow.'
      );
      fetchExpenses();
    } catch (err: any) {
      toast.error('Failed to update provisional status');
    }
  };

  // Live Computed Gross Profit Values based on Sir's Y/N Option
  const analytics = data?.analytics;
  const totalRevenue = analytics?.totalRevenue ?? 1614700;
  const settledExpenses = analytics?.totalSettledExpenses ?? 0;
  const provisionalExpenses = analytics?.totalProvisionalExpenses ?? 0;

  const activeConsideredExpenses = includeProvisionalInGrossProfit
    ? settledExpenses + provisionalExpenses
    : settledExpenses;

  const activeGrossProfit = totalRevenue - activeConsideredExpenses;
  const activeGrossProfitMargin =
    totalRevenue > 0 ? ((activeGrossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const categoryLookup = useMemo(() => {
    return new Map(CATEGORIES.map((c) => [c.id, c]));
  }, []);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* ── 1. Top Executive Navigation & Header Bar ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#006064] mb-1">
              <ShieldCheck size={15} /> Super Admin Exclusive • Private Record Keeping
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-[#1B1C1C] tracking-tight uppercase flex items-center gap-2.5">
              <span>Executive Expenses &amp; Gross Profit %</span>
            </h1>
            <p className="text-gray-500 font-light text-xs mt-0.5 max-w-2xl">
              Private executive record keeping module for Sir. Track operational and capital outflows, evaluate provisional pending bills, and compute dynamic Gross Profit percentage without polluting general centre accounting ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/dashboard"
              className="px-3.5 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-102 active:scale-98"
            >
              <Plus size={16} />
              <span>Add Executive Expense</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── 2. EXECUTIVE GROSS PROFIT % INTELLIGENCE HUD (With Y/N Option) ── */}
      <FadeUp delay={0.05}>
        <div className="bg-gradient-to-br from-[#004D40] via-[#006064] to-[#00363A] text-white rounded-lg p-5 sm:p-7 shadow-xl border border-teal-500/30 relative overflow-hidden">
          
          {/* Ambient Blueprint Glow */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Metric Title & Dynamic Option Toggle */}
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] font-bold text-teal-200 uppercase tracking-wider">
                <Sparkles size={13} className="text-amber-300" />
                <span>Executive Telemetry Engine</span>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
                  Gross Profit Margin: <span className="text-amber-300 font-mono text-2xl sm:text-3xl font-black">{activeGrossProfitMargin}%</span>
                </h2>
                <p className="text-teal-100/80 text-xs font-light mt-1">
                  Net Realized Earnings: <strong className="text-white font-mono font-bold">{formatINR(activeGrossProfit)}</strong> computed against total active monthly agreement run-rate of <strong className="text-white font-mono font-bold">{formatINR(totalRevenue)}</strong>.
                </p>
              </div>

              {/* ── SIR'S CORE OPTION: Include Provisional or Not (Y / N) ── */}
              <div className="pt-2">
                <div className="bg-black/30 backdrop-blur-md p-2.5 rounded-md border border-white/20 inline-flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-100 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-amber-300" />
                    Calculate With Provisional Expenses?
                  </span>

                  <div className="flex items-center gap-1 bg-neutral-900/80 p-0.5 rounded border border-neutral-700">
                    <button
                      type="button"
                      onClick={() => setIncludeProvisionalInGrossProfit(true)}
                      className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer rounded-xs flex items-center gap-1 ${
                        includeProvisionalInGrossProfit
                          ? 'bg-amber-500 text-neutral-950 shadow-md scale-102'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>Y (YES)</span>
                      <span className="text-[10px] opacity-80">• With Provisional</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeProvisionalInGrossProfit(false)}
                      className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer rounded-xs flex items-center gap-1 ${
                        !includeProvisionalInGrossProfit
                          ? 'bg-emerald-500 text-neutral-950 shadow-md scale-102'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>N (NO)</span>
                      <span className="text-[10px] opacity-80">• Settled Only</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Quick Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              
              {/* Card 1: Revenue Baseline */}
              <div className="bg-black/25 backdrop-blur-md p-3.5 rounded border border-white/15">
                <span className="text-[10px] uppercase font-bold text-teal-200 tracking-wider block">
                  Monthly Revenue Run-Rate
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-white mt-0.5 block">
                  {formatINR(totalRevenue)}
                </span>
                <span className="text-[10px] text-teal-200/70 block mt-0.5">
                  Corporate Agreements
                </span>
              </div>

              {/* Card 2: Settled Expenses */}
              <div className="bg-black/25 backdrop-blur-md p-3.5 rounded border border-white/15">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Settled Outflow
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-200 mt-0.5 block">
                  {formatINR(settledExpenses)}
                </span>
                <span className="text-[10px] text-emerald-200/70 block mt-0.5">
                  Confirmed &amp; Disbursed
                </span>
              </div>

              {/* Card 3: Provisional Estimates */}
              <div className={`p-3.5 rounded border transition-all ${
                includeProvisionalInGrossProfit
                  ? 'bg-amber-400/20 border-amber-400/40 ring-1 ring-amber-400/40'
                  : 'bg-black/25 border-white/15 opacity-60'
              }`}>
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Provisional (Pending)
                </span>
                <span className="text-base sm:text-lg font-mono font-black text-amber-200 mt-0.5 block">
                  {formatINR(provisionalExpenses)}
                </span>
                <span className="text-[10px] text-amber-200/80 block mt-0.5">
                  {includeProvisionalInGrossProfit ? '✓ Included in Margin' : '✕ Excluded from Margin'}
                </span>
              </div>

            </div>

          </div>

        </div>
      </FadeUp>

      {/* ── 3. Interactive Filter Bar (Centre, Category, Provisional Y/N, Search) ── */}
      <FadeUp delay={0.1}>
        <div className="bg-white p-4 border border-neutral-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Centre Filter */}
            <div className="flex items-center gap-1 bg-neutral-50 px-2.5 py-1.5 border border-neutral-200">
              <Building2 size={14} className="text-[#006064]" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Centres (Global HQ)</option>
                {data?.locations.map((loc) => (
                  <option key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-neutral-50 px-2.5 py-1.5 border border-neutral-200">
              <Tag size={14} className="text-[#006064]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Expense Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Provisional Filter */}
            <div className="flex items-center gap-1 bg-neutral-50 p-0.5 border border-neutral-200 rounded-xs">
              <button
                type="button"
                onClick={() => setProvisionalFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  provisionalFilter === 'ALL'
                    ? 'bg-[#006064] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All Entries ({data?.analytics?.count?.total ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setProvisionalFilter('NO')}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  provisionalFilter === 'NO'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Settled ({data?.analytics?.count?.settled ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setProvisionalFilter('YES')}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  provisionalFilter === 'YES'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Provisional ({data?.analytics?.count?.provisional ?? 0})
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses, vendors, notes..."
              className="w-full bg-neutral-50 border border-neutral-200 pl-8 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#006064]"
            />
          </div>

        </div>
      </FadeUp>

      {/* ── 4. Category Spending Distribution Matrix ── */}
      {data?.analytics?.categoryTotals && Object.keys(data.analytics.categoryTotals).length > 0 && (
        <FadeUp delay={0.12}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {CATEGORIES.map((cat) => {
              const catData = data.analytics.categoryTotals[cat.id] || { total: 0, count: 0, provisional: 0, settled: 0 };
              const IconComp = cat.icon;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'ALL' : cat.id)}
                  className={`p-3 border rounded transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-md'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <IconComp size={14} className={selectedCategory === cat.id ? 'text-teal-300' : 'text-[#006064]'} />
                    <span className={`text-[10px] font-mono font-bold ${selectedCategory === cat.id ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {catData.count} entries
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold block truncate leading-tight ${selectedCategory === cat.id ? 'text-neutral-200' : 'text-neutral-700'}`}>
                    {cat.label}
                  </span>
                  <span className={`text-xs font-mono font-black mt-1 block ${selectedCategory === cat.id ? 'text-amber-300' : 'text-neutral-900'}`}>
                    {formatINR(catData.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </FadeUp>
      )}

      {/* ── 5. Visual Interactive Expense Feed Cards (NOT an Excel Spreadsheet!) ── */}
      <FadeUp delay={0.15}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <Receipt size={14} className="text-[#006064]" />
              <span>Executive Recorded Expenses ({data?.expenses.length ?? 0} Records)</span>
            </h3>
            <span className="text-[11px] text-neutral-500 font-mono">
              Total Listed Sum: <strong className="text-neutral-900">{formatINR(data?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0)}</strong>
            </span>
          </div>

          {isLoading ? (
            <div className="bg-white p-12 text-center border border-neutral-200">
              <RefreshCw size={24} className="animate-spin text-[#006064] mx-auto mb-2" />
              <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Loading Executive Expenses...</p>
            </div>
          ) : !data?.expenses || data.expenses.length === 0 ? (
            <div className="bg-white p-12 text-center border border-dashed border-neutral-300 rounded">
              <Wallet size={36} className="text-neutral-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">No Executive Expenses Found</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No expense records match your current filters. Click &quot;Add Executive Expense&quot; to log a new record for Sir.
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-4 px-4 py-2 bg-[#006064] text-white text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#004D40] cursor-pointer"
              >
                + Add First Entry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {data.expenses.map((item) => {
                const catInfo = categoryLookup.get(item.category) || {
                  label: item.category,
                  icon: Tag,
                  color: 'text-neutral-700 bg-neutral-100 border-neutral-200',
                };
                const IconComp = catInfo.icon;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-neutral-200 hover:border-neutral-400 p-4 rounded shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        {/* Category Badge */}
                        <span className={`px-2 py-0.5 text-[9.5px] font-bold uppercase rounded-xs border flex items-center gap-1 ${catInfo.color}`}>
                          <IconComp size={11} />
                          <span>{catInfo.label}</span>
                        </span>

                        {/* Provisional Toggle Pill */}
                        <button
                          type="button"
                          onClick={() => handleToggleProvisionalDirect(item)}
                          className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-xs border cursor-pointer transition-all ${
                            item.isProvisional
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                          }`}
                          title="Click to toggle Provisional / Settled status"
                        >
                          {item.isProvisional ? '🟡 Provisional (Y)' : '🟢 Settled (N)'}
                        </button>
                      </div>

                      {/* Title & Amount */}
                      <div className="flex items-start justify-between gap-3 mt-1">
                        <h4 className="text-sm font-black text-neutral-900 leading-snug">
                          {item.title}
                        </h4>
                        <span className="text-base font-mono font-black text-neutral-900 shrink-0">
                          {formatINR(item.amount)}
                        </span>
                      </div>

                      {/* Location & Payee */}
                      <div className="mt-2 text-xs space-y-1 text-neutral-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Building2 size={12} className="text-neutral-400 shrink-0" />
                          <span className="font-semibold text-neutral-800">{item.locationName}</span>
                        </div>
                        {item.vendorPayee && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-600">
                            <span className="text-neutral-400 font-bold text-[10px]">Vendor:</span>
                            <span className="truncate">{item.vendorPayee}</span>
                          </div>
                        )}
                        {item.referenceNo && (
                          <div className="flex items-center gap-1 text-[10.5px] text-neutral-500 font-mono">
                            <span className="text-neutral-400 font-bold">Ref:</span>
                            <span>{item.referenceNo}</span>
                          </div>
                        )}
                      </div>

                      {/* Private Notes */}
                      {item.notes && (
                        <div className="mt-2.5 p-2 bg-neutral-50 border border-neutral-100 rounded text-[11px] text-neutral-600 italic">
                          &quot;{item.notes}&quot;
                        </div>
                      )}
                    </div>

                    {/* Footer Row: Date & Actions */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-mono text-[10.5px] flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{item.expenseDate ? new Date(item.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                      </span>

                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded cursor-pointer transition-colors"
                          title="Edit Entry"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(item.id, item.title)}
                          className="p-1 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </FadeUp>

      {/* ── 6. ADD / EDIT EXECUTIVE EXPENSE MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white border border-neutral-200 shadow-2xl rounded-lg max-w-xl w-full overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-[#006064] px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-teal-200" />
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {editingExpense ? 'Edit Executive Expense Entry' : 'Record New Executive Expense'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-teal-200 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Expense Title / Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. HVAC Overhaul, Generator Diesel, Torrent Power Advance..."
                    className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Scope / Location */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Centre / Location Scope
                    </label>
                    <select
                      value={formLocationId}
                      onChange={(e) => setFormLocationId(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064] cursor-pointer"
                    >
                      <option value="ALL">🏢 All Centres (Global HQ)</option>
                      {data?.locations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          🏢 {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Expense Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064] cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g. 45000"
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs font-mono font-bold text-neutral-900 rounded focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Expense Date */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={formExpenseDate}
                      onChange={(e) => setFormExpenseDate(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064] cursor-pointer"
                    />
                  </div>
                </div>

                {/* ── PROVISIONAL OPTION (Y / N) IN FORM ── */}
                <div className="bg-neutral-50 p-3.5 border border-neutral-200 rounded">
                  <label className="block text-xs font-black uppercase tracking-wider text-neutral-800 mb-1.5">
                    Provisional Status (Y / N)
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Mark as Provisional if this is an estimated budget, pending invoice, or unbilled advance.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsProvisional(false)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                        !formIsProvisional
                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                          : 'bg-white text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      <Check size={14} />
                      <span>NO — Settled Outflow</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormIsProvisional(true)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                        formIsProvisional
                          ? 'bg-amber-500 text-neutral-950 shadow-xs font-black'
                          : 'bg-white text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      <span>YES — Provisional Estimate</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Vendor / Payee */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Vendor / Payee Name
                    </label>
                    <input
                      type="text"
                      value={formVendorPayee}
                      onChange={(e) => setFormVendorPayee(e.target.value)}
                      placeholder="e.g. Torrent Power, Landlord, AMC..."
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={formPaymentMode}
                      onChange={(e) => setFormPaymentMode(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064] cursor-pointer"
                    >
                      <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Debit / Credit Card">Debit / Credit Card</option>
                      <option value="Other">Other Mode</option>
                    </select>
                  </div>
                </div>

                {/* Reference No */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Reference / Bill / UTR #
                  </label>
                  <input
                    type="text"
                    value={formReferenceNo}
                    onChange={(e) => setFormReferenceNo(e.target.value)}
                    placeholder="e.g. UTR-20260901-0941, INV-8891..."
                    className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Private Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Private Notes for Sir
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Internal observations, budget approvals, or remarks..."
                    className="w-full bg-neutral-50 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 rounded focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-black uppercase rounded shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
