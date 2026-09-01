"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  Loader2,
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  User as UserIcon,
  MapPin,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Filter,
  MessageSquare,
  Search,
  Download,
  Check,
  Building2,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Sparkles,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { TicketChatModal } from '@/components/tickets/TicketChatModal';

interface TicketAttachment {
  id: number;
  url: string;
}

interface TicketComment {
  id: number;
  senderName: string;
  senderEmail: string | null;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  spaceType: string | null;
  location: string | null;
  locationId: number | null;
  locationRel: {
    id: number;
    name: string;
    assignedUsers?: { user: { id: number; name: string; email: string } }[];
  } | null;
  productTypeId: number | null;
  productType: { id: number; name: string; displayName: string } | null;
  category: string | null;
  subCategory: string | null;
  description: string;
  status: { id: number; name: string; displayName: string; color?: string };
  attachments: TicketAttachment[];
  comments?: TicketComment[];
  createdAt: string;
  updatedAt: string;
  hoursOpen: number;
  resolutionHours: number | null;
  isEscalated: boolean;
  escalatedHours: number;
  raisedBy: {
    name: string;
    email: string;
    phone: string;
    organization: string;
  };
  assignedCm: {
    id: number;
    name: string;
    email: string;
  } | null;
  solvedBy: {
    id: number;
    name: string;
    email: string;
  } | null;
  user: {
    name: string;
    email: string;
  } | null;
}

interface LocationOption {
  id: number;
  name: string;
}

