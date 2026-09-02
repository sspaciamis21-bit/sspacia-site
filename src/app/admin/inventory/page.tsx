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
  Calendar,
  DollarSign,
  FileText,
  Eye,
  Info,
  ArrowRight,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { useAuth } from '@/context/AuthContext';

interface TransferLog {
  id: number;
  productName: string;
  fromLocationId: number;
  fromLocationName: string;
  toLocationId: number;
  toLocationName: string;
  quantity: number;
  sourceItemId?: number | null;
  destinationItemId?: number | null;
  remarks: string | null;
  transferredByName: string | null;
  direction?: 'OUTWARD' | 'INWARD';
  createdAt: string;
}

interface FixedItem {
  id: number;
  srNo: number;
  entryDate: string;
  productName: string;
  locationId: number | null;
  locationName: string;
  initialQty: number;
  balanceQty: number;
  unitCost: number;
  balanceAmount: number;
  remarks: string | null;
  transferCount: number;
  transferLogs: TransferLog[];
  createdAt: string;
  updatedAt: string;
}

interface LocationOption {
  id: number;
  name: string;
}

export default function InternalInventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'FIXED' | 'CONSUMED'>('FIXED');
  const [fixedSubView, setFixedSubView] = useState<'STOCK' | 'TRANSFERS'>('STOCK');

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
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<FixedItem | null>(null);

  // Transfer Logs view search & filter
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [logsLocationFilter, setLogsLocationFilter] = useState('ALL');

  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [transferSourceItem, setTransferSourceItem] = useState<FixedItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states with string inputs to eliminate leading-zero issues (e.g. 0445)
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formLocationId, setFormLocationId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formAvailableQty, setFormAvailableQty] = useState('1');
  const [formBalanceQty, setFormBalanceQty] = useState('1');
  const [formUnitCost, setFormUnitCost] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Form states for Transfer
  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    toLocationId: '',
    quantity: '1',
    remarks: '',
  });

  // Dynamic dropdown state for product selection/input
  const [customProductInput, setCustomProductInput] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const isAdmin =
    user?.role?.toUpperCase().includes('ADMIN') ||
    user?.role?.toUpperCase().includes('SUPERADMIN');

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

        // If CM has assigned locations, set default location for create form
        if (!isAdmin && json.userAssignedLocationIds?.length > 0) {
          const defaultLocId = String(json.userAssignedLocationIds[0]);
          if (!formLocationId) setFormLocationId(defaultLocId);
        } else if (json.locations?.length > 0 && !formLocationId) {
          setFormLocationId(String(json.locations[0].id));
        }
      } else {
        toast.error(json.error || 'Failed to fetch inventory items');
      }
    } catch {
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

  // KPIs for Fixed Inventory Stock View
  const kpis = useMemo(() => {
    const totalEntries = filteredItems.length;
    const totalUnits = filteredItems.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0);
    const totalValuation = filteredItems.reduce((s, it) => s + (Number(it.balanceAmount) || 0), 0);
    const totalTransfers = transferLogs.length;

    return { totalEntries, totalUnits, totalValuation, totalTransfers };
  }, [filteredItems, transferLogs]);

  // Filtered transfer logs for Transfer History View
  const filteredTransferLogs = useMemo(() => {
    return transferLogs.filter((log) => {
      const matchSearch =
        !logsSearchTerm.trim() ||
        log.productName.toLowerCase().includes(logsSearchTerm.toLowerCase()) ||
        (log.remarks && log.remarks.toLowerCase().includes(logsSearchTerm.toLowerCase())) ||
        (log.transferredByName && log.transferredByName.toLowerCase().includes(logsSearchTerm.toLowerCase())) ||
        log.fromLocationName.toLowerCase().includes(logsSearchTerm.toLowerCase()) ||
        log.toLocationName.toLowerCase().includes(logsSearchTerm.toLowerCase());

      const matchLoc =
        logsLocationFilter === 'ALL' ||
        String(log.fromLocationId) === logsLocationFilter ||
        String(log.toLocationId) === logsLocationFilter;

      return matchSearch && matchLoc;
    });
  }, [transferLogs, logsSearchTerm, logsLocationFilter]);

  const totalUnitsTransferred = useMemo(() => {
    return filteredTransferLogs.reduce((acc, log) => acc + (Number(log.quantity) || 0), 0);
  }, [filteredTransferLogs]);

  // Calculate live balance amount in modal
  const liveCalculatedBalanceAmount = useMemo(() => {
    const qty = parseFloat(formBalanceQty) || 0;
    const cost = parseFloat(formUnitCost) || 0;
    return qty * cost;
  }, [formBalanceQty, formUnitCost]);

  // Handle Available Qty input change with auto-sync to Balance Qty on new entries
  const handleAvailableQtyChange = (val: string) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setFormAvailableQty(cleaned);
    if (!editingItem) {
      setFormBalanceQty(cleaned);
    }
  };

  const handleBalanceQtyChange = (val: string) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setFormBalanceQty(cleaned);
  };

  const handleUnitCostChange = (val: string) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setFormUnitCost(cleaned);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLocationId(locations[0]?.id ? String(locations[0].id) : '');
    setFormProductName('');
    setCustomProductInput('');
    setFormAvailableQty('1');
    setFormBalanceQty('1');
    setFormUnitCost('');
    setFormRemarks('');
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const openEditModal = (item: FixedItem) => {
    setEditingItem(item);
    const formattedDate = item.entryDate
      ? new Date(item.entryDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setFormDate(formattedDate);
    setFormLocationId(item.locationId ? String(item.locationId) : '');
    setFormProductName(item.productName);
    setCustomProductInput(item.productName);
    setFormAvailableQty(String(item.initialQty));
    setFormBalanceQty(String(item.balanceQty));
    setFormUnitCost(item.unitCost ? String(item.unitCost) : '');
    setFormRemarks(item.remarks || '');
    setShowCreateModal(true);
  };

  // Handle Save (Create / Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProductName = (formProductName || customProductInput).trim();

    if (!finalProductName) {
      toast.error('Please specify a Product / Asset name');
      return;
    }

    if (!formLocationId) {
      toast.error('Please select a Centre Node');
      return;
    }

    const initialQtyNum = parseInt(formAvailableQty, 10) || 0;
    const balanceQtyNum = parseInt(formBalanceQty, 10) || 0;
    const unitCostNum = parseFloat(formUnitCost) || 0;

    setActionLoading(true);
    try {
      const url = editingItem
        ? `/api/admin/inventory/fixed/${editingItem.id}`
        : '/api/admin/inventory/fixed';

      const method = editingItem ? 'PUT' : 'POST';

      const payload = {
        entryDate: formDate,
        productName: finalProductName,
        locationId: Number(formLocationId),
        initialQty: initialQtyNum,
        balanceQty: balanceQtyNum,
        unitCost: unitCostNum,
        remarks: formRemarks.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Fixed inventory updated successfully!');
        setShowCreateModal(false);
        setEditingItem(null);
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
      date: new Date().toISOString().split('T')[0],
      toLocationId: eligibleDestinations[0]?.id ? String(eligibleDestinations[0].id) : '',
      quantity: '1',
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

    const qty = parseInt(transferData.quantity, 10);
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
          transferDate: transferData.date,
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

  // Open item-specific transfer history modal
  const openItemHistoryModal = (item: FixedItem) => {
    setSelectedItemForHistory(item);
  };

  return (
    <div className="p-6 sm:p-10 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      
      {/* ── TOP 2-WAY MAIN SECTION SWITCHER ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-white border border-[var(--outline-variant)]/40 shadow-xs">
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* 1. Fixed Inventory Tab */}
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
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeTab === 'FIXED' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-800'
              }`}>
                {items.length}
              </span>
            </button>

            {/* 2. Consumed Inventory Tab */}
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

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
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

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: FIXED INVENTORY MAIN AREA                                   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'FIXED' && (
        <>
          {/* Header & Sub-View Switcher (Below Create Button) */}
          <FadeUp delay={0.05}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--outline-variant)]/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
                  <Boxes size={16} /> SSPACIA Internal Asset Management
                </div>
                <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-[#1B1C1C]">
                  {fixedSubView === 'STOCK' ? 'Fixed Inventory & Live Stock' : 'Stock Transfer History & Audit Ledger'}
                </h1>
                <p className="text-sm text-[#616161] mt-1 font-light">
                  {fixedSubView === 'STOCK'
                    ? 'Manage fixed physical assets (tables, chairs, appliances, hardware) and live quantities across centres.'
                    : 'Complete audit log of physical asset movements between centres, quantities relocated, and CM dispatch remarks.'}
                </p>
              </div>

              {/* Sub-View Switcher placed right below Create button */}
              <div className="flex items-center bg-white p-1 border border-neutral-300 shadow-2xs self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setFixedSubView('STOCK')}
                  className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    fixedSubView === 'STOCK'
                      ? 'bg-[#006064] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Boxes size={13} />
                  <span>Live Stock ({items.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFixedSubView('TRANSFERS')}
                  className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    fixedSubView === 'TRANSFERS'
                      ? 'bg-[#006064] text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <ArrowRightLeft size={13} />
                  <span>Transfer History ({transferLogs.length})</span>
                </button>
              </div>
            </div>
          </FadeUp>

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SUB-VIEW A: LIVE STOCK TABLE                                 */}
          {/* ──────────────────────────────────────────────────────────── */}
          {fixedSubView === 'STOCK' && (
            <>
              {/* KPI Cards */}
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

              {/* Search & Filters Toolbar */}
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

              {/* Data Table */}
              <FadeUp delay={0.2}>
                <div className="bg-white border border-[var(--outline-variant)]/40 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12">SR.NO</th>
                          <th className="py-3.5 px-4">DATE</th>
                          <th className="py-3.5 px-4">CENTRE NODE</th>
                          <th className="py-3.5 px-4">PRODUCT / ASSET NAME</th>
                          <th className="py-3.5 px-4 text-center">INITIAL QTY</th>
                          <th className="py-3.5 px-4 text-center">BALANCE QTY</th>
                          <th className="py-3.5 px-4 text-right">UNIT COST</th>
                          <th className="py-3.5 px-4 text-right">BALANCE AMOUNT</th>
                          <th className="py-3.5 px-4">REMARKS / SPECS</th>
                          <th className="py-3.5 px-4 text-center min-w-[210px]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {loading ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center">
                              <Loader2 size={24} className="animate-spin text-[#006064] mx-auto mb-2" />
                              <span className="text-neutral-500 font-bold uppercase tracking-widest text-[10px]">
                                Loading Inventory...
                              </span>
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-neutral-500">
                              <Boxes size={32} className="mx-auto mb-2 opacity-30" />
                              <div className="font-bold text-sm text-neutral-700">No Fixed Inventory Entries Found</div>
                              <div className="text-xs text-neutral-400 mt-1">
                                Click "+ Create Fixed Entry" to add furniture, appliances, or infrastructure items.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item, index) => {
                            const formattedDate = item.entryDate
                              ? new Date(item.entryDate).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—';

                            return (
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

                                {/* Date */}
                                <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 font-semibold">
                                    <Calendar size={11} className="text-[#006064]" />
                                    {formattedDate}
                                  </span>
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
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                                    
                                    {/* 1. Transfer Button */}
                                    <button
                                      type="button"
                                      onClick={() => openTransferModal(item)}
                                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="Transfer units of this item to another centre"
                                    >
                                      <ArrowRightLeft size={11} />
                                      <span>Transfer</span>
                                    </button>

                                    {/* 2. Transfer History Button if past transfers exist */}
                                    {item.transferCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => openItemHistoryModal(item)}
                                        className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title={`View ${item.transferCount} past stock movements for ${item.productName}`}
                                      >
                                        <History size={10} className="text-purple-600" />
                                        <span>History ({item.transferCount})</span>
                                      </button>
                                    )}

                                    {/* 3. Edit & Delete */}
                                    <div className="flex items-center gap-1">
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
              </FadeUp>
            </>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* SUB-VIEW B: STOCK TRANSFER LEDGER TABLE                      */}
          {/* ──────────────────────────────────────────────────────────── */}
          {fixedSubView === 'TRANSFERS' && (
            <>
              {/* KPI Summary Cards */}
              <FadeUp delay={0.1}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 border border-purple-200 bg-purple-50/20 shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-800">Total Movements</div>
                    <div className="text-2xl font-display font-black mt-1 text-purple-900">{transferLogs.length}</div>
                    <div className="text-[11px] text-purple-700 font-light">Completed transfers</div>
                  </div>

                  <div className="bg-white p-5 border border-blue-200 bg-blue-50/20 shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800">Total Units Relocated</div>
                    <div className="text-2xl font-display font-black mt-1 text-blue-900">{totalUnitsTransferred} Units</div>
                    <div className="text-[11px] text-blue-700 font-light">Physical items moved</div>
                  </div>

                  <div className="bg-white p-5 border border-teal-200 bg-teal-50/20 shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-800">Centres Network</div>
                    <div className="text-2xl font-display font-black mt-1 text-teal-900">{locations.length} Locations</div>
                    <div className="text-[11px] text-teal-700 font-light">Connected workspace hubs</div>
                  </div>

                  <div className="bg-white p-5 border border-[var(--outline-variant)]/40 shadow-xs">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#616161]">Audit Status</div>
                    <div className="text-2xl font-display font-black mt-1 text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={20} className="text-emerald-600" />
                      <span>Verified</span>
                    </div>
                    <div className="text-[11px] text-[#616161] font-light">Immutable transfer logs</div>
                  </div>
                </div>
              </FadeUp>

              {/* Search & Filters Toolbar */}
              <FadeUp delay={0.15}>
                <div className="bg-white p-4 border border-[var(--outline-variant)]/40 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    
                    {/* Search */}
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                      <Search size={14} className="absolute left-3 top-2.5 text-[#616161]" />
                      <input
                        type="text"
                        placeholder="Search by asset, CM name, reason, or centre..."
                        value={logsSearchTerm}
                        onChange={(e) => setLogsSearchTerm(e.target.value)}
                        className="w-full bg-white border border-[var(--outline-variant)] pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#006064] font-medium"
                      />
                      {logsSearchTerm && (
                        <button onClick={() => setLogsSearchTerm('')} className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black">
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
                          value={logsLocationFilter}
                          onChange={(e) => setLogsLocationFilter(e.target.value)}
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
                        onClick={fetchTransferLogs}
                        className="p-1.5 text-[#616161] hover:text-[#006064] hover:bg-neutral-100 border border-[var(--outline-variant)] cursor-pointer"
                        title="Refresh Logs"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </FadeUp>

              {/* Full-Page Transfer Ledger Table */}
              <FadeUp delay={0.2}>
                <div className="bg-white border border-[var(--outline-variant)]/40 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3.5 px-4 w-12 text-center">#</th>
                          <th className="py-3.5 px-4 min-w-[140px]">DATE &amp; TIME</th>
                          <th className="py-3.5 px-4 min-w-[180px]">ASSET / PRODUCT</th>
                          <th className="py-3.5 px-4 text-center min-w-[110px]">QTY MOVED</th>
                          <th className="py-3.5 px-4 min-w-[160px]">SOURCE (FROM)</th>
                          <th className="py-3.5 px-4 min-w-[160px]">DESTINATION (TO)</th>
                          <th className="py-3.5 px-4 min-w-[130px]">LOGGED BY</th>
                          <th className="py-3.5 px-4 min-w-[220px]">PURPOSE / REMARKS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {filteredTransferLogs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-neutral-500">
                              <History size={32} className="mx-auto mb-2 opacity-30" />
                              <div className="font-bold text-sm text-neutral-700">No Stock Transfers Recorded</div>
                              <div className="text-xs text-neutral-400 mt-1">
                                {logsSearchTerm || logsLocationFilter !== 'ALL'
                                  ? 'Try clearing your search query or location filter.'
                                  : 'When inventory is transferred between centres, it will appear in this ledger.'}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredTransferLogs.map((log, idx) => (
                            <tr
                              key={log.id}
                              className={`hover:bg-teal-50/30 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                              }`}
                            >
                              {/* Row Index */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold text-neutral-500 text-[11px]">
                                #{idx + 1}
                              </td>

                              {/* Date & Time */}
                              <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                                <div className="font-semibold text-neutral-800 flex items-center gap-1.5">
                                  <Calendar size={12} className="text-[#006064]" />
                                  <span>{new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="text-neutral-400 text-[10px] pl-4">
                                  {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              {/* Asset Name */}
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-[#1B1C1C] text-sm flex items-center gap-2">
                                  <Package size={14} className="text-[#006064] shrink-0" />
                                  <span>{log.productName}</span>
                                </div>
                              </td>

                              {/* Quantity Moved */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-50 text-blue-900 border border-blue-300 font-mono font-black text-xs rounded">
                                  +{log.quantity} units
                                </span>
                              </td>

                              {/* Source Centre */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold uppercase rounded">
                                  <Building2 size={11} />
                                  {log.fromLocationName}
                                </span>
                              </td>

                              {/* Destination Centre */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase rounded">
                                  <Building2 size={11} />
                                  {log.toLocationName}
                                </span>
                              </td>

                              {/* Logged By */}
                              <td className="py-3.5 px-4 text-neutral-800 font-medium whitespace-nowrap">
                                <span className="text-[11px] font-bold">
                                  {log.transferredByName || 'Community Manager'}
                                </span>
                              </td>

                              {/* Remarks */}
                              <td className="py-3.5 px-4 text-neutral-600 max-w-xs" title={log.remarks || ''}>
                                {log.remarks ? (
                                  <span className="text-[11px] italic bg-neutral-100 px-2.5 py-1 border border-neutral-200 rounded block truncate">
                                    "{log.remarks}"
                                  </span>
                                ) : (
                                  <span className="text-neutral-300 italic text-[11px]">No notes</span>
                                )}
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
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: CONSUMED INVENTORY PLACEHOLDER                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CONSUMED' && (
        <FadeUp>
          <div className="bg-white border border-[var(--outline-variant)]/60 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <Layers size={28} />
            </div>
            <h3 className="text-xl font-bold text-[#1B1C1C]">Consumed Inventory &amp; Buffer Counter</h3>
            <p className="text-sm text-neutral-600 max-w-lg mx-auto">
              Track consumables, pantry supplies, printing paper, coffee/tea stock, and configure dynamic minimum buffer alert thresholds.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold uppercase tracking-wider">
              <span>Section Prepared &bull; Ready to activate on your request</span>
            </div>
          </div>
        </FadeUp>
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
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Boxes size={18} className="text-[#006064]" />
                  <span>{editingItem ? 'Edit Fixed Asset Item' : 'Create Fixed Inventory Entry'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
                
                {/* 1. DATE (Today by default, editable) */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Calendar size={12} className="text-[#006064]" />
                    <span>Date *</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* 2. CENTRE NODE */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Building2 size={12} className="text-[#006064]" />
                    <span>Centre Node *</span>
                  </label>
                  <select
                    value={formLocationId}
                    onChange={(e) => setFormLocationId(e.target.value)}
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

                {/* 3. PRODUCT / ASSET NAME (Select or Type New) */}
                <div className="space-y-1 relative">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Package size={12} className="text-[#006064]" />
                    <span>Product / Asset Name * (Select or Type New)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type product name (e.g. Ergonomic Chair, Table, Plates)..."
                      value={customProductInput}
                      onChange={(e) => {
                        setCustomProductInput(e.target.value);
                        setFormProductName(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      required
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Dynamic Suggestions Dropdown */}
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
                              setFormProductName(p);
                              setShowProductDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-teal-50 text-neutral-800 flex items-center justify-between cursor-pointer"
                          >
                            <span>{p}</span>
                            <span className="text-[10px] text-neutral-400 uppercase font-mono">Existing</span>
                          </button>
                        ))}
                      {customProductInput.trim() && !productSuggestions.includes(customProductInput.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormProductName(customProductInput.trim());
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold bg-teal-50 text-[#006064] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add New: "{customProductInput.trim()}"</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. QUANTITIES & OPTIONAL UNIT VALUATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Available / Stock Qty */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                      Available / Stock Qty *
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 10"
                      value={formAvailableQty}
                      onChange={(e) => handleAvailableQtyChange(e.target.value)}
                      required
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* Unit Valuation (Optional) */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center justify-between">
                      <span>Unit Valuation (₹ / unit)</span>
                      <span className="text-[9px] text-neutral-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0 (optional)"
                      value={formUnitCost}
                      onChange={(e) => handleUnitCostChange(e.target.value)}
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>
                </div>

                {/* 5. BALANCE QTY & LIVE CALCULATED VALUATION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200">
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-600 text-[9.5px]">
                      Balance Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formBalanceQty}
                      onChange={(e) => handleBalanceQtyChange(e.target.value)}
                      className="w-full bg-white border border-neutral-300 p-1.5 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  <div className="flex flex-col justify-center text-right">
                    <span className="text-neutral-500 font-bold uppercase text-[9.5px]">Calculated Balance Amount:</span>
                    <span className="font-mono font-black text-base text-[#006064]">
                      ₹{liveCalculatedBalanceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* 6. REMARKS / SPECS */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Remarks / Placement Location / Specs
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Floor 2 Conference Room, White Laminate Finish"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 cursor-pointer"
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
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
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
                {/* 1. Transfer Date (Default Today, Editable) */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Calendar size={12} className="text-[#006064]" />
                    <span>Transfer Date *</span>
                  </label>
                  <input
                    type="date"
                    value={transferData.date}
                    onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                </div>

                {/* 2. Product / Asset Name */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Package size={12} className="text-[#006064]" />
                    <span>Product / Asset Name</span>
                  </label>
                  <input
                    type="text"
                    value={transferSourceItem.productName}
                    disabled
                    className="w-full bg-neutral-100 border border-neutral-300 p-2 text-xs font-bold text-neutral-800 cursor-not-allowed"
                  />
                </div>

                {/* 3. Destination Centre */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                    <Building2 size={12} className="text-[#006064]" />
                    <span>Destination Centre Node *</span>
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

                {/* 4. Transfer Quantity */}
                <div className="space-y-1">
                  <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                    Transfer Quantity (Max: {transferSourceItem.balanceQty}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={transferSourceItem.balanceQty}
                    value={transferData.quantity}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^0+(?=\d)/, '');
                      setTransferData({ ...transferData, quantity: cleaned });
                    }}
                    required
                    className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                  />
                  <div className="text-[10px] text-neutral-500 italic mt-0.5">
                    Remaining at {transferSourceItem.locationName}:{' '}
                    <strong>{Math.max(0, transferSourceItem.balanceQty - (parseInt(transferData.quantity, 10) || 0))} units</strong>
                  </div>
                </div>

                {/* 5. Transfer Remarks */}
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
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-100 cursor-pointer"
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

      {/* ── MODAL 3: ITEM-SPECIFIC TRANSFER HISTORY MODAL ── */}
      <AnimatePresence>
        {selectedItemForHistory && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[var(--outline-variant)] p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-[#1B1C1C] flex items-center gap-2">
                    <History size={18} className="text-[#006064]" />
                    <span>Transfer History: {selectedItemForHistory.productName}</span>
                  </h3>
                  <div className="text-[11px] text-neutral-500">
                    Centre: <strong>{selectedItemForHistory.locationName}</strong> &bull; Current Balance: <strong>{selectedItemForHistory.balanceQty} units</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemForHistory(null)}
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-neutral-100 pr-1">
                {selectedItemForHistory.transferLogs.length === 0 ? (
                  <div className="py-10 text-center text-neutral-400 text-xs">
                    No transfer movements recorded for this item yet.
                  </div>
                ) : (
                  selectedItemForHistory.transferLogs.map((log) => {
                    const isOutward = log.fromLocationId === selectedItemForHistory.locationId;
                    return (
                      <div key={log.id} className="py-3 px-2 flex items-start justify-between gap-4 text-xs hover:bg-neutral-50 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {isOutward ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-mono font-black rounded">
                                📤 OUTWARD SENT: -{log.quantity} units
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-black rounded">
                                📥 INWARD RECEIVED: +{log.quantity} units
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-neutral-700 text-xs">
                            <span className={`font-bold px-2 py-0.5 rounded border ${isOutward ? 'bg-red-50 text-red-800 border-red-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                              From: {log.fromLocationName}
                            </span>
                            <ArrowRightLeft size={12} className="text-neutral-400" />
                            <span className={`font-bold px-2 py-0.5 rounded border ${!isOutward ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                              To: {log.toLocationName}
                            </span>
                          </div>

                          {log.remarks && (
                            <div className="text-[11px] text-neutral-600 bg-neutral-50 p-2 border border-neutral-200 italic mt-1 rounded">
                              Remarks: "{log.remarks}"
                            </div>
                          )}
                        </div>

                        <div className="text-right text-[10px] text-neutral-400 shrink-0 space-y-0.5">
                          <div className="font-mono font-semibold text-neutral-700">
                            {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="font-mono text-neutral-500">
                            {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {log.transferredByName && (
                            <div className="text-neutral-600 font-medium">By: {log.transferredByName}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-between shrink-0">
                {selectedItemForHistory.balanceQty > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedItemForHistory;
                      setSelectedItemForHistory(null);
                      openTransferModal(item);
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Transfer More Stock from {selectedItemForHistory.locationName}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-neutral-400 font-medium italic">
                    0 balance units available at {selectedItemForHistory.locationName}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItemForHistory(null)}
                  className="px-5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold uppercase tracking-wider text-xs cursor-pointer"
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
