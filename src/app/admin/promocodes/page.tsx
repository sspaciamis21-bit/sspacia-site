"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Power,
  Loader2,
  CheckCircle2,
  Sparkles,
  Percent,
  IndianRupee,
  Search,
  Filter,
  Copy,
  Calendar,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
} from "lucide-react";
import { FadeUp } from "@/components/ui/fade-up";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface PromoCodeItem {
  id: number;
  code: string;
  title: string | null;
  discountType: string;
  discountValue: number | string;
  minOrderAmount: number | string | null;
  maxDiscountAmount: number | string | null;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  createdByName: string | null;
  createdAt: string;
}

export default function AdminPromoCodesPage() {
  const { isRole } = useAuth();
  const [promocodes, setPromocodes] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERCENTAGE" | "FIXED">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromoCodeItem | null>(null);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/promocodes");
      if (res.ok) {
        const json = await res.json();
        setPromocodes(json.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setCode("");
    setTitle("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("10");
    setMinOrderAmount("");
    setMaxDiscountAmount("");
    setUsageLimit("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PromoCodeItem) => {
    setEditingItem(item);
    setCode(item.code);
    setTitle(item.title || "");
    setDiscountType(item.discountType === "FIXED" ? "FIXED" : "PERCENTAGE");
    setDiscountValue(String(item.discountValue || ""));
    setMinOrderAmount(item.minOrderAmount ? String(item.minOrderAmount) : "");
    setMaxDiscountAmount(item.maxDiscountAmount ? String(item.maxDiscountAmount) : "");
    setUsageLimit(item.usageLimit ? String(item.usageLimit) : "");
    setIsActive(item.isActive);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Please enter a Promo Code");
      return;
    }
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive discount value");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        title: title.trim() || null,
        discountType,
        discountValue: val,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        isActive,
      };

      if (editingItem) {
        const res = await fetch(`/api/admin/promocodes/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update promo code");
        toast.success(`Promo code "${payload.code}" updated successfully!`);
      } else {
        const res = await fetch("/api/admin/promocodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create promo code");
        toast.success(`New promo code "${payload.code}" created successfully!`);
      }

      setIsModalOpen(false);
      fetchPromocodes();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error saving promo code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: PromoCodeItem) => {
    try {
      const newStatus = !item.isActive;
      const res = await fetch(`/api/admin/promocodes/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Promo code "${item.code}" is now ${newStatus ? "ACTIVE" : "DEACTIVATED"}`);
      fetchPromocodes();
    } catch (err) {
      toast.error("Error toggling promo status");
    }
  };

  const handleDelete = async (id: number, codeName: string) => {
    if (!confirm(`Are you sure you want to permanently delete promo code "${codeName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`Promo code "${codeName}" deleted successfully`);
      fetchPromocodes();
    } catch (err) {
      toast.error("Error deleting promo code");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied "${text}" to clipboard!`);
  };

  const filteredCodes = useMemo(() => {
    return promocodes.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && item.isActive) ||
        (statusFilter === "INACTIVE" && !item.isActive);

      const matchesType =
        typeFilter === "ALL" || item.discountType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [promocodes, searchQuery, statusFilter, typeFilter]);

  const activeCount = promocodes.filter((p) => p.isActive).length;
  const totalUses = promocodes.reduce((acc, p) => acc + (p.usedCount || 0), 0);

  if (loading && promocodes.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBF9F8] flex flex-col items-center justify-center p-8 space-y-4 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#1ab0bc]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9E9E9E] animate-pulse">
          Loading Promo Code Controls...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F8] p-6 lg:p-10 font-sans space-y-8">
      {/* ── TOP BREADCRUMB & SWITCHER HEADER ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E0E0E0] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#1ab0bc]/10 text-[#1ab0bc] border border-[#1ab0bc]/20 text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-widest">
                Super Admin Controls
              </span>
              <Link
                href="/admin/announcements"
                className="text-[10px] text-gray-500 hover:text-[#1ab0bc] flex items-center gap-1 font-bold underline"
              >
                <span>Switch to Announcements</span>
                <ArrowRight size={11} />
              </Link>
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight flex items-center gap-3">
              <Tag className="w-7 h-7 text-[#1ab0bc]" />
              <span>Checkout Promo Codes &amp; Discounts</span>
            </h1>
            <p className="text-xs text-[#757575] mt-1">
              Create, edit, relax prices, and deactivate promo codes applied by customers during online checkout.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1ab0bc] hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer rounded-xs shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Code</span>
          </button>
        </div>
      </FadeUp>

      {/* ── KPI SUMMARY CARDS ── */}
      <FadeUp delay={0.1}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E0E0E0] p-4 shadow-2xs rounded-xs">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Promo Codes</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{promocodes.length}</span>
              <span className="text-[10px] text-gray-400 font-mono">records</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 p-4 shadow-2xs rounded-xs bg-emerald-50/20">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Active Codes</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
              <span className="text-[10px] text-emerald-700 font-mono">live in checkout</span>
            </div>
          </div>

          <div className="bg-white border border-[#E0E0E0] p-4 shadow-2xs rounded-xs">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Inactive / Paused</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-400">{promocodes.length - activeCount}</span>
              <span className="text-[10px] text-gray-400 font-mono">disabled</span>
            </div>
          </div>

          <div className="bg-white border border-[#1ab0bc]/30 p-4 shadow-2xs rounded-xs bg-teal-50/20">
            <p className="text-[10px] font-bold text-[#006064] uppercase tracking-wider">Redemptions / Uses</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-[#1ab0bc]">{totalUses}</span>
              <span className="text-[10px] text-teal-700 font-mono">bookings discounted</span>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <FadeUp delay={0.15}>
        <div className="bg-white border border-[#E0E0E0] p-4 shadow-2xs rounded-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code e.g. WELCOME10..."
              className="w-full bg-gray-50 border border-gray-200 pl-9 pr-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-gray-300 text-xs px-3 py-2 text-gray-700 outline-none focus:border-[#1ab0bc] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">🟢 Active Only</option>
              <option value="INACTIVE">🔴 Inactive Only</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-white border border-gray-300 text-xs px-3 py-2 text-gray-700 outline-none focus:border-[#1ab0bc] cursor-pointer"
            >
              <option value="ALL">All Discount Types</option>
              <option value="PERCENTAGE">% Percentage Off</option>
              <option value="FIXED">₹ Fixed Amount Off</option>
            </select>
          </div>
        </div>
      </FadeUp>

      {/* ── PROMO CODE LIST TABLE ── */}
      <FadeUp delay={0.2}>
        <div className="bg-white border border-[#E0E0E0] shadow-sm rounded-xs overflow-hidden">
          <div className="p-4 bg-[#F8F9FA] border-b border-[#E0E0E0] flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
              Configured Promo Codes ({filteredCodes.length})
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Applies directly on Customer Checkout
            </span>
          </div>

          {filteredCodes.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Tag className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                No Promo Codes Found
              </p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                {searchQuery
                  ? "No promo codes match your search query."
                  : "Click 'Create Promo Code' to add a discount code for customer bookings."}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#1ab0bc] text-white text-xs font-bold uppercase tracking-wider hover:bg-teal-700 cursor-pointer rounded-xs"
              >
                <Plus size={13} />
                <span>Add First Promo Code</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E0E0E0] text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="p-3.5">Promo Code</th>
                    <th className="p-3.5">Discount Rate</th>
                    <th className="p-3.5">Campaign Title</th>
                    <th className="p-3.5">Min Order</th>
                    <th className="p-3.5">Max Discount</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Redemptions</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {filteredCodes.map((item) => {
                    const isPct = item.discountType === "PERCENTAGE";
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* CODE BADGE */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 border border-slate-300 tracking-wider">
                              {item.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.code)}
                              className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-200 rounded cursor-pointer transition-colors"
                              title="Copy promo code"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </td>

                        {/* DISCOUNT RATE */}
                        <td className="p-3.5 font-bold">
                          {isPct ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-black">
                              <Percent size={11} /> {item.discountValue}% OFF
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-mono font-black">
                              ₹{Number(item.discountValue).toLocaleString()} FLAT OFF
                            </span>
                          )}
                        </td>

                        {/* TITLE */}
                        <td className="p-3.5 text-gray-800">
                          <span className="font-medium">{item.title || "—"}</span>
                        </td>

                        {/* MIN ORDER */}
                        <td className="p-3.5 font-mono text-gray-700">
                          {item.minOrderAmount ? `₹${Number(item.minOrderAmount).toLocaleString()}` : <span className="text-gray-400">None</span>}
                        </td>

                        {/* MAX DISCOUNT */}
                        <td className="p-3.5 font-mono text-gray-700">
                          {isPct && item.maxDiscountAmount ? `₹${Number(item.maxDiscountAmount).toLocaleString()}` : <span className="text-gray-400">No Cap</span>}
                        </td>

                        {/* STATUS TOGGLE */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              item.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300"
                            }`}
                            title="Click to toggle active status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-600 animate-pulse" : "bg-rose-600"}`}></span>
                            <span>{item.isActive ? "Active" : "Inactive"}</span>
                          </button>
                        </td>

                        {/* USES */}
                        <td className="p-3.5 text-center font-mono font-bold text-gray-700">
                          {item.usedCount}
                          {item.usageLimit ? <span className="text-gray-400 font-normal"> / {item.usageLimit}</span> : ""}
                        </td>

                        {/* ACTIONS */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded cursor-pointer transition-colors"
                              title="Edit promo code"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.code)}
                              className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded cursor-pointer transition-colors"
                              title="Delete promo code"
                            >
                              <Trash2 size={13} />
                            </button>
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

      {/* ── CREATE / EDIT PROMO CODE MODAL ── */}
      {isModalOpen && (
        <div
          onClick={() => !submitting && setIsModalOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-gray-200 shadow-2xl rounded-sm w-full max-w-lg overflow-hidden font-sans flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* MODAL HEADER */}
            <div className="px-6 py-4 bg-[#F8F9FA] border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-50 text-[#1ab0bc] border border-teal-200 flex items-center justify-center rounded-xs">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                    {editingItem ? "Edit Promo Code" : "Create New Promo Code"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Configure discount rates applied on final customer checkout amount.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {/* CODE & TITLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Promo Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono font-bold text-gray-900 uppercase outline-none focus:border-[#1ab0bc]"
                  />
                  <span className="text-[9px] text-gray-400">Auto-capitalized for customers</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Campaign Title / Description
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. New User Special Offer"
                    className="w-full bg-white border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#1ab0bc]"
                  />
                </div>
              </div>

              {/* DISCOUNT TYPE & VALUE */}
              <div className="bg-teal-50/40 p-3.5 border border-teal-200/60 rounded-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-950 mb-1">
                      Discount Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-white border border-teal-300 px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-[#1ab0bc] cursor-pointer"
                    >
                      <option value="PERCENTAGE">Percentage (%) Off</option>
                      <option value="FIXED">Fixed Amount (₹) Flat Off</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-950 mb-1">
                      {discountType === "PERCENTAGE" ? "Discount Rate (%) *" : "Discount Amount (₹) *"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0.01"
                        max={discountType === "PERCENTAGE" ? "100" : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === "PERCENTAGE" ? "10" : "500"}
                        className="w-full bg-white border border-teal-300 px-3 py-2 text-xs font-mono font-bold text-gray-900 outline-none focus:border-[#1ab0bc]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold font-mono">
                        {discountType === "PERCENTAGE" ? "%" : "₹"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-teal-800 font-medium">
                  {discountType === "PERCENTAGE"
                    ? `💡 Gives customer ${discountValue || "X"}% off their booking subtotal amount.`
                    : `💡 Directly reduces the total booking amount by flat ₹${discountValue || "X"}.`}
                </p>
              </div>

              {/* MIN ORDER & MAX DISCOUNT CAP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Min Booking Subtotal (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="e.g. 1000 (No minimum if blank)"
                    className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                  />
                </div>

                {discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                      Max Discount Cap (₹) <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={maxDiscountAmount}
                      onChange={(e) => setMaxDiscountAmount(e.target.value)}
                      placeholder="e.g. 2000 (No cap if blank)"
                      className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                    />
                  </div>
                )}
              </div>

              {/* USAGE LIMIT & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Max Redemptions Limit <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Unlimited if blank"
                    className="w-full bg-white border border-gray-300 px-3 py-2 text-xs font-mono text-gray-900 outline-none focus:border-[#1ab0bc]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="is-promo-active"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#1ab0bc] border-gray-300 rounded focus:ring-[#1ab0bc] cursor-pointer"
                  />
                  <label htmlFor="is-promo-active" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Enable Promo Code (Active in Checkout)
                  </label>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase tracking-wider rounded-xs text-[11px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#1ab0bc] hover:bg-teal-700 text-white font-bold uppercase tracking-wider rounded-xs text-[11px] shadow-sm cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingItem ? "Update Promo Code" : "Save Promo Code"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