export default function AdminTicketsPage() {
  const { isRole } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSlaFilter, setSelectedSlaFilter] = useState<'ALL' | 'OPEN' | 'ESCALATED' | 'RESOLVED'>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL');

  // Modals & Active Items
  const [activeChatTicket, setActiveChatTicket] = useState<SupportTicket | null>(null);
  const [resolutionModalTicket, setResolutionModalTicket] = useState<SupportTicket | null>(null);
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Fetch Tickets from API
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLocation !== 'ALL') params.set('locationId', selectedLocation);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      // Date filtering
      if (selectedDateRange !== 'ALL') {
        const now = new Date();
        if (selectedDateRange === 'TODAY') {
          params.set('dateFrom', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
        } else if (selectedDateRange === '7DAYS') {
          const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          params.set('dateFrom', past.toISOString());
        } else if (selectedDateRange === '30DAYS') {
          const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          params.set('dateFrom', past.toISOString());
        }
      }

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const json = await res.json();
      setTickets(json.data ?? []);
      if (json.meta?.locations) setLocations(json.meta.locations);
    } catch (error) {
      console.error('[Fetch Tickets Error]:', error);
      toast.error('Failed to load tickets registry');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLocation, selectedStatus, selectedCategory, searchQuery, selectedDateRange]);

  useEffect(() => {
    if (isRole('ADMIN')) fetchTickets();
  }, [isRole, fetchTickets]);

  // Handle Quick Status Change
  const handleStatusChange = async (ticket: SupportTicket, newStatus: string) => {
    if (newStatus === 'RESOLVED' || newStatus === 'CLOSED') {
      setResolutionModalTicket(ticket);
      return;
    }

    setUpdatingId(ticket.id);
    try {
      const res = await fetch(`/api/admin/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ticket.id, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Ticket #${ticket.ticketNumber} marked as ${newStatus}`);
      fetchTickets();
    } catch {
      toast.error('Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Submit Resolution with note
  const handleSubmitResolution = async () => {
    if (!resolutionModalTicket) return;
    setUpdatingId(resolutionModalTicket.id);
    try {
      const res = await fetch(`/api/admin/tickets`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: resolutionModalTicket.id,
          status: 'RESOLVED',
          resolutionNotes: resolutionNote.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Ticket #${resolutionModalTicket.ticketNumber} successfully marked Resolved!`);
      setResolutionModalTicket(null);
      setResolutionNote('');
      fetchTickets();
    } catch {
      toast.error('Failed to mark ticket as resolved');
    } finally {
      setUpdatingId(null);
    }
  };

  // Export Filtered Tickets to CSV
  const handleExportCsv = () => {
    if (filteredTickets.length === 0) {
      toast.error('No tickets to export');
      return;
    }

    const headers = [
      'Ticket Number',
      'Raised By',
      'Company / Organization',
      'Email',
      'Phone',
      'Centre / Location',
      'Centre CM',
      'Category',
      'Sub Category',
      'Status',
      'Hours Open',
      'SLA Status',
      'Solved By',
      'Created Date',
      'Description',
    ];

    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      `"${t.raisedBy.name.replace(/"/g, '""')}"`,
      `"${t.raisedBy.organization.replace(/"/g, '""')}"`,
      t.raisedBy.email,
      t.raisedBy.phone,
      `"${t.locationRel?.name || t.location || 'N/A'}"`,
      `"${t.assignedCm?.name || 'N/A'}"`,
      `"${t.category || 'General'}"`,
      `"${(t.subCategory || '').replace(/"/g, '""')}"`,
      t.status.displayName || t.status.name,
      t.hoursOpen,
      t.isEscalated ? 'ESCALATED (>48h SLA Breach)' : 'Normal (<48h)',
      `"${t.solvedBy?.name || 'In Progress'}"`,
      new Date(t.createdAt).toLocaleString('en-GB'),
      `"${t.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SSPACIA_Support_Tickets_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Ticket Report downloaded successfully');
  };

  // Distinct Categories list
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [tickets]);

  // Filter calculations
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status?.name?.toUpperCase())).length;
  const inProgressCount = tickets.filter((t) => t.status?.name?.toUpperCase() === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status?.name?.toUpperCase())).length;
  const escalatedTickets = tickets.filter((t) => t.isEscalated);
  const escalatedCount = escalatedTickets.length;

  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

  // Average resolution hours for resolved tickets
  const avgResolutionHours = useMemo(() => {
    const resolved = tickets.filter((t) => t.resolutionHours !== null);
    if (resolved.length === 0) return 0;
    const sum = resolved.reduce((acc, t) => acc + (t.resolutionHours || 0), 0);
    return Math.round(sum / resolved.length);
  }, [tickets]);

  // Filtered Tickets by SLA Tab View
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (selectedSlaFilter === 'ESCALATED') return t.isEscalated;
      if (selectedSlaFilter === 'OPEN') return !['RESOLVED', 'CLOSED'].includes(t.status?.name?.toUpperCase());
      if (selectedSlaFilter === 'RESOLVED') return ['RESOLVED', 'CLOSED'].includes(t.status?.name?.toUpperCase());
      return true;
    });
  }, [tickets, selectedSlaFilter]);

  if (!isRole('ADMIN')) return null;

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto p-4 sm:p-8">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[var(--outline-variant)]/40">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-[#006064] text-white flex items-center justify-center rounded-none shadow-md shrink-0">
            <TicketIcon size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#006064] mb-1">
              <Building2 size={14} /> Super Admin Central Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-[#1B1C1C] tracking-tight uppercase">
              Support & Issue Telemetry Hub
            </h1>
            <p className="text-[#616161] font-light text-xs mt-1">
              Centre-wise ticket tracking, reporter profiles, Community Manager resolution logs, and 48-hour SLA audits.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={filteredTickets.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
          >
            <Download size={14} /> Export Report ({filteredTickets.length})
          </button>

          <button
            onClick={fetchTickets}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh Registry
          </button>
        </div>
      </div>

      {/* ─── METRIC CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div
          onClick={() => setSelectedSlaFilter('ALL')}
          className={`p-5 border transition-all cursor-pointer bg-white shadow-xs ${selectedSlaFilter === 'ALL' ? 'border-[#006064] ring-2 ring-[#006064]/20' : 'border-neutral-200 hover:border-neutral-300'
            }`}
        >
          <div className="flex items-center justify-between text-[#616161]">
            <span className="text-[10px] font-black uppercase tracking-widest">Total Raised</span>
            <TicketIcon size={16} className="text-[#006064]" />
          </div>
          <p className="text-2xl font-black text-[#1B1C1C] mt-2 font-display">{totalCount}</p>
          <p className="text-[11px] text-neutral-500 mt-1 font-light">All logged support tickets</p>
        </div>

        {/* Active Open */}
        <div
          onClick={() => setSelectedSlaFilter('OPEN')}
          className={`p-5 border transition-all cursor-pointer bg-amber-50/30 shadow-xs ${selectedSlaFilter === 'OPEN' ? 'border-amber-600 ring-2 ring-amber-500/20' : 'border-amber-200 hover:border-amber-300'
            }`}
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-black uppercase tracking-widest">Active Open</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2 font-display">{openCount}</p>
          <p className="text-[11px] text-amber-700 mt-1 font-light">{inProgressCount} in progress</p>
        </div>

        {/* 48h Escalations */}
        <div
          onClick={() => setSelectedSlaFilter('ESCALATED')}
          className={`p-5 border transition-all cursor-pointer shadow-xs ${selectedSlaFilter === 'ESCALATED'
              ? 'bg-red-950 text-white border-red-600 ring-2 ring-red-500/40'
              : escalatedCount > 0
                ? 'bg-red-50 border-red-300 hover:border-red-400'
                : 'bg-white border-neutral-200 hover:border-neutral-300'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${escalatedCount > 0 && selectedSlaFilter !== 'ESCALATED' ? 'text-red-700' : ''
              }`}>
              <ShieldAlert size={15} className={escalatedCount > 0 ? 'text-red-500 animate-pulse' : 'text-neutral-400'} />
              48h+ SLA Escalations
            </span>
            <AlertTriangle size={16} className={escalatedCount > 0 ? 'text-red-500' : 'text-neutral-400'} />
          </div>
          <p className={`text-2xl font-black mt-2 font-display ${selectedSlaFilter === 'ESCALATED' ? 'text-white' : escalatedCount > 0 ? 'text-red-700' : 'text-neutral-800'
            }`}>
            {escalatedCount}
          </p>
          <p className={`text-[11px] mt-1 font-light ${selectedSlaFilter === 'ESCALATED' ? 'text-red-200' : escalatedCount > 0 ? 'text-red-600 font-bold' : 'text-neutral-500'
            }`}>
            {escalatedCount > 0 ? '⚠️ Exceeded 48h resolution SLA' : 'Zero overdue SLA breaches'}
          </p>
        </div>

        {/* Resolved */}
        <div
          onClick={() => setSelectedSlaFilter('RESOLVED')}
          className={`p-5 border transition-all cursor-pointer bg-emerald-50/30 shadow-xs ${selectedSlaFilter === 'RESOLVED' ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-emerald-200 hover:border-emerald-300'
            }`}
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-black uppercase tracking-widest">Resolved & Closed</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2 font-display">{resolvedCount}</p>
          <p className="text-[11px] text-emerald-700 mt-1 font-light">{resolutionRate}% Resolution Rate</p>
        </div>

        {/* Avg Resolution Speed */}
        <div className="p-5 border border-purple-200 bg-purple-50/30 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-[10px] font-black uppercase tracking-widest">Avg Resolution Time</span>
            <Sparkles size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2 font-display">
            {avgResolutionHours > 0 ? `${avgResolutionHours} hrs` : 'N/A'}
          </p>
          <p className="text-[11px] text-purple-700 mt-1 font-light">Average turnaround speed</p>
        </div>
      </div>

      {/* ─── COMPREHENSIVE FILTER TOOLBAR ─── */}
      <div className="bg-white border border-[var(--outline-variant)]/40 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search size={15} className="absolute left-3.5 top-3 text-[#616161]" />
            <input
              type="text"
              placeholder="Search by ticket #, client, company, phone, email, issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[var(--outline-variant)] pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#006064] font-medium"
            />
          </div>

          {/* Quick SLA Mode Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            <button
              type="button"
              onClick={() => setSelectedSlaFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${selectedSlaFilter === 'ALL' ? 'bg-[#006064] text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
            >
              All Tickets ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedSlaFilter('OPEN')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${selectedSlaFilter === 'OPEN' ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
            >
              Active Open ({openCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedSlaFilter('ESCALATED')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${selectedSlaFilter === 'ESCALATED' ? 'bg-red-600 text-white font-black' : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
            >
              <ShieldAlert size={13} /> 🚨 48h Escalations ({escalatedCount})
            </button>

            <button
              type="button"
              onClick={() => setSelectedSlaFilter('RESOLVED')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${selectedSlaFilter === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-neutral-100">
          {/* Centre / Location Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <MapPin size={11} /> Centre / Node
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Centres</option>
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Clock size={11} /> Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (Active)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Tag size={11} /> Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {distinctCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
              <Calendar size={11} /> Created Date
            </label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-neutral-300 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#006064] cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── TICKETS LIST / CARDS ─── */}
      {isLoading ? (
        <div className="bg-white border border-[var(--outline-variant)]/40 px-10 py-32 flex flex-col items-center justify-center text-center shadow-xs">
          <Loader2 className="h-9 w-9 text-[#006064] animate-spin mb-4" />
          <p className="text-xs font-bold text-[#1B1C1C] uppercase tracking-widest animate-pulse">
            Connecting to Support Database...
          </p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white border border-[var(--outline-variant)]/40 px-10 py-20 text-center shadow-xs space-y-3">
          <TicketIcon size={44} className="mx-auto text-neutral-300" />
          <p className="text-sm font-bold text-[#1B1C1C]">No Tickets Match Criteria</p>
          <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto">
            {selectedSlaFilter === 'ESCALATED'
              ? 'Great news! All support tickets are within the 48-hour SLA resolution window.'
              : 'No support requests match your currently selected filters. Try broadening your criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket, idx) => {
            const isEscalated = ticket.isEscalated;
            const statusUpper = (ticket.status.name || '').toUpperCase();
            const isResolved = statusUpper === 'RESOLVED' || statusUpper === 'CLOSED';

            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`bg-white border transition-all relative overflow-hidden shadow-xs hover:shadow-md ${isEscalated
                    ? 'border-red-500 ring-1 ring-red-400/30'
                    : isResolved
                      ? 'border-emerald-300'
                      : 'border-neutral-200'
                  }`}
              >
                {/* Left Colored Accent Stripe */}
                <div
                  className={`absolute top-0 left-0 w-2 h-full ${isEscalated ? 'bg-red-600' : isResolved ? 'bg-emerald-500' : 'bg-[#006064]'
                    }`}
                />

                <div className="p-5 sm:p-6 pl-6 sm:pl-7">
                  {/* Overdue Escalation Banner */}
                  {isEscalated && (
                    <div className="bg-red-950 text-white px-4 py-2 mb-4 border border-red-700 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-200">
                        <ShieldAlert size={16} className="text-red-400 animate-pulse shrink-0" />
                        <span>🚨 ESCALATED TO SUPER ADMIN — Unresolved for {ticket.hoursOpen}h (exceeded 48h SLA)</span>
                      </div>
                      <span className="bg-red-600 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 uppercase">
                        +{ticket.escalatedHours}h Overdue
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* LEFT / MAIN TICKET INFO */}
                    <div className="flex-1 space-y-4">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-black text-[#1B1C1C] bg-neutral-100 px-3 py-1 font-mono tracking-wider border border-neutral-300">
                          #{ticket.ticketNumber}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider border ${isResolved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isEscalated
                                ? 'bg-red-50 text-red-800 border-red-300 font-black'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${isResolved ? 'bg-emerald-600' : isEscalated ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
                              }`}
                          />
                          {ticket.status.displayName || ticket.status.name}
                        </span>

                        {/* Category & Subcategory */}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#006064] bg-[#006064]/5 px-2.5 py-1 border border-[#006064]/20">
                          {ticket.category || 'General'}
                        </span>
                        {ticket.subCategory && (
                          <span className="text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 truncate max-w-xs">
                            {ticket.subCategory}
                          </span>
                        )}

                        {/* Centre & Handling CM Tag */}
                        <span className="text-[10px] font-bold text-neutral-700 bg-neutral-50 px-2.5 py-1 border border-neutral-200 flex items-center gap-1.5 ml-auto">
                          <MapPin size={12} className="text-[#006064]" />
                          <span>{ticket.locationRel?.name || ticket.location || 'All Nodes'}</span>
                          {ticket.assignedCm && (
                            <span className="text-neutral-400 font-normal">
                              (CM: <strong className="text-neutral-700">{ticket.assignedCm.name}</strong>)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Title / Asset */}
                      <div>
                        <h3 className="text-base font-bold text-[#1B1C1C]">
                          {ticket.productType?.displayName || ticket.spaceType || 'Workspace Unit'} —{' '}
                          <span className="text-neutral-600 font-normal">{ticket.raisedBy.name}</span>
                          {ticket.raisedBy.organization && ticket.raisedBy.organization !== 'Individual Member' && (
                            <span className="text-neutral-500 font-normal"> ({ticket.raisedBy.organization})</span>
                          )}
                        </h3>
                      </div>

                      {/* Description Box */}
                      <div className="bg-neutral-50 p-3.5 border border-neutral-200 text-xs font-normal text-neutral-800 leading-relaxed whitespace-pre-wrap">
                        {ticket.description}
                      </div>

                      {/* Attachments (if any) */}
                      {ticket.attachments && ticket.attachments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Attachments ({ticket.attachments.length}):
                          </span>
                          {ticket.attachments.map((att, i) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-300 text-[10px] font-bold text-neutral-700 hover:bg-[#006064] hover:text-white transition-all shadow-xs"
                            >
                              <ExternalLink size={11} /> File #{i + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Telemetry Footer */}
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-neutral-400" />
                          <span>Raised: {new Date(ticket.createdAt).toLocaleString('en-GB')}</span>
                          <span className="text-neutral-400 font-mono">({ticket.hoursOpen}h ago)</span>
                        </div>

                        {ticket.solvedBy && (
                          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 font-bold">
                            <CheckCircle2 size={13} />
                            <span>Solved By: {ticket.solvedBy.name}</span>
                            {ticket.resolutionHours !== null && (
                              <span className="font-normal text-emerald-600">({ticket.resolutionHours}h turnaround)</span>
                            )}
                          </div>
                        )}

                        {!ticket.solvedBy && ticket.assignedCm && (
                          <div className="flex items-center gap-1.5 text-neutral-600 bg-neutral-100 px-2.5 py-1 font-medium">
                            <UserCheck size={13} className="text-[#006064]" />
                            <span>Assigned Centre Handler: <strong>{ticket.assignedCm.name}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT / ACTIONS & REPORTER PANEL */}
                    <div className="lg:w-80 space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-200 lg:pl-6 pt-4 lg:pt-0">
                      {/* Reporter Profile */}
                      <div className="bg-neutral-50/80 p-3.5 border border-neutral-200 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-neutral-500 pb-1 border-b border-neutral-200 flex items-center justify-between">
                          <span>Raised By Profile</span>
                          <span className="text-[9px] text-[#006064] font-bold">Client Contact</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                            <UserIcon size={13} className="text-[#006064]" />
                            <span>{ticket.raisedBy.name}</span>
                          </div>
                          {ticket.raisedBy.organization && (
                            <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                              <Building2 size={12} className="text-neutral-400" />
                              <span>{ticket.raisedBy.organization}</span>
                            </div>
                          )}
                          {ticket.raisedBy.email && (
                            <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                              <Mail size={12} className="text-neutral-400" />
                              <a href={`mailto:${ticket.raisedBy.email}`} className="hover:underline hover:text-[#006064] truncate">
                                {ticket.raisedBy.email}
                              </a>
                            </div>
                          )}
                          {ticket.raisedBy.phone && (
                            <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                              <Phone size={12} className="text-neutral-400" />
                              <a href={`tel:${ticket.raisedBy.phone}`} className="hover:underline hover:text-[#006064]">
                                {ticket.raisedBy.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Override Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                          <CheckCircle size={12} /> Status Override
                        </label>
                        <select
                          value={statusUpper}
                          disabled={updatingId === ticket.id}
                          onChange={(e) => handleStatusChange(ticket, e.target.value)}
                          className={`w-full px-3 py-1.5 border text-xs font-bold uppercase tracking-wider focus:outline-none cursor-pointer ${isEscalated
                              ? 'bg-red-50 border-red-400 text-red-900'
                              : isResolved
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                : 'bg-white border-neutral-300 text-neutral-900 focus:border-[#006064]'
                            }`}
                        >
                          <option value="OPEN">Open (Active)</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved (Mark Solved)</option>
                          <option value="CLOSED">Closed (Final)</option>
                        </select>
                      </div>

                      {/* Chat Button */}
                      <button
                        onClick={() => setActiveChatTicket(ticket)}
                        className="w-full py-2.5 px-3 bg-[#006064] hover:bg-[#004D40] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        <span>Chat With Client ({ticket.comments?.length || 0})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── LIVE TICKET CHAT MODAL ─── */}
      {activeChatTicket && (
        <TicketChatModal
          isOpen={!!activeChatTicket}
          onClose={() => {
            setActiveChatTicket(null);
            fetchTickets();
          }}
          ticketId={activeChatTicket.id}
          ticketNumber={activeChatTicket.ticketNumber}
          ticketTitle={`${activeChatTicket.productType?.displayName || activeChatTicket.spaceType || 'Workspace'} - ${activeChatTicket.name}`}
          statusName={activeChatTicket.status.displayName || activeChatTicket.status.name}
          userRole="CM"
        />
      )}

      {/* ─── RESOLUTION NOTE MODAL ─── */}
      {resolutionModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 size={20} />
                <h3 className="font-bold text-base">Mark Ticket #{resolutionModalTicket.ticketNumber} Resolved</h3>
              </div>
              <button
                onClick={() => setResolutionModalTicket(null)}
                className="text-neutral-400 hover:text-black font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <p>
                You are marking ticket <strong>#{resolutionModalTicket.ticketNumber}</strong> raised by{' '}
                <strong>{resolutionModalTicket.raisedBy.name}</strong> at{' '}
                <strong>{resolutionModalTicket.locationRel?.name || 'Centre'}</strong> as <strong>RESOLVED</strong>.
              </p>
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700">
                  Resolution Notes / Action Taken (Optional)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Handled on-site by centre cleaning team. Issue resolved."
                  className="w-full bg-[#F8F9FA] border border-neutral-300 p-2.5 text-xs focus:outline-none focus:border-[#006064]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
              <button
                onClick={() => setResolutionModalTicket(null)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResolution}
                disabled={updatingId !== null}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
              >
                {updatingId !== null ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Confirm & Mark Solved
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
