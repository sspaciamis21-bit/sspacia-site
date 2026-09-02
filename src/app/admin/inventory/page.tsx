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
  ShoppingCart,
  Minus,
  AlertOctagon,
  Bell,
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

interface ConsumedItem {
  id: number;
  srNo: number;
  entryDate: string;
  productName: string;
  locationId: number | null;
  locationName: string;
  initialQty: number;
  balanceQty: number;
  bufferLimit: number;
  unitCost: number;
  balanceAmount: number;
  remarks: string | null;
  isBufferAlertActive: boolean;
  bufferAlertTriggeredAt: string | null;
  purchaseStatus: 'NORMAL' | 'PENDING_PURCHASE' | 'DELIVERED';
  purchasePlannedAt: string | null;
  purchaseActualAt: string | null;
  isLowStock: boolean;
  reorderQty: number;
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

  // Fixed Inventory State
  const [items, setItems] = useState<FixedItem[]>([]);
  const [fixedSuggestions, setFixedSuggestions] = useState<string[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLog[]>([]);

  // Consumed Inventory State
  const [consumedItems, setConsumedItems] = useState<ConsumedItem[]>([]);
  const [consumedSuggestions, setConsumedSuggestions] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [consumedLoading, setConsumedLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConsumedModal, setShowConsumedModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<FixedItem | null>(null);

  // Transfer Logs view search & filter
  const [logsSearchTerm, setLogsSearchTerm] = useState('');
  const [logsLocationFilter, setLogsLocationFilter] = useState('ALL');

  const [editingItem, setEditingItem] = useState<FixedItem | null>(null);
  const [editingConsumedItem, setEditingConsumedItem] = useState<ConsumedItem | null>(null);
  const [transferSourceItem, setTransferSourceItem] = useState<FixedItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Fixed Inventory
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formLocationId, setFormLocationId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formAvailableQty, setFormAvailableQty] = useState('1');
  const [formBalanceQty, setFormBalanceQty] = useState('1');
  const [formUnitCost, setFormUnitCost] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Form states for Consumed Inventory
  const [consumedFormDate, setConsumedFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [consumedFormLocationId, setConsumedFormLocationId] = useState('');
  const [consumedFormProductName, setConsumedFormProductName] = useState('');
  const [consumedFormAvailableQty, setConsumedFormAvailableQty] = useState('1');
  const [consumedFormBufferLimit, setConsumedFormBufferLimit] = useState('3');
  const [consumedFormBalanceQty, setConsumedFormBalanceQty] = useState('1');
  const [consumedFormUnitCost, setConsumedFormUnitCost] = useState('');
  const [consumedFormRemarks, setConsumedFormRemarks] = useState('');

  // Form states for Transfer
  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    toLocationId: '',
    quantity: '1',
    remarks: '',
  });

  // Dynamic dropdown states
  const [customProductInput, setCustomProductInput] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [customConsumedInput, setCustomConsumedInput] = useState('');
  const [showConsumedDropdown, setShowConsumedDropdown] = useState(false);

  const isAdmin =
    user?.role?.toUpperCase().includes('ADMIN') ||
    user?.role?.toUpperCase().includes('SUPERADMIN');

  // Fetch Fixed Inventory Data
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
        setFixedSuggestions(json.productSuggestions || []);
        setLocations(json.locations || []);

