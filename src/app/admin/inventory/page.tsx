'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  MapPin,
  RefreshCw,
  ArrowRightLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Layers,
  Clock,
  History,
  Tag,
  Building2,
  FolderArchive,
  Check,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { useAuth } from '@/context/AuthContext';

interface FixedItem {
  id: number;
  srNo: number;
  productName: string;
  locationId: number | null;
  locationName: string;
  initialQty: number;
  balanceQty: number;
  unitCost: number;
  balanceAmount: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransferLog {
  id: number;
  productName: string;
  fromLocationId: number;
  fromLocationName: string;
  toLocationId: number;
  toLocationName: string;
  quantity: number;
  remarks: string | null;
  transferredByName: string | null;
  createdAt: string;
}

interface LocationOption {
  id: number;
  name: string;
}

export default function InternalInventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'FIXED' | 'CONSUMED'>('FIXED');

  const [items, setItems] = useState<FixedItem[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [transferSourceItem, setTransferSourceItem] = useState<FixedItem | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Create / Edit
  const [formData, setFormData] = useState({
    productName: '',
    locationId: '',
    initialQty: 1,
    unitCost: 0,
    remarks: '',
  });

  // Form states for Transfer
  const [transferData, setTransferData] = useState({
    toLocationId: '',
    quantity: 1,
    remarks: '',
  });

  // Dynamic dropdown state for product selection/input
  const [customProductInput, setCustomProductInput] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const isAdmin = user?.role?.toUpperCase().includes('ADMIN') || user?.role?.toUpperCase().includes('SUPERADMIN');

  // Fetch Inventory Data
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedLocationFilter !== 'ALL') query.append('locationId', selectedLocationFilter);
      if (searchTerm.trim()) query.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/inventory/fixed?${query.toString()}`);
      const json = await res.json();

      if (json.success) {
        setItems(json.data || []);
        setProductSuggestions(json.productSuggestions || []);
        setLocations(json.locations || []);
      } else {
        toast.error(json.error || 'Failed to fetch inventory items');
      }
    } catch (err) {
      toast.error('Network error loading inventory');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transfer Logs
  const fetchTransferLogs = async () => {
    try {
      const res = await fetch('/api/admin/inventory/transfer');
      const json = await res.json();
      if (json.success) {
        setTransferLogs(json.data || []);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchTransferLogs();
  }, [selectedLocationFilter]);

  // Filter items by search locally
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        !searchTerm.trim() ||
        it.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it.remarks && it.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        it.locationName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLoc =
        selectedLocationFilter === 'ALL' || String(it.locationId) === selectedLocationFilter;

      return matchSearch && matchLoc;
    });
  }, [items, searchTerm, selectedLocationFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalEntries = filteredItems.length;
    const totalUnits = filteredItems.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0);
    const totalValuation = filteredItems.reduce((s, it) => s + (Number(it.balanceAmount) || 0), 0);
    const totalTransfers = transferLogs.length;

    return { totalEntries, totalUnits, totalValuation, totalTransfers };
  }, [filteredItems, transferLogs]);

  // Handle Save (Create / Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProductName = (formData.productName || customProductInput).trim();

    if (!finalProductName) {
      toast.error('Please specify a Product / Asset name');
      return;
    }

    setActionLoading(true);
    try {
      const url = editingItem
        ? `/api/admin/inventory/fixed/${editingItem.id}`
        : '/api/admin/inventory/fixed';

      const method = editingItem ? 'PUT' : 'POST';

      const payload = {
        productName: finalProductName,
        locationId: formData.locationId ? Number(formData.locationId) : null,
        initialQty: Number(formData.initialQty) || 0,
        balanceQty: editingItem ? Number(formData.initialQty) : Number(formData.initialQty),
        unitCost: Number(formData.unitCost) || 0,
        remarks: formData.remarks.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Inventory updated successfully!');
        setShowCreateModal(false);
        setEditingItem(null);
        setFormData({ productName: '', locationId: '', initialQty: 1, unitCost: 0, remarks: '' });
        setCustomProductInput('');
        fetchInventory();
      } else {
        toast.error(json.error || 'Failed to save inventory entry');
      }
    } catch {
      toast.error('Network error saving inventory item');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      productName: '',
      locationId: locations[0]?.id ? String(locations[0].id) : '',
      initialQty: 1,
      unitCost: 0,
      remarks: '',
    });
    setCustomProductInput('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (item: FixedItem) => {
    setEditingItem(item);
    setFormData({
      productName: item.productName,
      locationId: item.locationId ? String(item.locationId) : '',
      initialQty: item.balanceQty,
      unitCost: item.unitCost || 0,
      remarks: item.remarks || '',
    });
    setCustomProductInput(item.productName);
    setShowCreateModal(true);
  };

  // Delete Item
  const handleDeleteItem = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from fixed inventory?`)) return;

    try {
      const res = await fetch(`/api/admin/inventory/fixed/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`"${name}" deleted successfully.`);
        fetchInventory();
      } else {
        toast.error(json.error || 'Failed to delete item');
      }
    } catch {
      toast.error('Network error deleting item');
    }
  };

  // Open Transfer Modal
  const openTransferModal = (item: FixedItem) => {
    setTransferSourceItem(item);
    const eligibleDestinations = locations.filter((l) => l.id !== item.locationId);
    setTransferData({
      toLocationId: eligibleDestinations[0]?.id ? String(eligibleDestinations[0].id) : '',
      quantity: 1,
      remarks: '',
    });
    setShowTransferModal(true);
  };

  // Execute Transfer
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceItem) return;

    if (!transferData.toLocationId) {
      toast.error('Please select a destination centre');
      return;
    }

    const qty = Number(transferData.quantity);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid transfer quantity');
      return;
    }

    if (qty > transferSourceItem.balanceQty) {
      toast.error(`Transfer quantity exceeds available stock (${transferSourceItem.balanceQty} units)`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/inventory/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceItemId: transferSourceItem.id,
          toLocationId: Number(transferData.toLocationId),
          quantity: qty,
          remarks: transferData.remarks.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setShowTransferModal(false);
        setTransferSourceItem(null);
        fetchInventory();
        fetchTransferLogs();
      } else {
        toast.error(json.error || 'Failed to complete transfer');
      }
    } catch {
      toast.error('Network error completing stock transfer');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      
      {/* ── TOP SECTION SWITCHER ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-white border border-[var(--outline-variant)]/40 shadow-xs">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('FIXED')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'FIXED'
                  ? 'bg-[#006064] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Boxes size={15} />
              <span>Fixed Inventory</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] font-mono">
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONSUMED')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'CONSUMED'
                  ? 'bg-[#006064] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layers size={15} />
              <span>Consumed Inventory</span>
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-mono font-bold">
                BUFFER ALERT
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogsModal(true)}
              className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-300"
            >
              <History size={14} className="text-[#006064]" />
              <span>Transfer History ({transferLogs.length})</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Create Fixed Entry</span>
            </button>
          </div>
        </div>
      </FadeUp>

      {/* ── CONSUMED TAB PLACEHOLDER ── */}
      {activeTab === 'CONSUMED' ? (
        <FadeUp>
          <div className="bg-white border border-[var(--outline-variant)]/60 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Layers size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#1B1C1C]">Consumed Inventory & Buffer Counter</h3>
            <p className="text-sm text-neutral-600 max-w-lg mx-auto">
              Track consumables, pantry supplies, printing paper, coffee/tea stock, and configure dynamic minimum buffer alert thresholds.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold uppercase tracking-wider">
              <span>Section Prepared &bull; Ready to activate on your request</span>
            </div>
          </div>
        </FadeUp>
      ) : (
        <>
          {/* ── HEADER ── */}
          <FadeUp delay={0.05}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--outline-variant)]/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
                  <Boxes size={16} /> SSPACIA Internal Asset Management
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-[#1B1C1C]">
                  Fixed Inventory & Stock Transfers
                </h1>
                <p className="text-sm text-[#616161] mt-1 font-light">
                  Manage fixed physical assets (tables, chairs, appliances, hardware) and record seamless inter-centre stock movements.
                </p>
              </div>
            </div>
          </FadeUp>

          {/* ── KPI CARDS ── */}
          <FadeUp delay={0.1}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 border border-[var(--outline-variant)]/40 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#616161]">Asset Records</div>
                <div className="text-2xl font-display font-black mt-1 text-[#1B1C1C]">{kpis.totalEntries}</div>
                <div className="text-[11px] text-[#616161] font-light">Active product lines</div>
              </div>

              <div className="bg-white p-5 border border-teal-200 bg-teal-50/20 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800">Total Live Units</div>
                <div className="text-2xl font-display font-black mt-1 text-teal-900">{kpis.totalUnits.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-teal-700 font-light">Current balance quantity</div>
              </div>

              <div className="bg-white p-5 border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">Total Valuation</div>
                <div className="text-2xl font-display font-black mt-1 text-emerald-900">
                  ₹{kpis.totalValuation.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-700 font-light">Combined balance value</div>
              </div>

              <div className="bg-white p-5 border border-purple-200 bg-purple-50/20 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-800">Inter-Centre Transfers</div>
                <div className="text-2xl font-display font-black mt-1 text-purple-900">{kpis.totalTransfers}</div>
                <div className="text-[11px] text-purple-700 font-light">Logged movements</div>
              </div>
            </div>
          </FadeUp>

          {/* ── SEARCH & FILTERS TOOLBAR ── */}
          <FadeUp delay={0.15}>
            <div className="bg-white p-4 border border-[var(--outline-variant)]/40 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                
                {/* Search */}
                <div className="relative flex-1 min-w-[260px] max-w-md">
                  <Search size={14} className="absolute left-3 top-2.5 text-[#616161]" />
                  <input
                    type="text"
                    placeholder="Search asset, remarks, or centre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-[var(--outline-variant)] pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-white border border-[var(--outline-variant)] px-2.5 py-1.5 shadow-2xs">
                    <MapPin size={13} className="text-[#006064]" />
                    <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider">Centre:</span>
                    <select
                      value={selectedLocationFilter}
                      onChange={(e) => setSelectedLocationFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-[#1B1C1C] focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Centres ({locations.length})</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={fetchInventory}
                    className="p-1.5 text-[#616161] hover:text-[#006064] hover:bg-neutral-100 border border-[var(--outline-variant)] cursor-pointer"
                    title="Refresh List"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── DATA TABLE ── */}
          <FadeUp delay={0.2}>
            <div className="bg-white border border-[var(--outline-variant)]/40 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-14">SR.NO</th>
                      <th className="py-3.5 px-4">CENTRE NODE</th>
                      <th className="py-3.5 px-4">PRODUCT / ASSET NAME</th>
                      <th className="py-3.5 px-4 text-center">INITIAL QTY</th>
                      <th className="py-3.5 px-4 text-center">BALANCE QTY</th>
                      <th className="py-3.5 px-4 text-right">UNIT COST</th>
                      <th className="py-3.5 px-4 text-right">BALANCE AMOUNT</th>
                      <th className="py-3.5 px-4">REMARKS / SPECS</th>
                      <th className="py-3.5 px-4 text-center w-36">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center">
                          <Loader2 size={24} className="animate-spin text-[#006064] mx-auto mb-2" />
                          <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">
                            Loading Inventory...
                          </span>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-neutral-500">
                          <Boxes size={32} className="mx-auto mb-2 opacity-30" />
                          <div className="font-bold text-sm text-neutral-700">No Fixed Inventory Entries Found</div>
                          <div className="text-xs text-neutral-400 mt-1">
                            Click "+ Create Fixed Entry" to add furniture, appliances, or infrastructure items.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-teal-50/30 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                          }`}
                        >
                          {/* SR. No */}
                          <td className="py-3.5 px-4 font-mono font-bold text-neutral-500 text-[11px]">
                            #{item.srNo || index + 1}
                          </td>

                          {/* Centre Node */}
                          <td className="py-3.5 px-4 font-medium">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-bold uppercase">
                              <Building2 size={11} className="text-[#006064]" />
                              {item.locationName}
                            </span>
                          </td>

                          {/* Product Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-[#1B1C1C] text-sm flex items-center gap-2">
                              <Package size={14} className="text-[#006064] shrink-0" />
                              <span>{item.productName}</span>
                            </div>
                          </td>

                          {/* Initial Qty */}
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-neutral-600">
                            {item.initialQty}
                          </td>

                          {/* Balance Qty */}
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-3 py-1 text-xs font-mono font-black border ${
                                item.balanceQty > 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                              }`}
                            >
                              {item.balanceQty} units
                            </span>
                          </td>

                          {/* Unit Cost */}
                          <td className="py-3.5 px-4 text-right font-mono text-neutral-600">
                            {item.unitCost > 0 ? `₹${Number(item.unitCost).toLocaleString('en-IN')}` : '—'}
                          </td>

                          {/* Balance Amount */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-[#006064]">
                            {item.balanceAmount > 0 ? `₹${Number(item.balanceAmount).toLocaleString('en-IN')}` : '—'}
                          </td>

                          {/* Remarks */}
                          <td className="py-3.5 px-4 text-neutral-600 max-w-xs truncate" title={item.remarks || ''}>
                            {item.remarks || <span className="text-neutral-300 italic">No notes</span>}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openTransferModal(item)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                                title="Transfer units to another centre"
                              >
                                <ArrowRightLeft size={11} />
                                <span>Transfer</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100 border border-transparent hover:border-neutral-200 cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id, item.productName)}
                                className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 cursor-pointer"
                                title="Delete Item"
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
            </div>
          </FadeUp>
        </>
      )}

      {/* ── MODAL 1: CREATE / EDIT FIXED ASSET ENTRY ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-lg space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Boxes size={18} className="text-[#006064]" />
                  <span>{editingItem ? 'Edit Fixed Asset Item' : 'Create Fixed Inventory Entry'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
                {/* Centre / Location */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Centre Node *
                  </label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  >
                    <option value="">Select Centre...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Name with Dynamic Dropdown & Free Typing */}
                <div className="space-y-1 relative">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Product / Asset Name * (Select or Type New)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type product name (e.g. Ergonomic Chair, Table, Plates)..."
                      value={customProductInput}
                      onChange={(e) => {
                        setCustomProductInput(e.target.value);
                        setFormData({ ...formData, productName: e.target.value });
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      required
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Dynamic Suggestions List */}
                  {showProductDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-neutral-100">
                      {productSuggestions
                        .filter((p) => !customProductInput.trim() || p.toLowerCase().includes(customProductInput.toLowerCase()))
                        .map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setCustomProductInput(p);
                              setFormData({ ...formData, productName: p });
                              setShowProductDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-teal-50 text-neutral-800 flex items-center justify-between"
                          >
                            <span>{p}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-mono">Existing</span>
                          </button>
                        ))}
                      {customProductInput.trim() && !productSuggestions.includes(customProductInput.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, productName: customProductInput.trim() });
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold bg-teal-50 text-[#006064] flex items-center gap-1.5"
                        >
                          <Plus size={13} />
                          <span>Add New: "{customProductInput.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity & Unit Cost */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                      {editingItem ? 'Current Balance Qty *' : 'Available / Stock Qty *'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialQty}
                      onChange={(e) => setFormData({ ...formData, initialQty: Number(e.target.value) })}
                      required
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                      Unit Valuation (₹ / unit)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.unitCost}
                      onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>
                </div>

                {/* Balance Valuation Preview */}
                <div className="p-3 bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[10px]">Calculated Balance Amount:</span>
                  <span className="font-mono font-black text-sm text-[#006064]">
                    ₹{(Number(formData.initialQty || 0) * Number(formData.unitCost || 0)).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Remarks */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Remarks / Placement Location / Specs
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Floor 2 Conference Room, White Laminate Finish"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-[#006064] text-white font-bold uppercase tracking-wider hover:bg-[#004d40] disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {actionLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>{editingItem ? 'Update Asset' : 'Save Asset Entry'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: INTER-CENTRE TRANSFER MODAL ── */}
      <AnimatePresence>
        {showTransferModal && transferSourceItem && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-lg space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <ArrowRightLeft size={18} className="text-[#006064]" />
                  <span>Transfer Stock Between Centres</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Source Item Context */}
              <div className="p-3 bg-teal-50/60 border border-teal-200 space-y-1.5 text-xs">
                <div className="font-extrabold text-[#006064] text-sm flex items-center gap-1.5">
                  <Package size={15} />
                  <span>{transferSourceItem.productName}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-700">
                  <span><strong>Source Centre:</strong> {transferSourceItem.locationName}</span>
                  <span className="px-2 py-0.5 bg-white border border-teal-300 font-mono font-bold text-teal-900 rounded">
                    Current Balance: {transferSourceItem.balanceQty} units
                  </span>
                </div>
              </div>

              <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
                {/* Destination Centre */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Destination Centre Node *
                  </label>
                  <select
                    value={transferData.toLocationId}
                    onChange={(e) => setTransferData({ ...transferData, toLocationId: e.target.value })}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  >
                    <option value="">Select Destination Centre...</option>
                    {locations
                      .filter((l) => l.id !== transferSourceItem.locationId)
                      .map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Transfer Quantity */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Transfer Quantity (Max: {transferSourceItem.balanceQty}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={transferSourceItem.balanceQty}
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({ ...transferData, quantity: Number(e.target.value) })}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                  <div className="text-[10px] text-neutral-500 italic mt-0.5">
                    Remaining at {transferSourceItem.locationName}:{' '}
                    <strong>{Math.max(0, transferSourceItem.balanceQty - Number(transferData.quantity || 0))} units</strong>
                  </div>
                </div>

                {/* Transfer Remarks */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Transfer Reason / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Relocating for private event, new floor allocation"
                    value={transferData.remarks}
                    onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 bg-blue-700 text-white font-bold uppercase tracking-wider hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {actionLoading && <Loader2 size={14} className="animate-spin" />}
                    <span>Confirm &amp; Move Stock</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: TRANSFER HISTORY AUDIT LOGS ── */}
      <AnimatePresence>
        {showLogsModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-3xl space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 shrink-0">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <History size={18} className="text-[#006064]" />
                  <span>Inter-Centre Stock Transfer Audit Logs</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLogsModal(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
                {transferLogs.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400 text-xs">
                    No stock transfers recorded yet.
                  </div>
                ) : (
                  transferLogs.map((log) => (
                    <div key={log.id} className="py-3 px-2 flex items-start justify-between gap-4 text-xs hover:bg-neutral-50">
                      <div className="space-y-1">
                        <div className="font-extrabold text-[#1B1C1C] text-sm flex items-center gap-2">
                          <span>{log.productName}</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold rounded">
                            +{log.quantity} units moved
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-neutral-600 text-[11px]">
                          <span className="font-bold text-red-700">{log.fromLocationName}</span>
                          <ArrowRightLeft size={11} className="text-neutral-400" />
                          <span className="font-bold text-emerald-700">{log.toLocationName}</span>
                        </div>
                        {log.remarks && (
                          <div className="text-[11px] text-neutral-500 italic">
                            "{log.remarks}"
                          </div>
                        )}
                      </div>

                      <div className="text-right text-[10px] text-neutral-400 shrink-0 space-y-0.5">
                        <div>{new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                        {log.transferredByName && (
                          <div className="font-bold text-neutral-600">{log.transferredByName}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200 text-right shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLogsModal(false)}
                  className="px-5 py-2 bg-[#006064] text-white font-bold uppercase tracking-wider text-xs"
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
