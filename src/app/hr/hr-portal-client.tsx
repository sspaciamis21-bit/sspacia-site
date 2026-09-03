'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  Users,
  Plus,
  Edit3,
  Trash2,
  Search,
  Filter,
  Download,
  ExternalLink,
  LogOut,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  X,
  Loader2,
  Eye,
  RefreshCw,
  Sparkles,
  MapPin,
  Save,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface JobPosition {
  id: number;
  title: string;
  openings: string;
  gender: string;
  description: string;
  location: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: {
    applications: number;
  };
}

interface CareerApplication {
  id: number;
  jobPositionId: number | null;
  appliedPosition: string;
  fullName: string;
  email?: string | null;
  mobileNo: string;
  age: number;
  gender?: string | null;
  qualification: string;
  experience: string;
  address: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  jobPosition?: {
    id: number;
    title: string;
    openings: string;
    gender: string;
  } | null;
}


const APPLICATION_STATUSES = [
  { id: 'ALL', label: 'All Applications', color: 'bg-slate-100 text-slate-700' },
  { id: 'APPLIED', label: 'New / Applied', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'SHORTLISTED', label: 'Shortlisted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'HIRED', label: 'Hired', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'REJECTED', label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export function HrPortalClient() {
  const { user, isLoading: authLoading, logout, isRole } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'positions' | 'applications'>('positions');

  // Positions Data
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionSearch, setPositionSearch] = useState('');

  // Applications Data
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [appPositionFilter, setAppPositionFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosition | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);

  // Position Form
  const [positionForm, setPositionForm] = useState({
    title: '',
    openings: '1 Opening',
    gender: 'Male / Female',
    description: '',
    location: 'CG Road, Ahmedabad',
    isActive: true,
    sortOrder: 0,
  });
  const [savingPosition, setSavingPosition] = useState(false);

  // Candidate Details Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<CareerApplication | null>(null);
  const [candidateNotes, setCandidateNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!isRole('HR') && !isRole('ADMIN') && !isRole('SUPER_ADMIN')) {
        toast.error('Unauthorized access. HR credentials required.');
        router.push('/');
      }
    }
  }, [user, authLoading, router, isRole]);

  // Load Positions
  const fetchPositions = async () => {
    setPositionsLoading(true);
    try {
      const res = await fetch('/api/careers/positions?all=true');
      const data = await res.json();
      if (res.ok) {
        setPositions(data.positions || []);
      } else {
        toast.error(data.error || 'Failed to load positions');
      }
    } catch {
      toast.error('Network error loading positions');
    } finally {
      setPositionsLoading(false);
    }
  };

  // Load Applications
  const fetchApplications = async () => {
    setApplicationsLoading(true);
    try {
      const res = await fetch('/api/careers/applications');
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications || []);
      } else {
        toast.error(data.error || 'Failed to load applications');
      }
    } catch {
      toast.error('Network error loading applications');
    } finally {
      setApplicationsLoading(false);
    }
  };

  useEffect(() => {
    if (user && (isRole('HR') || isRole('ADMIN') || isRole('SUPER_ADMIN'))) {
      fetchPositions();
      fetchApplications();
    }
  }, [user]);

  // Handle Add Position
  const handleOpenAdd = () => {
    setPositionForm({
      title: '',
      openings: '1 Opening',
      gender: 'Male / Female',
      description: '',
      location: 'CG Road, Ahmedabad',
      isActive: true,
      sortOrder: positions.length + 1,
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.title.trim()) {
      toast.error('Position title is required');
      return;
    }
    if (!positionForm.description.trim()) {
      toast.error('Position description is required');
      return;
    }

    setSavingPosition(true);
    try {
      const res = await fetch('/api/careers/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create position');

      toast.success('Position created successfully!');
      setIsAddModalOpen(false);
      fetchPositions();
    } catch (err: any) {
      toast.error(err.message || 'Error creating position');
    } finally {
      setSavingPosition(false);
    }
  };

  // Handle Edit Position
  const handleOpenEdit = (job: JobPosition) => {
    setEditingJob(job);
    setPositionForm({
      title: job.title,
      openings: job.openings,
      gender: job.gender,
      description: job.description,
      location: job.location,
      isActive: job.isActive,
      sortOrder: job.sortOrder,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    setSavingPosition(true);
    try {
      const res = await fetch(`/api/careers/positions/${editingJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(positionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update position');

      toast.success('Position updated successfully!');
      setIsEditModalOpen(false);
      setEditingJob(null);
      fetchPositions();
    } catch (err: any) {
      toast.error(err.message || 'Error updating position');
    } finally {
      setSavingPosition(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (job: JobPosition) => {
    try {
      const res = await fetch(`/api/careers/positions/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !job.isActive }),
      });
      if (res.ok) {
        toast.success(`Position ${!job.isActive ? 'activated' : 'deactivated'}`);
        fetchPositions();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Handle Delete Position
  const handleConfirmDelete = async () => {
    if (!deletingJobId) return;
    try {
      const res = await fetch(`/api/careers/positions/${deletingJobId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete position');

      toast.success('Position deleted successfully');
      setIsDeleteModalOpen(false);
      setDeletingJobId(null);
      fetchPositions();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting position');
    }
  };

  // Handle Update Candidate Status
  const handleUpdateAppStatus = async (appId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/careers/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      toast.success(`Candidate marked as ${newStatus.replace('_', ' ')}`);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      );
      if (selectedCandidate && selectedCandidate.id === appId) {
        setSelectedCandidate((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating status');
    }
  };

  // Save Candidate Notes
  const handleSaveCandidateNotes = async () => {
    if (!selectedCandidate) return;
    setSavingNotes(true);
    try {
      const res = await fetch('/api/careers/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCandidate.id, notes: candidateNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes');

      toast.success('HR notes updated');
      setApplications((prev) =>
        prev.map((a) => (a.id === selectedCandidate.id ? { ...a, notes: candidateNotes } : a))
      );
      setSelectedCandidate((prev) => (prev ? { ...prev, notes: candidateNotes } : null));
    } catch (err: any) {
      toast.error(err.message || 'Error saving notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Export Applications to CSV
  const handleExportCsv = () => {
    if (applications.length === 0) {
      toast.error('No applications to export');
      return;
    }

    const headers = [
      'Date & Time',
      'Candidate Name',
      'Email',
      'Mobile No',
      'Age',
      'Gender',
      'Educational Qualification',
      'Experience',
      'Applied Position',
      'Address',
      'Status',
      'HR Notes',
    ];

    const rows = applications.map((a) => [
      `"${new Date(a.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}"`,
      `"${a.fullName.replace(/"/g, '""')}"`,
      `"${a.email || 'N/A'}"`,
      `"${a.mobileNo}"`,
      a.age,
      `"${a.gender || 'N/A'}"`,
      `"${a.qualification.replace(/"/g, '""')}"`,
      `"${a.experience.replace(/"/g, '""')}"`,
      `"${a.appliedPosition.replace(/"/g, '""')}"`,
      `"${(a.address || 'N/A').replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);


    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SSPACIA_Job_Applications_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Applications CSV exported successfully');
  };

  // Filtered lists
  const filteredPositions = useMemo(() => {
    if (!positionSearch.trim()) return positions;
    const q = positionSearch.toLowerCase();
    return positions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.gender.toLowerCase().includes(q)
    );
  }, [positions, positionSearch]);

  const filteredApplications = useMemo(() => {
    let list = applications;

    if (appStatusFilter !== 'ALL') {
      list = list.filter((a) => a.status === appStatusFilter);
    }

    if (appPositionFilter !== 'ALL') {
      list = list.filter((a) => a.appliedPosition === appPositionFilter);
    }

    if (appSearch.trim()) {
      const q = appSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.mobileNo.includes(q) ||
          a.appliedPosition.toLowerCase().includes(q) ||
          a.qualification.toLowerCase().includes(q) ||
          a.experience.toLowerCase().includes(q)
      );
    }

    return list;
  }, [applications, appStatusFilter, appPositionFilter, appSearch]);

  // Status Metrics
  const metrics = useMemo(() => {
    const totalApps = applications.length;
    const shortlisted = applications.filter((a) => a.status === 'SHORTLISTED').length;
    const interview = applications.filter((a) => a.status === 'INTERVIEW_SCHEDULED').length;
    const hired = applications.filter((a) => a.status === 'HIRED').length;
    const activePositions = positions.filter((p) => p.isActive).length;
    return { totalApps, shortlisted, interview, hired, activePositions };
  }, [applications, positions]);

  if (authLoading || (!user && (isRole('HR') || isRole('ADMIN') || isRole('SUPER_ADMIN')))) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#006064] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      {/* ── TOP HEADER BAR ─────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-black text-xl text-[#006064] tracking-tight">SSPACIA</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#006064]/10 text-[#006064] px-2 py-0.5 rounded-md">
                HR Portal
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* View Live Careers Page */}
            <Link
              href="/careers"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#006064] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <span>Live Careers Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* HR Profile / Logout */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-800">{user?.name || 'Human Resource'}</div>
                <div className="text-[10px] text-slate-500 font-mono">hr.ssinfrazone@gmail.com</div>
              </div>
              <button
                onClick={() => logout()}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Alert with Contact Info */}
        <div className="bg-gradient-to-r from-[#004D40] to-[#006064] text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Career & Recruitment Management</span>
              <span className="text-xs font-bold bg-white/20 text-[#80DEEA] px-2.5 py-0.5 rounded-full">
                HR Master
              </span>
            </h1>
            <p className="text-xs text-[#E0F7FA]">
              Manage job openings for CG Road center and review incoming public candidate applications.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs bg-black/20 px-3.5 py-2 rounded-xl border border-white/10 shrink-0">
            <span className="flex items-center gap-1.5 text-white/90">
              <Mail className="w-3.5 h-3.5 text-[#80DEEA]" /> hr.ssinfrazone@gmail.com
            </span>
            <span className="text-white/40">•</span>
            <span className="flex items-center gap-1.5 text-white/90">
              <Phone className="w-3.5 h-3.5 text-[#80DEEA]" /> +91 92130 05428
            </span>
          </div>
        </div>

        {/* ── KPI METRIC CARDS ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-slate-900">{metrics.activePositions}</div>
              <div className="text-[11px] font-semibold text-slate-500">Active Openings</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-slate-900">{metrics.totalApps}</div>
              <div className="text-[11px] font-semibold text-slate-500">Total Applicants</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-slate-900">{metrics.interview}</div>
              <div className="text-[11px] font-semibold text-slate-500">Interviews Setup</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black text-slate-900">{metrics.hired}</div>
              <div className="text-[11px] font-semibold text-slate-500">Hired Candidates</div>
            </div>
          </div>
        </div>

        {/* ── TAB SELECTOR & ACTIONS ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'positions'
                  ? 'bg-white text-[#006064] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Job Positions ({positions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'applications'
                  ? 'bg-white text-[#006064] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Candidate Applications ({applications.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {activeTab === 'positions' ? (
              <button
                onClick={handleOpenAdd}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#006064] text-white text-xs font-bold rounded-lg hover:bg-[#004D40] active:scale-98 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Position</span>
              </button>
            ) : (
              <button
                onClick={handleExportCsv}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-all shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            )}

            <button
              onClick={() => {
                fetchPositions();
                fetchApplications();
                toast.success('Refreshed data');
              }}
              className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── TAB 1: POSITIONS MANAGEMENT ────────────────────────── */}
        {activeTab === 'positions' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search positions by title, description or gender..."
                  value={positionSearch}
                  onChange={(e) => setPositionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#006064]"
                />
              </div>
            </div>

            {/* Positions Table / Cards */}
            {positionsLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="w-6 h-6 text-[#006064] animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-medium">Loading positions...</span>
              </div>
            ) : filteredPositions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No positions found</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-4">Position Title</th>
                        <th className="py-3 px-4">Openings</th>
                        <th className="py-3 px-4">Gender</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-center">Applications</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredPositions.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{job.title}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{job.location}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {job.openings}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {job.gender}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={job.description}>
                            {job.description}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => {
                                setAppPositionFilter(job.title);
                                setActiveTab('applications');
                              }}
                              className="inline-flex items-center gap-1 font-bold text-[#006064] bg-[#E0F2F1] hover:bg-[#B2DFDB] px-2.5 py-1 rounded-full text-xs transition-colors"
                            >
                              <Users className="w-3 h-3" />
                              <span>{job._count?.applications || 0}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleActive(job)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                job.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {job.isActive ? 'Active' : 'Closed'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(job)}
                                className="p-1.5 text-slate-600 hover:text-[#006064] hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit Position"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingJobId(job.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Position"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CANDIDATE APPLICATIONS LEDGER ─────────────────── */}
        {activeTab === 'applications' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search applicant name, mobile, qualification, position..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#006064]"
                />
              </div>

              {/* Position Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={appPositionFilter}
                  onChange={(e) => setAppPositionFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064]"
                >
                  <option value="ALL">All Positions</option>
                  {Array.from(new Set(positions.map((p) => p.title))).map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={appStatusFilter}
                  onChange={(e) => setAppStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064]"
                >
                  {APPLICATION_STATUSES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Applications Table */}
            {applicationsLoading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 className="w-6 h-6 text-[#006064] animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-500 font-medium">Loading applications...</span>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No applications matched your filters</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-3.5">Date & Time</th>
                        <th className="py-3 px-3.5">Candidate Name</th>
                        <th className="py-3 px-3.5">Mobile No</th>
                        <th className="py-3 px-3.5 text-center">Age</th>
                        <th className="py-3 px-3.5">Qualification</th>
                        <th className="py-3 px-3.5">Experience</th>
                        <th className="py-3 px-3.5">Applied Position</th>
                        <th className="py-3 px-3.5 text-center">Status</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredApplications.map((app) => {
                        const statusObj =
                          APPLICATION_STATUSES.find((s) => s.id === app.status) || APPLICATION_STATUSES[1];

                        return (
                          <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                              {new Date(app.createdAt).toLocaleString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>

                            <td className="py-3 px-3.5 font-bold text-slate-900">
                              {app.fullName}
                            </td>

                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <a
                                href={`tel:${app.mobileNo}`}
                                className="font-mono font-bold text-[#006064] hover:underline"
                              >
                                {app.mobileNo}
                              </a>
                            </td>

                            <td className="py-3 px-3.5 text-center font-semibold text-slate-700">
                              {app.age}
                            </td>

                            <td className="py-3 px-3.5 max-w-[140px] truncate text-slate-800" title={app.qualification}>
                              {app.qualification}
                            </td>

                            <td className="py-3 px-3.5 max-w-[130px] truncate text-slate-800" title={app.experience}>
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                                {app.experience}
                              </span>
                            </td>

                            <td className="py-3 px-3.5 font-bold text-slate-900">
                              {app.appliedPosition}
                            </td>

                            <td className="py-3 px-3.5 text-center">
                              <select
                                value={app.status}
                                onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md border focus:outline-hidden cursor-pointer ${statusObj.color}`}
                              >
                                {APPLICATION_STATUSES.filter((s) => s.id !== 'ALL').map((st) => (
                                  <option key={st.id} value={st.id}>
                                    {st.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCandidate(app);
                                  setCandidateNotes(app.notes || '');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-[#006064] text-slate-700 hover:text-white rounded-md text-xs font-bold transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── ADD / EDIT POSITION MODAL ──────────────────────────── */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="bg-[#006064] text-white px-6 py-4 flex items-center justify-between">
                <h3 className="text-base font-bold">
                  {isEditModalOpen ? 'Edit Job Opening' : 'Add New Job Opening'}
                </h3>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={isEditModalOpen ? handleSaveEdit : handleSaveAdd} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Position Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Front Desk Executive"
                    value={positionForm.title}
                    onChange={(e) => setPositionForm({ ...positionForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Openings <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2 Openings or 1 Opening"
                      value={positionForm.openings}
                      onChange={(e) => setPositionForm({ ...positionForm, openings: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Gender Requirement <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={positionForm.gender}
                      onChange={(e) => setPositionForm({ ...positionForm, gender: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white"
                    >
                      <option value="Male / Female">Male / Female</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Job Description / Key Responsibilities <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Guest & visitor management, front office reception..."
                    value={positionForm.description}
                    onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={positionForm.location}
                      onChange={(e) => setPositionForm({ ...positionForm, location: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Display Sort Order</label>
                    <input
                      type="number"
                      value={positionForm.sortOrder}
                      onChange={(e) => setPositionForm({ ...positionForm, sortOrder: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActivePos"
                    checked={positionForm.isActive}
                    onChange={(e) => setPositionForm({ ...positionForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-[#006064] rounded-sm focus:ring-[#006064]"
                  />
                  <label htmlFor="isActivePos" className="font-bold text-slate-700 cursor-pointer">
                    Active & visible on public careers page
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPosition}
                    className="px-5 py-2 bg-[#006064] hover:bg-[#004D40] text-white font-bold rounded-lg transition-colors shadow-xs"
                  >
                    {savingPosition ? 'Saving...' : isEditModalOpen ? 'Save Changes' : 'Create Position'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE POSITION MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Delete this Job Position?</h4>
              <p className="text-xs text-slate-500">
                This will permanently remove the position from the public careers page. Associated candidate applications will be preserved.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CANDIDATE DETAILS DRAWER / MODAL ───────────────────── */}
      <AnimatePresence>
        {selectedCandidate && (
          <div
            onClick={() => setSelectedCandidate(null)}
            className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/75 backdrop-blur-md overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col justify-between overflow-y-auto z-10 relative"
            >
              {/* Sticky Top Header */}
              <div>
                <div className="bg-[#006064] text-white p-5 sticky top-0 z-20 shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#80DEEA]">
                      CANDIDATE DOSSIER
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{selectedCandidate.fullName}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Applied Position & Status */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">Position Applied</span>
                      <span className="font-bold text-[#006064] text-sm">{selectedCandidate.appliedPosition}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500">Application Status</span>
                      <select
                        value={selectedCandidate.status}
                        onChange={(e) => handleUpdateAppStatus(selectedCandidate.id, e.target.value)}
                        className="font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 cursor-pointer focus:ring-2 focus:ring-[#006064]"
                      >
                        {APPLICATION_STATUSES.filter((s) => s.id !== 'ALL').map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Contact Information
                    </div>
                    {selectedCandidate.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Email:</span>
                        <a
                          href={`mailto:${selectedCandidate.email}`}
                          className="font-semibold text-[#006064] hover:underline"
                        >
                          {selectedCandidate.email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mobile No:</span>
                      <a
                        href={`tel:${selectedCandidate.mobileNo}`}
                        className="font-mono font-bold text-[#006064] hover:underline"
                      >
                        +91 {selectedCandidate.mobileNo}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Age / Gender:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedCandidate.age} Years &bull; {selectedCandidate.gender || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Applied On:</span>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {new Date(selectedCandidate.createdAt).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Qualifications & Experience */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Qualifications & Background
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Education:</span>
                      <span className="font-semibold text-slate-900">{selectedCandidate.qualification}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Experience:</span>
                      <span className="font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md inline-block">
                        {selectedCandidate.experience}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-0.5">Address:</span>
                      <span className="text-slate-800">{selectedCandidate.address || 'Not Provided'}</span>
                    </div>
                  </div>

                  {/* HR Notes */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      HR Interview Notes
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Add interview feedback, expected salary, availability date..."
                      value={candidateNotes}
                      onChange={(e) => setCandidateNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#006064] focus:bg-white resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCandidateNotes}
                      disabled={savingNotes}
                      className="w-full py-2 bg-[#006064] text-white text-xs font-bold rounded-lg hover:bg-[#004D40] transition-colors cursor-pointer"
                    >
                      {savingNotes ? 'Saving Notes...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2 sticky bottom-0 z-20">
                <a
                  href={`tel:${selectedCandidate.mobileNo}`}
                  className="flex-1 py-2.5 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>

                <a
                  href={`https://wa.me/91${selectedCandidate.mobileNo.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                    selectedCandidate.fullName
                  )},%20this%20is%20SSPACIA%20HR%20regarding%20your%20application%20for%20${encodeURIComponent(
                    selectedCandidate.appliedPosition
                  )}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