        if (!isAdmin && json.userAssignedLocationIds?.length > 0) {
          const defaultLocId = String(json.userAssignedLocationIds[0]);
          if (!formLocationId) setFormLocationId(defaultLocId);
          if (!consumedFormLocationId) setConsumedFormLocationId(defaultLocId);
        } else if (json.locations?.length > 0) {
          if (!formLocationId) setFormLocationId(String(json.locations[0].id));
          if (!consumedFormLocationId) setConsumedFormLocationId(String(json.locations[0].id));
        }
      } else {
        toast.error(json.error || 'Failed to fetch fixed inventory');
      }
    } catch {
      toast.error('Network error loading fixed inventory');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Consumed Inventory Data
  const fetchConsumedInventory = async () => {
    setConsumedLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedLocationFilter !== 'ALL') query.append('locationId', selectedLocationFilter);
      if (searchTerm.trim()) query.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/inventory/consumed?${query.toString()}`);
      const json = await res.json();

      if (json.success) {
        setConsumedItems(json.data || []);
        setConsumedSuggestions(json.productSuggestions || []);
      } else {
        toast.error(json.error || 'Failed to fetch consumed inventory');
      }
    } catch {
      toast.error('Network error loading consumed inventory');
    } finally {
      setConsumedLoading(false);
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
    fetchConsumedInventory();
    fetchTransferLogs();
  }, [selectedLocationFilter]);

  // Filter fixed items by search locally
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

  // Filter consumed items by search locally
  const filteredConsumedItems = useMemo(() => {
    return consumedItems.filter((it) => {
      const matchSearch =
        !searchTerm.trim() ||
        it.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (it.remarks && it.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        it.locationName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLoc =
        selectedLocationFilter === 'ALL' || String(it.locationId) === selectedLocationFilter;

      return matchSearch && matchLoc;
    });
  }, [consumedItems, searchTerm, selectedLocationFilter]);

  // Buffer Alerts count
  const activeBufferAlerts = useMemo(() => {
    return filteredConsumedItems.filter((it) => it.isLowStock || it.isBufferAlertActive);
  }, [filteredConsumedItems]);

  // KPIs for Fixed Stock View
  const kpis = useMemo(() => {
    const totalEntries = filteredItems.length;
    const totalUnits = filteredItems.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0);
    const totalValuation = filteredItems.reduce((s, it) => s + (Number(it.balanceAmount) || 0), 0);
    const totalTransfers = transferLogs.length;

    return { totalEntries, totalUnits, totalValuation, totalTransfers };
  }, [filteredItems, transferLogs]);

  // KPIs for Consumed Inventory
  const consumedKpis = useMemo(() => {
    const totalEntries = filteredConsumedItems.length;
    const totalUnits = filteredConsumedItems.reduce((s, it) => s + (Number(it.balanceQty) || 0), 0);
    const totalValuation = filteredConsumedItems.reduce((s, it) => s + (Number(it.balanceAmount) || 0), 0);
    const bufferAlertCount = activeBufferAlerts.length;

    return { totalEntries, totalUnits, totalValuation, bufferAlertCount };
  }, [filteredConsumedItems, activeBufferAlerts]);

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

  // Calculate live balance amount in Fixed modal
  const liveCalculatedBalanceAmount = useMemo(() => {
    const qty = parseFloat(formBalanceQty) || 0;
    const cost = parseFloat(formUnitCost) || 0;
    return qty * cost;
  }, [formBalanceQty, formUnitCost]);

  // Calculate live balance amount in Consumed modal
  const liveCalculatedConsumedBalanceAmount = useMemo(() => {
    const qty = parseFloat(consumedFormBalanceQty) || 0;
    const cost = parseFloat(consumedFormUnitCost) || 0;
    return qty * cost;
  }, [consumedFormBalanceQty, consumedFormUnitCost]);

  // Handle Available Qty input change with auto-sync to Balance Qty on new entries (Fixed)
  const handleAvailableQtyChange = (val: string) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setFormAvailableQty(cleaned);
    if (!editingItem) {
      setFormBalanceQty(cleaned);
    }
  };

  // Handle Available Qty input change for Consumed
  const handleConsumedAvailableQtyChange = (val: string) => {
    const cleaned = val === '' ? '' : val.replace(/^0+(?=\d)/, '');
    setConsumedFormAvailableQty(cleaned);
    if (!editingConsumedItem) {
      setConsumedFormBalanceQty(cleaned);
    }
  };

  // Open Create Fixed Modal
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

  // Open Edit Fixed Modal
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

  // Open Create Consumed Modal
  const openConsumedCreateModal = () => {
    setEditingConsumedItem(null);
    setConsumedFormDate(new Date().toISOString().split('T')[0]);
    setConsumedFormLocationId(locations[0]?.id ? String(locations[0].id) : '');
    setConsumedFormProductName('');
    setCustomConsumedInput('');
    setConsumedFormAvailableQty('6');
    setConsumedFormBalanceQty('6');
    setConsumedFormBufferLimit('3');
    setConsumedFormUnitCost('');
    setConsumedFormRemarks('');
    setShowConsumedModal(true);
  };

  // Open Edit Consumed Modal
  const openConsumedEditModal = (item: ConsumedItem) => {
    setEditingConsumedItem(item);
    const formattedDate = item.entryDate
      ? new Date(item.entryDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setConsumedFormDate(formattedDate);
    setConsumedFormLocationId(item.locationId ? String(item.locationId) : '');
    setConsumedFormProductName(item.productName);
    setCustomConsumedInput(item.productName);
    setConsumedFormAvailableQty(String(item.initialQty));
    setConsumedFormBalanceQty(String(item.balanceQty));
    setConsumedFormBufferLimit(String(item.bufferLimit));
    setConsumedFormUnitCost(item.unitCost ? String(item.unitCost) : '');
    setConsumedFormRemarks(item.remarks || '');
    setShowConsumedModal(true);
  };

  // Handle Save Fixed Item
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
        toast.success(json.message || 'Fixed inventory saved successfully!');
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

  // Handle Save Consumed Item
  const handleSaveConsumedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalProductName = (consumedFormProductName || customConsumedInput).trim();

    if (!finalProductName) {
      toast.error('Please specify a Consumable Product / Item name');
      return;
    }

    if (!consumedFormLocationId) {
      toast.error('Please select a Centre Node');
      return;
    }

    const initialQtyNum = parseInt(consumedFormAvailableQty, 10) || 0;
    const balanceQtyNum = parseInt(consumedFormBalanceQty, 10) || 0;
    const bufferLimitNum = Math.max(1, parseInt(consumedFormBufferLimit, 10) || 1);
    const unitCostNum = parseFloat(consumedFormUnitCost) || 0;

    setActionLoading(true);
    try {
      const url = editingConsumedItem
        ? `/api/admin/inventory/consumed/${editingConsumedItem.id}`
        : '/api/admin/inventory/consumed';

      const method = editingConsumedItem ? 'PUT' : 'POST';

      const payload = {
        entryDate: consumedFormDate,
        productName: finalProductName,
        locationId: Number(consumedFormLocationId),
        initialQty: initialQtyNum,
        balanceQty: balanceQtyNum,
        bufferLimit: bufferLimitNum,
        unitCost: unitCostNum,
        remarks: consumedFormRemarks.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Consumed inventory saved successfully!');
        setShowConsumedModal(false);
        setEditingConsumedItem(null);
        fetchConsumedInventory();
      } else {
        toast.error(json.error || 'Failed to save consumable entry');
      }
    } catch {
      toast.error('Network error saving consumable item');
    } finally {
      setActionLoading(false);
    }
  };

  // Inline Quick Adjust Available Qty for Consumed item (Increments/Decrements & triggers buffer evaluation)
  const handleQuickAdjustConsumedQty = async (item: ConsumedItem, delta: number) => {
    const newQty = Math.max(0, item.balanceQty + delta);
    try {
      const res = await fetch(`/api/admin/inventory/consumed/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balanceQty: newQty,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchConsumedInventory();
      } else {
        toast.error(json.error || 'Failed to update stock');
      }
    } catch {
      toast.error('Network error updating stock');
    }
  };

  // Confirm Purchase Delivery by Community Manager
  const handleConfirmPurchaseDelivery = async (item: ConsumedItem) => {
    const promptMsg = `Has the Purchase Executive delivered "${item.productName}" (${item.reorderQty} units) to ${item.locationName}?\n\nThis will record the Actual timestamp in Google Sheets FMS and mark status as Done. (Note: Please manually update available quantity once unpacked).`;
    if (!confirm(promptMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/consumed/${item.id}/confirm-delivery`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        fetchConsumedInventory();
      } else {
        toast.error(json.error || 'Failed to confirm delivery');
      }
    } catch {
      toast.error('Network error confirming delivery');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Consumed Item
  const handleDeleteConsumedItem = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete consumable "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/inventory/consumed/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`"${name}" deleted successfully.`);
        fetchConsumedInventory();
      } else {
        toast.error(json.error || 'Failed to delete item');
      }
    } catch {
      toast.error('Network error deleting item');
    }
  };

  // Delete Fixed Item
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

  return (
    <div className="p-4 sm:p-6 max-w-[1700px] mx-auto space-y-3.5 bg-[#F8F9FA] min-h-screen text-[#1B1C1C]">
      
      {/* ── TOP COMPACT UNIFIED CONTROL BAR ── */}
      <FadeUp>
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-white border border-[var(--outline-variant)]/50 shadow-2xs">
          
          {/* Main Category Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('FIXED')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'FIXED'
                  ? 'bg-[#006064] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Boxes size={14} />
              <span>Fixed Inventory</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeTab === 'FIXED' ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-800'
              }`}>
                {items.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CONSUMED')}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'CONSUMED'
                  ? 'bg-[#006064] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Layers size={14} />
              <span>Consumed Inventory</span>
              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold ${
                activeBufferAlerts.length > 0
                  ? 'bg-red-500 text-white animate-pulse'
                  : activeTab === 'CONSUMED'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {activeBufferAlerts.length > 0 ? `BUFFER ALERT (${activeBufferAlerts.length})` : consumedItems.length}
              </span>
            </button>
          </div>

          {/* Sub-View Switcher (for Fixed) & Create Action */}
          <div className="flex items-center gap-2">
            {activeTab === 'FIXED' ? (
              <>
                <div className="flex items-center bg-neutral-100 p-0.5 border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setFixedSubView('STOCK')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      fixedSubView === 'STOCK'
                        ? 'bg-white text-[#006064] shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Boxes size={12} />
                    <span>Live Stock ({items.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFixedSubView('TRANSFERS')}
                    className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      fixedSubView === 'TRANSFERS'
                        ? 'bg-white text-[#006064] shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ArrowRightLeft size={12} />
                    <span>Transfer History ({transferLogs.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-3.5 py-1.5 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Fixed Entry</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openConsumedCreateModal}
                className="px-3.5 py-1.5 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Consumed Entry</span>
              </button>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: FIXED INVENTORY AREA                                        */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'FIXED' && (
        <>
          {/* Header + Compact Inline KPI Chips */}
          <FadeUp delay={0.03}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--outline-variant)]/40">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-[#1B1C1C] flex items-center gap-2">
                  <span>{fixedSubView === 'STOCK' ? 'Fixed Inventory & Live Stock' : 'Stock Transfer History & Audit Ledger'}</span>
                  <span className="text-[11px] font-normal text-neutral-400 font-sans">
                    ({fixedSubView === 'STOCK' ? `${items.length} items` : `${transferLogs.length} transfers`})
                  </span>
                </h1>
                <p className="text-[11px] text-[#616161] font-light">
                  {fixedSubView === 'STOCK'
                    ? 'Physical assets, balance quantities, valuations, and inter-centre stock transfers.'
                    : 'Audit ledger of physical stock relocation between centres and community manager logs.'}
                </p>
              </div>

              {/* Inline KPI Chips */}
              {fixedSubView === 'STOCK' ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 shadow-2xs font-medium">
                    <Boxes size={12} className="text-neutral-500" />
                    <span className="text-[10px] uppercase font-bold text-neutral-500">Asset Types:</span>
                    <strong className="text-neutral-900 font-mono">{kpis.totalEntries}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 shadow-2xs font-medium">
                    <Package size={12} className="text-teal-700" />
                    <span className="text-[10px] uppercase font-bold text-teal-700">Live Balance:</span>
                    <strong className="text-teal-950 font-mono font-black">{kpis.totalUnits.toLocaleString('en-IN')} units</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 shadow-2xs font-medium">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Total Value:</span>
                    <strong className="text-emerald-950 font-mono font-black">₹{kpis.totalValuation.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 shadow-2xs font-medium">
                    <ArrowRightLeft size={12} className="text-purple-700" />
                    <span className="text-[10px] uppercase font-bold text-purple-700">Transfers:</span>
                    <strong className="text-purple-950 font-mono">{kpis.totalTransfers}</strong>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-200 shadow-2xs font-medium">
                    <ArrowRightLeft size={12} className="text-purple-700" />
                    <span className="text-[10px] uppercase font-bold text-purple-700">Movements:</span>
                    <strong className="text-purple-950 font-mono">{transferLogs.length}</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 shadow-2xs font-medium">
                    <Package size={12} className="text-blue-700" />
                    <span className="text-[10px] uppercase font-bold text-blue-700">Relocated:</span>
                    <strong className="text-blue-950 font-mono font-black">{totalUnitsTransferred} Units</strong>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 shadow-2xs font-medium">
                    <Building2 size={12} className="text-teal-700" />
                    <span className="text-[10px] uppercase font-bold text-teal-700">Centres:</span>
                    <strong className="text-teal-950 font-mono">{locations.length} Locations</strong>
                  </div>
                </div>
              )}
            </div>
          </FadeUp>

          {/* Sub-View A: Fixed Live Stock Table */}
          {fixedSubView === 'STOCK' && (
            <>
              <FadeUp delay={0.06}>
                <div className="bg-white p-2.5 border border-[var(--outline-variant)]/50 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={13} className="absolute left-2.5 top-2 text-[#616161]" />
                    <input
                      type="text"
                      placeholder="Search asset, remarks, or centre..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-[var(--outline-variant)] pl-7 pr-3 py-1 text-xs focus:outline-none focus:border-[#006064] font-medium"
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1.5 text-neutral-400 hover:text-black">
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-[var(--outline-variant)] px-2.5 py-1 shadow-2xs">
                      <MapPin size={12} className="text-[#006064]" />
                      <span className="text-[10px] font-bold text-neutral-700 uppercase">Centre:</span>
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
                      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.09}>
                <div className="bg-white border border-[var(--outline-variant)]/50 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3.5 w-10">SR.NO</th>
                          <th className="py-2.5 px-3.5">DATE</th>
                          <th className="py-2.5 px-3.5">CENTRE NODE</th>
                          <th className="py-2.5 px-3.5">PRODUCT / ASSET NAME</th>
                          <th className="py-2.5 px-3.5 text-center">INITIAL QTY</th>
                          <th className="py-2.5 px-3.5 text-center">BALANCE QTY</th>
                          <th className="py-2.5 px-3.5 text-right">UNIT COST</th>
                          <th className="py-2.5 px-3.5 text-right">BALANCE AMOUNT</th>
                          <th className="py-2.5 px-3.5">REMARKS / SPECS</th>
                          <th className="py-2.5 px-3.5 text-center min-w-[200px]">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {loading ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center">
                              <Loader2 size={20} className="animate-spin text-[#006064] mx-auto mb-1.5" />
                              <span className="text-neutral-500 font-bold uppercase tracking-widest text-[9.5px]">
                                Loading Inventory...
                              </span>
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-neutral-500">
                              <Boxes size={28} className="mx-auto mb-1.5 opacity-30" />
                              <div className="font-bold text-xs text-neutral-700">No Fixed Inventory Entries Found</div>
                              <div className="text-[11px] text-neutral-400 mt-0.5">
                                Click "+ Create Fixed Entry" to add items.
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
                                <td className="py-2.5 px-3.5 font-mono font-bold text-neutral-500 text-[11px]">
                                  #{item.srNo || index + 1}
                                </td>
                                <td className="py-2.5 px-3.5 font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 font-semibold">
                                    <Calendar size={11} className="text-[#006064]" />
                                    {formattedDate}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 font-medium">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-bold uppercase">
                                    <Building2 size={10} className="text-[#006064]" />
                                    {item.locationName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <div className="font-extrabold text-[#1B1C1C] text-xs sm:text-sm flex items-center gap-1.5">
                                    <Package size={13} className="text-[#006064] shrink-0" />
                                    <span>{item.productName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5 text-center font-mono font-bold text-neutral-600">
                                  {item.initialQty}
                                </td>
                                <td className="py-2.5 px-3.5 text-center">
                                  <span
                                    className={`inline-flex items-center justify-center px-2.5 py-0.5 text-[11px] font-mono font-black border ${
                                      item.balanceQty > 0
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        : 'bg-red-50 text-red-700 border-red-300'
                                    }`}
                                  >
                                    {item.balanceQty} units
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono text-neutral-600">
                                  {item.unitCost > 0 ? `₹${Number(item.unitCost).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#006064]">
                                  {item.balanceAmount > 0 ? `₹${Number(item.balanceAmount).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="py-2.5 px-3.5 text-neutral-600 max-w-xs truncate text-[11px]" title={item.remarks || ''}>
                                  {item.remarks || <span className="text-neutral-300 italic">No notes</span>}
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openTransferModal(item)}
                                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                      title="Transfer units to another centre"
                                    >
                                      <ArrowRightLeft size={10} />
                                      <span>Transfer</span>
                                    </button>

                                    {item.transferCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedItemForHistory(item)}
                                        className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title={`View ${item.transferCount} past stock movements`}
                                      >
                                        <History size={10} className="text-purple-600" />
                                        <span>History ({item.transferCount})</span>
                                      </button>
                                    )}

                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(item)}
                                        className="p-1 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100 cursor-pointer"
                                        title="Edit Item"
                                      >
                                        <Edit2 size={12} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item.id, item.productName)}
                                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                        title="Delete Item"
                                      >
                                        <Trash2 size={12} />
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

          {/* Sub-View B: Stock Transfer Ledger */}
          {fixedSubView === 'TRANSFERS' && (
            <>
              <FadeUp delay={0.06}>
                <div className="bg-white p-2.5 border border-[var(--outline-variant)]/50 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={13} className="absolute left-2.5 top-2 text-[#616161]" />
                    <input
                      type="text"
                      placeholder="Search by asset, CM name, reason, or centre..."
                      value={logsSearchTerm}
                      onChange={(e) => setLogsSearchTerm(e.target.value)}
                      className="w-full bg-white border border-[var(--outline-variant)] pl-7 pr-3 py-1 text-xs focus:outline-none focus:border-[#006064] font-medium"
                    />
                    {logsSearchTerm && (
                      <button onClick={() => setLogsSearchTerm('')} className="absolute right-2 top-1.5 text-neutral-400 hover:text-black">
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-[var(--outline-variant)] px-2.5 py-1 shadow-2xs">
                      <MapPin size={12} className="text-[#006064]" />
                      <span className="text-[10px] font-bold text-neutral-700 uppercase">Centre:</span>
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
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              </FadeUp>

              <FadeUp delay={0.09}>
                <div className="bg-white border border-[var(--outline-variant)]/50 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3.5 w-10 text-center">#</th>
                          <th className="py-2.5 px-3.5 min-w-[130px]">DATE &amp; TIME</th>
                          <th className="py-2.5 px-3.5 min-w-[160px]">ASSET / PRODUCT</th>
                          <th className="py-2.5 px-3.5 text-center min-w-[100px]">QTY MOVED</th>
                          <th className="py-2.5 px-3.5 min-w-[140px]">SOURCE (FROM)</th>
                          <th className="py-2.5 px-3.5 min-w-[140px]">DESTINATION (TO)</th>
                          <th className="py-2.5 px-3.5 min-w-[120px]">LOGGED BY</th>
                          <th className="py-2.5 px-3.5 min-w-[200px]">PURPOSE / REMARKS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {filteredTransferLogs.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-neutral-500">
                              <History size={28} className="mx-auto mb-1.5 opacity-30" />
                              <div className="font-bold text-xs text-neutral-700">No Stock Transfers Recorded</div>
                              <div className="text-[11px] text-neutral-400 mt-0.5">
                                When inventory is transferred between centres, it will appear in this ledger.
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
                              <td className="py-2.5 px-3.5 text-center font-mono font-bold text-neutral-500 text-[11px]">
                                #{idx + 1}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono text-[11px] whitespace-nowrap">
                                <div className="font-semibold text-neutral-800 flex items-center gap-1">
                                  <Calendar size={11} className="text-[#006064]" />
                                  <span>{new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="text-neutral-400 text-[10px] pl-3.5">
                                  {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <div className="font-extrabold text-[#1B1C1C] text-xs sm:text-sm flex items-center gap-1.5">
                                  <Package size={13} className="text-[#006064] shrink-0" />
                                  <span>{log.productName}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-300 font-mono font-black text-xs rounded">
                                  +{log.quantity} units
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold uppercase rounded">
                                  <Building2 size={10} />
                                  {log.fromLocationName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase rounded">
                                  <Building2 size={10} />
                                  {log.toLocationName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-neutral-800 font-medium whitespace-nowrap">
                                <span className="text-[11px] font-bold">
                                  {log.transferredByName || 'Community Manager'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-neutral-600 max-w-xs text-[11px]" title={log.remarks || ''}>
                                {log.remarks ? (
                                  <span className="italic bg-neutral-100 px-2 py-0.5 border border-neutral-200 rounded block truncate">
                                    "{log.remarks}"
                                  </span>
                                ) : (
                                  <span className="text-neutral-300 italic">No notes</span>
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
      {/* SECTION 2: CONSUMED INVENTORY AREA                                     */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'CONSUMED' && (
        <>
          {/* Header + Inline KPI Chips */}
          <FadeUp delay={0.03}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-[var(--outline-variant)]/40">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-[#1B1C1C] flex items-center gap-2">
                  <span>Consumed Inventory &amp; Buffer Management</span>
                  <span className="text-[11px] font-normal text-neutral-400 font-sans">
                    ({filteredConsumedItems.length} consumables)
                  </span>
                </h1>
                <p className="text-[11px] text-[#616161] font-light">
                  Track perishable supplies (sugar, tea, coffee, tissue, paper, handwash) with automated buffer limit reorders (3x) and Google Sheets FMS tracking.
                </p>
              </div>

              {/* Inline KPI Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 shadow-2xs font-medium">
                  <Layers size={12} className="text-neutral-500" />
                  <span className="text-[10px] uppercase font-bold text-neutral-500">Items:</span>
                  <strong className="text-neutral-900 font-mono">{consumedKpis.totalEntries}</strong>
                </div>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 border shadow-2xs font-medium ${
                  consumedKpis.bufferAlertCount > 0
                    ? 'bg-red-50 text-red-900 border-red-300'
                    : 'bg-teal-50 text-teal-900 border-teal-200'
                }`}>
                  <AlertOctagon size={12} className={consumedKpis.bufferAlertCount > 0 ? 'text-red-600 animate-bounce' : 'text-teal-600'} />
                  <span className="text-[10px] uppercase font-bold">Buffer Alerts:</span>
                  <strong className="font-mono font-black">{consumedKpis.bufferAlertCount} Items</strong>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 shadow-2xs font-medium">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Live Value:</span>
                  <strong className="text-emerald-950 font-mono font-black">₹{consumedKpis.totalValuation.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* ── HIGH-VISIBILITY BUFFER STOCK ALERT BANNER (IF ANY ITEM <= BUFFER LIMIT) ── */}
          {activeBufferAlerts.length > 0 && (
            <FadeUp delay={0.05}>
              <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border-l-4 border-red-600 p-3.5 shadow-xs space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-red-900 text-xs sm:text-sm uppercase tracking-wide">
                    <AlertTriangle size={16} className="text-red-600 animate-pulse" />
                    <span>⚠️ Immediate Replenishment Required ({activeBufferAlerts.length} Low Stock Items)</span>
                  </div>
                  <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded uppercase font-mono">
                    Purchase Email Dispatched (3x Buffer)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {activeBufferAlerts.map((alertItem) => (
                    <div
                      key={alertItem.id}
                      className="bg-white border border-red-200 p-2.5 shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-neutral-900 flex items-center gap-1.5">
                            <Package size={13} className="text-red-600 shrink-0" />
                            <span>{alertItem.productName}</span>
                          </strong>
                          <span className="text-[9.5px] font-bold text-neutral-500 uppercase">
                            {alertItem.locationName}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 flex items-center gap-2 font-mono">
                          <span>Stock: <strong className="text-red-700 font-bold">{alertItem.balanceQty}</strong> / Buffer: {alertItem.bufferLimit}</span>
                          <span className="text-emerald-700 font-bold">(PO: +{alertItem.reorderQty} units)</span>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <span className="text-[9.5px] text-neutral-400 italic">
                          {alertItem.purchaseStatus === 'DELIVERED' ? 'Delivery Confirmed' : 'Purchase Pending'}
                        </span>

                        {alertItem.purchaseStatus !== 'DELIVERED' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmPurchaseDelivery(alertItem)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Confirm that Purchase Executive delivered this item"
                          >
                            <CheckCircle2 size={11} />
                            <span>Mark Delivered</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}

          {/* Search & Filter Toolbar */}
          <FadeUp delay={0.06}>
            <div className="bg-white p-2.5 border border-[var(--outline-variant)]/50 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search size={13} className="absolute left-2.5 top-2 text-[#616161]" />
                <input
                  type="text"
                  placeholder="Search consumable, remarks, or centre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[var(--outline-variant)] pl-7 pr-3 py-1 text-xs focus:outline-none focus:border-[#006064] font-medium"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1.5 text-neutral-400 hover:text-black">
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-[var(--outline-variant)] px-2.5 py-1 shadow-2xs">
                  <MapPin size={12} className="text-[#006064]" />
                  <span className="text-[10px] font-bold text-neutral-700 uppercase">Centre:</span>
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
                  onClick={fetchConsumedInventory}
                  className="p-1.5 text-[#616161] hover:text-[#006064] hover:bg-neutral-100 border border-[var(--outline-variant)] cursor-pointer"
                  title="Refresh Consumables"
                >
                  <RefreshCw size={13} className={consumedLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </FadeUp>

          {/* Consumed Inventory Data Table */}
          <FadeUp delay={0.09}>
            <div className="bg-white border border-[var(--outline-variant)]/50 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#006064] text-white border-b border-[#004d40] text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3.5 w-10">SR.NO</th>
                      <th className="py-2.5 px-3.5">DATE</th>
                      <th className="py-2.5 px-3.5">CENTRE NODE</th>
                      <th className="py-2.5 px-3.5">CONSUMABLE ITEM</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[130px]">AVAILABLE QTY</th>
                      <th className="py-2.5 px-3.5 text-center">BUFFER LIMIT</th>
                      <th className="py-2.5 px-3.5 text-center">BUFFER STATUS</th>
                      <th className="py-2.5 px-3.5 text-center">PURCHASE FMS</th>
                      <th className="py-2.5 px-3.5 text-right">UNIT COST</th>
                      <th className="py-2.5 px-3.5 text-right">BALANCE VALUE</th>
                      <th className="py-2.5 px-3.5">REMARKS / NOTES</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[170px]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {consumedLoading ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center">
                          <Loader2 size={20} className="animate-spin text-[#006064] mx-auto mb-1.5" />
                          <span className="text-neutral-500 font-bold uppercase tracking-widest text-[9.5px]">
                            Loading Consumed Inventory...
                          </span>
                        </td>
                      </tr>
                    ) : filteredConsumedItems.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-neutral-500">
                          <Layers size={28} className="mx-auto mb-1.5 opacity-30" />
                          <div className="font-bold text-xs text-neutral-700">No Consumed Inventory Entries Found</div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            Click "+ Create Consumed Entry" to add sugar, tea, tissue paper, or office supplies.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredConsumedItems.map((item, index) => {
                        const formattedDate = item.entryDate
                          ? new Date(item.entryDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—';

                        const isBreached = item.balanceQty <= item.bufferLimit;

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-teal-50/30 transition-colors ${
                              isBreached
                                ? 'bg-red-50/25'
                                : index % 2 === 0
                                ? 'bg-white'
                                : 'bg-[#FAFAFA]'
                            }`}
                          >
                            {/* SR. No */}
                            <td className="py-2.5 px-3.5 font-mono font-bold text-neutral-500 text-[11px]">
                              #{item.srNo || index + 1}
                            </td>

                            {/* Date */}
                            <td className="py-2.5 px-3.5 font-mono text-[11px] text-neutral-700 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Calendar size={11} className="text-[#006064]" />
                                {formattedDate}
                              </span>
                            </td>

                            {/* Centre Node */}
                            <td className="py-2.5 px-3.5 font-medium">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] font-bold uppercase">
                                <Building2 size={10} className="text-[#006064]" />
                                {item.locationName}
                              </span>
                            </td>

                            {/* Product Name */}
                            <td className="py-2.5 px-3.5">
                              <div className="font-extrabold text-[#1B1C1C] text-xs sm:text-sm flex items-center gap-1.5">
                                <Package size={13} className="text-[#006064] shrink-0" />
                                <span>{item.productName}</span>
                              </div>
                            </td>

                            {/* Available Qty with quick -1 and +1 inline buttons */}
                            <td className="py-2.5 px-3.5 text-center">
                              <div className="inline-flex items-center justify-center gap-1.5 bg-white border border-neutral-300 p-0.5 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustConsumedQty(item, -1)}
                                  disabled={item.balanceQty <= 0}
                                  className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 disabled:opacity-30 cursor-pointer text-xs font-bold"
                                  title="Consume 1 unit"
                                >
                                  <Minus size={10} />
                                </button>
                                
                                <span className={`px-2 py-0.5 font-mono font-black text-xs ${
                                  isBreached ? 'text-red-700' : 'text-emerald-800'
                                }`}>
                                  {item.balanceQty}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleQuickAdjustConsumedQty(item, 1)}
                                  className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer text-xs font-bold"
                                  title="Add 1 unit"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>

                            {/* Buffer Limit */}
                            <td className="py-2.5 px-3.5 text-center font-mono font-bold text-neutral-600">
                              {item.bufferLimit} units
                            </td>

                            {/* Buffer Status */}
                            <td className="py-2.5 px-3.5 text-center">
                              {isBreached ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-900 border border-red-300 text-[10px] font-bold uppercase rounded font-mono">
                                  <AlertOctagon size={10} className="text-red-600 animate-pulse" />
                                  <span>Low Stock (Req: {item.reorderQty})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase rounded font-mono">
                                  <CheckCircle2 size={10} className="text-emerald-600" />
                                  <span>Stock OK</span>
                                </span>
                              )}
                            </td>

                            {/* Purchase FMS Status */}
                            <td className="py-2.5 px-3.5 text-center">
                              {item.purchaseStatus === 'PENDING_PURCHASE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[9.5px] font-bold uppercase rounded font-mono">
                                  <Clock size={9} className="text-amber-700" />
                                  <span>PO Pending</span>
                                </span>
                              ) : item.purchaseStatus === 'DELIVERED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[9.5px] font-bold uppercase rounded font-mono">
                                  <Check size={9} className="text-emerald-700" />
                                  <span>Done (Delivered)</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400 font-mono">—</span>
                              )}
                            </td>

                            {/* Unit Cost */}
                            <td className="py-2.5 px-3.5 text-right font-mono text-neutral-600">
                              {item.unitCost > 0 ? `₹${Number(item.unitCost).toLocaleString('en-IN')}` : '—'}
                            </td>

                            {/* Balance Amount */}
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#006064]">
                              {item.balanceAmount > 0 ? `₹${Number(item.balanceAmount).toLocaleString('en-IN')}` : '—'}
                            </td>

                            {/* Remarks */}
                            <td className="py-2.5 px-3.5 text-neutral-600 max-w-xs truncate text-[11px]" title={item.remarks || ''}>
                              {item.remarks || <span className="text-neutral-300 italic">No notes</span>}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {isBreached && item.purchaseStatus !== 'DELIVERED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmPurchaseDelivery(item)}
                                    className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[9.5px] uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Mark that purchase executive has delivered this item"
                                  >
                                    <Check size={10} />
                                    <span>Delivered?</span>
                                  </button>
                                )}

                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openConsumedEditModal(item)}
                                    className="p-1 text-neutral-500 hover:text-[#006064] hover:bg-neutral-100 cursor-pointer"
                                    title="Edit Consumable"
                                  >
                                    <Edit2 size={12} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteConsumedItem(item.id, item.productName)}
                                    className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                    title="Delete Consumable"
                                  >
                                    <Trash2 size={12} />
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

      {/* ── MODAL 1: CREATE / EDIT FIXED ASSET ENTRY ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-xs font-sans flex items-start justify-center p-4 pt-12 sm:pt-16 pb-12">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="bg-white border border-neutral-300 w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-[#FAFAFA] shrink-0">
                <h3 className="text-sm font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Boxes size={16} className="text-[#006064]" />
                  <span>{editingItem ? 'Edit Fixed Asset Item' : 'Create Fixed Inventory Entry'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-neutral-500 hover:text-neutral-800 p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0 text-xs">
                  {/* 1. Date */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Calendar size={11} className="text-[#006064]" />
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

                  {/* 2. Centre Node */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Building2 size={11} className="text-[#006064]" />
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

                  {/* 3. Product / Asset Name */}
                  <div className="space-y-1 relative">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Package size={11} className="text-[#006064]" />
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

                    {showProductDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-neutral-100">
                        {fixedSuggestions
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
                        {customProductInput.trim() && !fixedSuggestions.includes(customProductInput.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormProductName(customProductInput.trim());
                              setShowProductDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold bg-teal-50 text-[#006064] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add New: "{customProductInput.trim()}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Quantities & Unit Valuation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                        Available / Stock Qty *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formAvailableQty}
                        onChange={(e) => handleAvailableQtyChange(e.target.value)}
                        required
                        className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                      />
                    </div>

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
                        onChange={(e) => setFormUnitCost(e.target.value.replace(/^0+(?=\d)/, ''))}
                        className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                      />
                    </div>
                  </div>

                  {/* 5. Balance Qty & Live Valuation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-neutral-50 border border-neutral-200">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase tracking-wider text-neutral-600 text-[9px]">
                        Balance Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formBalanceQty}
                        onChange={(e) => setFormBalanceQty(e.target.value.replace(/^0+(?=\d)/, ''))}
                        className="w-full bg-white border border-neutral-300 p-1.5 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div className="flex flex-col justify-center text-right">
                      <span className="text-neutral-500 font-bold uppercase text-[9px]">Calculated Balance Amount:</span>
                      <span className="font-mono font-black text-sm text-[#006064]">
                        ₹{liveCalculatedBalanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* 6. Remarks */}
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
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-neutral-200 bg-[#FAFAFA] shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-200 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#006064] text-white font-bold uppercase tracking-wider hover:bg-[#004d40] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                  >
                    {actionLoading && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingItem ? 'Update Asset' : 'Save Asset Entry'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 2: CREATE / EDIT CONSUMED ENTRY (WITH BUFFER LIMIT & AUTO 3X REORDER) ── */}
      <AnimatePresence>
        {showConsumedModal && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-xs font-sans flex items-start justify-center p-4 pt-12 sm:pt-16 pb-12">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="bg-white border border-neutral-300 w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-[#FAFAFA] shrink-0">
                <h3 className="text-sm font-bold text-[#1B1C1C] flex items-center gap-2">
                  <Layers size={16} className="text-[#006064]" />
                  <span>{editingConsumedItem ? 'Edit Consumable Item' : 'Create Consumed Inventory Entry'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowConsumedModal(false)}
                  className="text-neutral-500 hover:text-neutral-800 p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveConsumedItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0 text-xs">
                  {/* 1. Date */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Calendar size={11} className="text-[#006064]" />
                      <span>Date *</span>
                    </label>
                    <input
                      type="date"
                      value={consumedFormDate}
                      onChange={(e) => setConsumedFormDate(e.target.value)}
                      required
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>

                  {/* 2. Centre Node */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Building2 size={11} className="text-[#006064]" />
                      <span>Centre Node *</span>
                    </label>
                    <select
                      value={consumedFormLocationId}
                      onChange={(e) => setConsumedFormLocationId(e.target.value)}
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

                  {/* 3. Product / Consumable Name */}
                  <div className="space-y-1 relative">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Package size={11} className="text-[#006064]" />
                      <span>Consumable Item Name * (Select or Type New)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Sugar Packets, Tea Leaves, Coffee, Tissue, Cups..."
                        value={customConsumedInput}
                        onChange={(e) => {
                          setCustomConsumedInput(e.target.value);
                          setConsumedFormProductName(e.target.value);
                          setShowConsumedDropdown(true);
                        }}
                        onFocus={() => setShowConsumedDropdown(true)}
                        required
                        className="w-full bg-white border border-neutral-300 p-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    {showConsumedDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-300 shadow-xl max-h-48 overflow-y-auto z-50 divide-y divide-neutral-100">
                        {consumedSuggestions
                          .filter((p) => !customConsumedInput.trim() || p.toLowerCase().includes(customConsumedInput.toLowerCase()))
                          .map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setCustomConsumedInput(p);
                                setConsumedFormProductName(p);
                                setShowConsumedDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-teal-50 text-neutral-800 flex items-center justify-between cursor-pointer"
                            >
                              <span>{p}</span>
                              <span className="text-[10px] text-neutral-400 uppercase font-mono">Consumable</span>
                            </button>
                          ))}
                        {customConsumedInput.trim() && !consumedSuggestions.includes(customConsumedInput.trim()) && (
                          <button
                            type="button"
                            onClick={() => {
                              setConsumedFormProductName(customConsumedInput.trim());
                              setShowConsumedDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold bg-teal-50 text-[#006064] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add New: "{customConsumedInput.trim()}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Available Qty & Buffer Stock Limit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                        Available / Stock Qty *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={consumedFormAvailableQty}
                        onChange={(e) => handleConsumedAvailableQtyChange(e.target.value)}
                        required
                        className="w-full bg-white border border-neutral-300 p-2 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold uppercase tracking-wider text-red-700 text-[10px] flex items-center justify-between">
                        <span>Buffer Stock Limit *</span>
                        <span className="text-[9px] text-neutral-500 font-normal">Auto PO: 3x buffer</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 3"
                        value={consumedFormBufferLimit}
                        onChange={(e) => setConsumedFormBufferLimit(e.target.value.replace(/^0+(?=\d)/, ''))}
                        required
                        className="w-full bg-white border border-red-300 p-2 text-xs font-mono font-bold text-red-900 focus:outline-none focus:border-red-600"
                      />
                    </div>
                  </div>

                  {/* Buffer Reorder Notice */}
                  <div className="p-2.5 bg-teal-50/80 border border-teal-200 text-[11px] text-teal-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShoppingCart size={13} className="text-[#006064]" />
                      <span>Automated Replenishment Logic:</span>
                    </div>
                    <p className="text-[10.5px] leading-normal text-neutral-700">
                      When available stock reaches <strong>{consumedFormBufferLimit || 1} units</strong>, an email request for{' '}
                      <strong className="text-emerald-800">{(parseInt(consumedFormBufferLimit, 10) || 1) * 3} units (3x buffer)</strong> will automatically be dispatched to Purchase Executive (<em>ssinfrazone1@gmail.com</em>) &amp; logged to Google Sheets FMS.
                    </p>
                  </div>

                  {/* 5. Unit Valuation & Calculated Balance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-neutral-50 border border-neutral-200">
                    <div className="space-y-1">
                      <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[9.5px]">
                        Unit Valuation (₹ / unit)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0 (optional)"
                        value={consumedFormUnitCost}
                        onChange={(e) => setConsumedFormUnitCost(e.target.value.replace(/^0+(?=\d)/, ''))}
                        className="w-full bg-white border border-neutral-300 p-1.5 text-xs font-mono font-bold text-neutral-900 focus:outline-none focus:border-[#006064]"
                      />
                    </div>

                    <div className="flex flex-col justify-center text-right">
                      <span className="text-neutral-500 font-bold uppercase text-[9px]">Calculated Balance Amount:</span>
                      <span className="font-mono font-black text-sm text-[#006064]">
                        ₹{liveCalculatedConsumedBalanceAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* 6. Remarks */}
                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px]">
                      Remarks / Storage Placement / Brand Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Pantry Cupboard Shelf 1, 1kg Sealed Packets"
                      value={consumedFormRemarks}
                      onChange={(e) => setConsumedFormRemarks(e.target.value)}
                      className="w-full bg-white border border-neutral-300 p-2 text-xs font-medium text-neutral-900 focus:outline-none focus:border-[#006064]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-neutral-200 bg-[#FAFAFA] shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowConsumedModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-200 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#006064] text-white font-bold uppercase tracking-wider hover:bg-[#004d40] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                  >
                    {actionLoading && <Loader2 size={13} className="animate-spin" />}
                    <span>{editingConsumedItem ? 'Update Consumable' : 'Save Consumable Entry'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 3: INTER-CENTRE TRANSFER MODAL ── */}
      <AnimatePresence>
        {showTransferModal && transferSourceItem && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-xs font-sans flex items-start justify-center p-4 pt-12 sm:pt-16 pb-12">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="bg-white border border-neutral-300 w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-[#FAFAFA] shrink-0">
                <h3 className="text-sm font-bold text-[#1B1C1C] flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-[#006064]" />
                  <span>Transfer Stock Between Centres</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="text-neutral-500 hover:text-neutral-800 p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleExecuteTransfer} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0 text-xs">
                  <div className="p-2.5 bg-teal-50/60 border border-teal-200 space-y-1 text-xs">
                    <div className="font-extrabold text-[#006064] text-xs flex items-center gap-1.5">
                      <Package size={14} />
                      <span>{transferSourceItem.productName}</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-700 text-[11px]">
                      <span><strong>Source Centre:</strong> {transferSourceItem.locationName}</span>
                      <span className="px-2 py-0.5 bg-white border border-teal-300 font-mono font-bold text-teal-900 rounded">
                        Current Balance: {transferSourceItem.balanceQty} units
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Calendar size={11} className="text-[#006064]" />
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

                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Package size={11} className="text-[#006064]" />
                      <span>Product / Asset Name</span>
                    </label>
                    <input
                      type="text"
                      value={transferSourceItem.productName}
                      disabled
                      className="w-full bg-neutral-100 border border-neutral-300 p-2 text-xs font-bold text-neutral-800 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold uppercase tracking-wider text-neutral-700 text-[10px] flex items-center gap-1">
                      <Building2 size={11} className="text-[#006064]" />
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
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-neutral-200 bg-[#FAFAFA] shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 font-bold uppercase tracking-wider text-neutral-600 hover:bg-neutral-200 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-blue-700 text-white font-bold uppercase tracking-wider hover:bg-blue-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                  >
                    {actionLoading && <Loader2 size={13} className="animate-spin" />}
                    <span>Confirm &amp; Move Stock</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL 4: ITEM-SPECIFIC TRANSFER HISTORY MODAL ── */}
      <AnimatePresence>
        {selectedItemForHistory && (
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/75 backdrop-blur-xs font-sans flex items-start justify-center p-4 pt-12 sm:pt-16 pb-12">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              className="bg-white border border-neutral-300 w-full max-w-2xl shadow-2xl flex flex-col max-h-[82vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-[#FAFAFA] shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#1B1C1C] flex items-center gap-2">
                    <History size={16} className="text-[#006064]" />
                    <span>Transfer History: {selectedItemForHistory.productName}</span>
                  </h3>
                  <div className="text-[10.5px] text-neutral-500">
                    Centre: <strong>{selectedItemForHistory.locationName}</strong> &bull; Current Balance: <strong>{selectedItemForHistory.balanceQty} units</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItemForHistory(null)}
                  className="text-neutral-500 hover:text-neutral-800 p-1.5 rounded hover:bg-neutral-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 min-h-0 divide-y divide-neutral-100 pr-1">
                {selectedItemForHistory.transferLogs.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400 text-xs">
                    No transfer movements recorded for this item yet.
                  </div>
                ) : (
                  selectedItemForHistory.transferLogs.map((log) => {
                    const isOutward = log.fromLocationId === selectedItemForHistory.locationId;
                    return (
                      <div key={log.id} className="py-2.5 px-2 flex items-start justify-between gap-4 text-xs hover:bg-neutral-50 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isOutward ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 text-[9.5px] font-mono font-black rounded">
                                📤 OUTWARD SENT: -{log.quantity} units
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-300 text-[9.5px] font-mono font-black rounded">
                                📥 INWARD RECEIVED: +{log.quantity} units
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-neutral-700 text-[11px]">
                            <span className={`font-bold px-1.5 py-0.5 rounded border ${isOutward ? 'bg-red-50 text-red-800 border-red-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                              From: {log.fromLocationName}
                            </span>
                            <ArrowRightLeft size={11} className="text-neutral-400" />
                            <span className={`font-bold px-1.5 py-0.5 rounded border ${!isOutward ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200'}`}>
                              To: {log.toLocationName}
                            </span>
                          </div>

                          {log.remarks && (
                            <div className="text-[10.5px] text-neutral-600 bg-neutral-50 p-1.5 border border-neutral-200 italic mt-0.5 rounded">
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

              <div className="px-5 py-3 border-t border-neutral-200 bg-[#FAFAFA] flex items-center justify-between shrink-0">
                {selectedItemForHistory.balanceQty > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedItemForHistory;
                      setSelectedItemForHistory(null);
                      openTransferModal(item);
                    }}
                    className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowRightLeft size={12} />
                    <span>Transfer More Stock from {selectedItemForHistory.locationName}</span>
                  </button>
                ) : (
                  <span className="text-[10.5px] text-neutral-400 font-medium italic">
                    0 balance units available at {selectedItemForHistory.locationName}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItemForHistory(null)}
                  className="px-4 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold uppercase tracking-wider text-[11px] cursor-pointer"
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

