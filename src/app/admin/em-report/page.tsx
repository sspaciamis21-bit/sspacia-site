'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  Mail,
  RefreshCcw,
  Calendar,
  Building2,
  AlertCircle,
  Loader2,
  Send,
  ArrowLeft,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { FullEmScorecard, formatScorecardPct } from '@/lib/em-scorecard-engine';

const CENTRES = ['All Centres', 'Mercado', 'Agarwal Complex', 'Premier House'];
const PERIODS = [
  { value: 'weekly', label: 'Weekly (Closed: 21 Sept – 27 Sept 2026)' },
  { value: 'weekly_current', label: 'Weekly (Current: 28 Sept – 04 Oct 2026)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Date Range' },
];

export default function EmReportAdminPage() {
  const router = useRouter();
  const [centre, setCentre] = useState('All Centres');
  const [period, setPeriod] = useState('weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [scorecard, setScorecard] = useState<FullEmScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const fetchScorecard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      params.set('centre', centre);
      params.set('period', period);
      if (period === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const res = await fetch(`/api/admin/reports/em-scorecard?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setScorecard(data.data);
      } else {
        toast.error(data.error || 'Failed to load MIS scorecard');
      }
    } catch (err: any) {
      console.error('Failed to load scorecard:', err);
      toast.error('Network error loading scorecard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [centre, period, startDate, endDate]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  // Excel Download Handler
  const handleDownloadExcel = async () => {
    try {
      setDownloadingExcel(true);
      const params = new URLSearchParams();
      params.set('centre', centre);
      params.set('period', period);
      params.set('format', 'excel');
      if (period === 'custom' && startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      }

      const url = `/api/admin/reports/em-scorecard?${params.toString()}`;
      const link = document.createElement('a');
      link.href = url;
      link.download = `SSPACIA_EM_Scorecard_${centre.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('MIS Summary Sheet Excel (.xlsx) downloaded');
    } catch (err) {
      toast.error('Failed to download Excel file');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Send Email Handler
  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      const res = await fetch('/api/admin/reports/em-scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_email',
          centre,
          period,
          startDate: period === 'custom' ? startDate : undefined,
          endDate: period === 'custom' ? endDate : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`EM Reports for Mercado | AG | PH dispatched from mis.sspacia01@gmail.com with attached PDFs!`);
        setEmailModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to dispatch email');
      }
    } catch (err) {
      toast.error('Failed to send report email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-16">
      {/* Top Navigation & Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 shadow-2xs transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
          <span>Sender: <strong className="text-slate-800">mis.sspacia01@gmail.com</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">Auto-Dispatch Active</span>
        </div>
      </div>

      {/* Main Header Card */}
      <FadeUp>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 border border-neutral-300 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#0c1933] text-[#d4af37]">
                Executive Meeting (EM)
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                Weekly CM Scorecard
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#1B1C1C] tracking-tight uppercase">
              Operations MIS Scorecard
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Consolidated operational compliance scorecard integrating Community Management (Invoices &amp; Suspense) and Housekeeping checklist audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchScorecard(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            {/* Download Excel Button */}
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel || loading || !scorecard}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              title="Download exact MIS Summary Sheet as Excel (.xlsx)"
            >
              {downloadingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              Download Excel
            </button>

            {/* Dispatch Email Button */}
            <button
              onClick={() => setEmailModalOpen(true)}
              disabled={sendingEmail || loading || !scorecard}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Mail size={13} />
              Dispatch EM Email
            </button>
          </div>
        </div>
      </FadeUp>

      {/* Filter Toolbar */}
      <FadeUp delay={0.05}>
        <div className="bg-white p-4 border border-neutral-300 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Center Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                <Building2 size={14} /> Center:
              </span>
              <div className="flex bg-neutral-100 p-0.5 border border-neutral-300">
                {CENTRES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCentre(c)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-tight transition-all cursor-pointer ${
                      centre === c
                        ? 'bg-[var(--primary)] text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                <Calendar size={14} /> Period:
              </span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-neutral-50 border border-neutral-300 text-neutral-800 text-xs font-bold py-1.5 px-3 focus:outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Range */}
            {period === 'custom' && (
              <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1 border border-neutral-200">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs bg-white border border-neutral-300 px-2 py-1 font-mono"
                />
                <span className="text-[10px] font-bold text-neutral-500 uppercase">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs bg-white border border-neutral-300 px-2 py-1 font-mono"
                />
              </div>
            )}
          </div>

          {scorecard && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                Active Reporting Window
              </span>
              <span className="text-xs font-black text-[#006064] tracking-tight">
                {scorecard.displayDateRange}
              </span>
            </div>
          )}
        </div>
      </FadeUp>

      {/* Main Scorecard Table — Simple, Clean, Frozen Headers */}
      <FadeUp delay={0.1}>
        <div className="bg-white border border-neutral-300 shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="bg-[#0c1933] text-white px-5 py-3.5 flex items-center justify-between border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-[#d4af37]" size={18} />
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  COMMUNITY MANAGER MIS SCORECARD — {centre.toUpperCase()} ({scorecard?.displayDateRange || 'Loading...'})
                </h2>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Community Manager Performance Evaluation | Centre: {centre}
                </p>
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Period: {scorecard?.startDate} to {scorecard?.endDate}
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-[var(--primary)] mb-3" />
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Fetching Data & Computing Scorecard Matrix...
              </p>
            </div>
          ) : !scorecard ? (
            <div className="py-16 text-center text-neutral-500">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-bold">No scorecard data available for selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[72vh]">
              <table className="w-full border-collapse text-left text-xs font-sans">
                {/* Frozen Table Header */}
                <thead className="sticky top-0 z-20 bg-[#111c2e] text-white text-[11px] uppercase tracking-wider shadow-sm">
                  <tr className="border-b border-neutral-700">
                    <th className="py-3 px-3 w-[220px] font-bold border-r border-neutral-700">TASK/SYSTEM</th>
                    <th className="py-3 px-3 w-[180px] font-bold border-r border-neutral-700">KRA</th>
                    <th className="py-3 px-3 w-[160px] font-bold border-r border-neutral-700">KPI</th>
                    <th className="py-3 px-2 w-[80px] text-center font-bold border-r border-neutral-700">BENCHMARK</th>
                    <th className="py-3 px-2 w-[90px] text-center font-bold border-r border-neutral-700">LAST WEEK ACTUAL %</th>
                    <th className="py-3 px-2 w-[90px] text-center font-bold border-r border-neutral-700">ALL PENDING WORK</th>
                    <th className="py-3 px-2 w-[90px] text-center font-bold border-r border-neutral-700">PENDING DONE THIS WK</th>
                    <th className="py-3 px-2 w-[95px] text-center font-bold border-r border-neutral-700">CURRENT WK PLANNED</th>
                    <th className="py-3 px-2 w-[95px] text-center font-bold border-r border-neutral-700">CURRENT WK ACTUAL</th>
                    <th className="py-3 px-3 w-[110px] text-right font-bold border-r border-neutral-700 bg-slate-900">CURRENT WK ACTUAL %</th>
                    <th className="py-3 px-2 w-[80px] text-center font-bold">NEXT WK PLANNED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {scorecard.blocks.map((block) => {
                    const r1 = block.rows[0];
                    const r2 = block.rows[1];

                    return (
                      <React.Fragment key={block.id}>
                        {/* Row 1: All work should be done */}
                        <tr className="hover:bg-neutral-50/80 transition-colors bg-white">
                          <td
                            rowSpan={2}
                            className="py-3 px-3 border-r border-b border-neutral-300 font-bold text-slate-900 align-middle bg-white"
                          >
                            {block.taskTitle}
                          </td>
                          <td className="py-2.5 px-3 border-r border-neutral-200 text-slate-700">
                            {r1.kra}
                          </td>
                          <td className="py-2.5 px-3 border-r border-neutral-200 text-slate-600 font-mono text-[11px]">
                            {r1.kpi}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-600 font-semibold">
                            {r1.benchmark || '100%'}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-mono text-slate-700 font-medium">
                            {formatScorecardPct(r1.lastWeekActualPct)}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-700 font-medium">
                            {r1.allPendingWork}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-700 font-medium">
                            {r1.pendingWorkDoneThisWeek}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-semibold text-slate-800">
                            {r1.currentWeekPlanned}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-semibold text-slate-800">
                            {r1.currentWeekActual}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-neutral-200 font-mono font-bold">
                            <span
                              className={`px-1.5 py-0.5 text-xs ${
                                r1.currentWeekActualPct < 0
                                  ? 'text-rose-700 font-bold'
                                  : 'text-emerald-700 font-bold'
                              }`}
                            >
                              {formatScorecardPct(r1.currentWeekActualPct)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-400">
                            {r1.nextWeekPlanned || ''}
                          </td>
                        </tr>

                        {/* Row 2: All work should be done on time */}
                        <tr className="hover:bg-neutral-50/80 transition-colors bg-neutral-50/20">
                          <td className="py-2.5 px-3 border-r border-b border-neutral-300 text-slate-700">
                            {r2.kra}
                          </td>
                          <td className="py-2.5 px-3 border-r border-b border-neutral-300 text-slate-600 font-mono text-[11px]">
                            {r2.kpi}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-600 font-semibold">
                            {r2.benchmark || '100%'}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-mono text-slate-700 font-medium">
                            {formatScorecardPct(r2.lastWeekActualPct)}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-700 font-medium">
                            {r2.allPendingWork}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-700 font-medium">
                            {r2.pendingWorkDoneThisWeek}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-semibold text-slate-800">
                            {r2.currentWeekPlanned}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-semibold text-slate-800">
                            {r2.currentWeekActual}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-b border-neutral-300 font-mono font-bold">
                            <span
                              className={`px-1.5 py-0.5 text-xs ${
                                r2.currentWeekActualPct < 0
                                  ? 'text-rose-700 font-bold'
                                  : 'text-emerald-700 font-bold'
                              }`}
                            >
                              {formatScorecardPct(r2.currentWeekActualPct)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center border-b border-neutral-300 text-slate-400">
                            {r2.nextWeekPlanned || ''}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* OVERALL SCORE SECTION */}
                  <tr className="bg-slate-50/70 font-semibold border-t-2 border-slate-300">
                    <td
                      rowSpan={2}
                      className="py-3 px-3 font-bold text-slate-800 border-r border-b border-neutral-300 align-middle bg-slate-100/80"
                    >
                      Overall Score
                    </td>
                    <td className="py-2.5 px-3 border-r border-neutral-200 text-slate-800">
                      {scorecard.overallScore.workDone.kra}
                    </td>
                    <td className="py-2.5 px-3 border-r border-neutral-200 font-mono text-[11px] text-slate-700">
                      {scorecard.overallScore.workDone.kpi}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-700 font-semibold">
                      {scorecard.overallScore.workDone.benchmark || '100%'}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-mono text-slate-700 font-medium">
                      {formatScorecardPct(scorecard.overallScore.workDone.lastWeekActualPct)}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-700 font-medium">
                      {scorecard.overallScore.workDone.allPendingWork}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 text-slate-700 font-medium">
                      {scorecard.overallScore.workDone.pendingWorkDoneThisWeek}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-bold text-slate-900">
                      {scorecard.overallScore.workDone.currentWeekPlanned}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-neutral-200 font-bold text-slate-900">
                      {scorecard.overallScore.workDone.currentWeekActual}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-neutral-200 font-mono font-bold">
                      <span
                        className={`px-1.5 py-0.5 text-xs ${
                          scorecard.overallScore.workDone.currentWeekActualPct < 0
                            ? 'text-rose-700 font-bold'
                            : 'text-emerald-700 font-bold'
                        }`}
                      >
                        {formatScorecardPct(scorecard.overallScore.workDone.currentWeekActualPct)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400">-</td>
                  </tr>

                  <tr className="bg-slate-50/70 font-semibold border-b border-neutral-300">
                    <td className="py-2.5 px-3 border-r border-b border-neutral-300 text-slate-800">
                      {scorecard.overallScore.onTime.kra}
                    </td>
                    <td className="py-2.5 px-3 border-r border-b border-neutral-300 font-mono text-[11px] text-slate-700">
                      {scorecard.overallScore.onTime.kpi}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-700 font-semibold">
                      {scorecard.overallScore.onTime.benchmark || '100%'}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-mono text-slate-700 font-medium">
                      {formatScorecardPct(scorecard.overallScore.onTime.lastWeekActualPct)}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-700 font-medium">
                      {scorecard.overallScore.onTime.allPendingWork}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 text-slate-700 font-medium">
                      {scorecard.overallScore.onTime.pendingWorkDoneThisWeek}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-bold text-slate-900">
                      {scorecard.overallScore.onTime.currentWeekPlanned}
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-b border-neutral-300 font-bold text-slate-900">
                      {scorecard.overallScore.onTime.currentWeekActual}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-b border-neutral-300 font-mono font-bold">
                      <span
                        className={`px-1.5 py-0.5 text-xs ${
                          scorecard.overallScore.onTime.currentWeekActualPct < 0
                            ? 'text-rose-700 font-bold'
                            : 'text-emerald-700 font-bold'
                        }`}
                      >
                        {formatScorecardPct(scorecard.overallScore.onTime.currentWeekActualPct)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-b border-neutral-300 text-slate-400">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Centered Box: [ Mercado CM MIS Score ] */}
          <div className="py-3 bg-white flex justify-center border-t border-neutral-200">
            <div className="px-6 py-1.5 border border-neutral-400 text-slate-800 font-bold text-xs uppercase tracking-wider bg-neutral-50 shadow-2xs">
              {scorecard?.centre} CM MIS Score
            </div>
          </div>

          {/* Standard Footer Note */}
          <div className="p-3 bg-neutral-100 text-center text-xs text-neutral-500 font-medium border-t border-neutral-200">
            SSPACIA Executive MIS System | Standard BMP MIS Format | Confidential
          </div>
        </div>
      </FadeUp>

      {/* Email Dispatch Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full p-6 shadow-xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-black uppercase text-slate-900 mb-2">
              Dispatch Executive Meeting Report Email
            </h3>
            <p className="text-xs text-neutral-600 mb-4">
              Sends an automated MIS scorecard email with individual centre landscape PDFs attached directly from{' '}
              <strong className="text-slate-800">mis.sspacia01@gmail.com</strong>.
            </p>

            <div className="bg-neutral-50 p-3 border border-neutral-200 space-y-1.5 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Subject:</span>
                <span className="font-bold text-slate-800">Mercado | AG | PH EM Reports period :- {scorecard?.displayDateRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Reporting Window:</span>
                <span className="font-bold text-[#006064]">{scorecard?.displayDateRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Sender:</span>
                <span className="font-mono text-slate-700">mis.sspacia01@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Notice:</span>
                <span className="text-amber-700 font-semibold">Reply before 10:00 AM for any observation</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEmailModalOpen(false)}
                disabled={sendingEmail}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Confirm & Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
