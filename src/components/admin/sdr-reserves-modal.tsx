'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coins,
  X,
  Search,
  ArrowUpDown,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export interface SdrCompanyItem {
  id: number;
  companyName: string;
  clientId: string | null;
  cabinName: string | null;
  noOfSeats: number | null;
  sdrAmount: number;
  clientStatus: string | null;
  centreName: string;
  centreId: number | null;
}

export interface SdrCentreSummary {
  name: string;
  totalSdr: number;
  clientCount: number;
}

interface SdrReservesModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalSdr: number;
  centres: SdrCentreSummary[];
  allCompanies: SdrCompanyItem[];
  initialCentre?: string;
}

export function SdrReservesModal({
  isOpen,
  onClose,
  totalSdr,
  centres,
  allCompanies,
  initialCentre = 'ALL',
}: SdrReservesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCentre, setSelectedCentre] = useState<string>(initialCentre);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'HIGHEST' | 'LOWEST' | 'NAME'>('HIGHEST');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedCentre(initialCentre);
      setSearchQuery('');
      setSortOrder('HIGHEST');
    }
  }, [isOpen, initialCentre]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered & Sorted Companies
  const filteredCompanies = useMemo(() => {
    let list = allCompanies;
    if (selectedCentre !== 'ALL') {
      list = list.filter((c) =>
        c.centreName.toLowerCase().includes(selectedCentre.toLowerCase())
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          (c.clientId && c.clientId.toLowerCase().includes(q)) ||
          (c.cabinName && c.cabinName.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      if (sortOrder === 'HIGHEST') return b.sdrAmount - a.sdrAmount;
      if (sortOrder === 'LOWEST') return a.sdrAmount - b.sdrAmount;
      return a.companyName.localeCompare(b.companyName);
    });
  }, [allCompanies, selectedCentre, searchQuery, sortOrder]);

  // Current Filtered Sum
  const filteredTotalSdr = useMemo(() => {
    return filteredCompanies.reduce((acc, c) => acc + (Number(c.sdrAmount) || 0), 0);
  }, [filteredCompanies]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-white w-full max-w-4xl max-h-[90vh] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#004D40] text-white flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/10 border border-white/20 flex items-center justify-center text-teal-300">
                  <Coins size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Security Deposit (SDR) Reserves Ledger
                    </h2>
                    <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 px-2 py-0.5 border border-teal-400/30 uppercase tracking-widest">
                      Live Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light mt-0.5">
                    Total SDR Held: <strong className="text-teal-300 font-bold font-mono">₹{Number(totalSdr).toLocaleString('en-IN')}</strong> across {allCompanies.length} Client Agreements
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Centre Quick-Filter Summary Chips */}
            <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCentre('ALL')}
                className={`p-2.5 text-left border transition-all cursor-pointer ${
                  selectedCentre === 'ALL'
                    ? 'bg-teal-50/90 border-[#006064] shadow-xs'
                    : 'bg-white border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-neutral-500">All Centres</div>
                <div className="text-xs sm:text-sm font-black text-[#006064] font-mono mt-0.5">
                  ₹{Number(totalSdr).toLocaleString('en-IN')}
                </div>
                <div className="text-[9.5px] text-neutral-500 font-medium">{allCompanies.length} Agreements</div>
              </button>

              {centres.map((c) => {
                const isSelected = selectedCentre.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedCentre(c.name)}
                    className={`p-2.5 text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/90 border-[#006064] shadow-xs'
                        : 'bg-white border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-neutral-500 truncate">{c.name}</div>
                    <div className="text-xs sm:text-sm font-black text-neutral-900 font-mono mt-0.5">
                      ₹{Number(c.totalSdr).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9.5px] text-neutral-500 font-medium">{c.clientCount} Clients</div>
                  </button>
                );
              })}
            </div>

            {/* Controls Toolbar: Centre Dropdown + Search + Sort */}
            <div className="px-5 py-2.5 bg-white border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px]">Filter Centre:</span>
                  <select
                    value={selectedCentre}
                    onChange={(e) => setSelectedCentre(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-bold text-[#006064] focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="ALL">All Centres</option>
                    {centres.map((centre) => (
                      <option key={centre.name} value={centre.name}>
                        {centre.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 font-bold uppercase text-[9.5px]">Sort:</span>
                  <select
                    value={sortOrder}
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="bg-neutral-50 border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
                  >
                    <option value="HIGHEST">SDR: High to Low</option>
                    <option value="LOWEST">SDR: Low to High</option>
                    <option value="NAME">Company: A-Z</option>
                  </select>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-2.5 top-2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search company, ID, cabin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-300 pl-7 pr-7 py-1 text-xs focus:outline-none focus:border-[#006064] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Data Table */}
            <div className="flex-1 overflow-y-auto min-h-[260px] max-h-[50vh]">
              {filteredCompanies.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-2">
                  <Building2 size={28} className="text-neutral-300" />
                  <p className="font-bold text-neutral-700">No matching SDR records found</p>
                  <p className="text-neutral-400">Try adjusting your centre filter or search term.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-neutral-100 text-[10px] font-black uppercase tracking-wider text-neutral-600 border-b border-neutral-200 z-10">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Company Name &amp; ID</th>
                      <th className="py-2.5 px-4">Centre Node</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">SDR Held Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredCompanies.map((comp, idx) => {
                      const isMercado = comp.centreName.toLowerCase().includes('mercado');
                      const isPremier = comp.centreName.toLowerCase().includes('premier');

                      return (
                        <tr key={comp.id} className="hover:bg-teal-50/40 transition-colors">
                          <td className="py-2 px-4 text-center font-mono text-neutral-400 text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-4">
                            <span className="font-bold text-neutral-900 block sm:inline">{comp.companyName}</span>
                            {comp.clientId && (
                              <span className="sm:ml-1.5 text-[10px] font-mono text-neutral-500">
                                ({comp.clientId})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider border ${
                                isMercado
                                  ? 'bg-teal-50 text-[#006064] border-teal-200'
                                  : isPremier
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {comp.centreName}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <span
                              className={`text-[9.5px] font-bold px-2 py-0.5 border ${
                                comp.clientStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                              }`}
                            >
                              {comp.clientStatus || 'Active'}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right">
                            <span className="text-xs sm:text-sm font-black text-[#006064] font-mono">
                              ₹{Number(comp.sdrAmount).toLocaleString('en-IN')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-neutral-600 font-medium">
                Showing <strong>{filteredCompanies.length}</strong> of <strong>{allCompanies.length}</strong> companies • Filtered Sum: <strong className="text-[#006064] font-mono font-bold">₹{Number(filteredTotalSdr).toLocaleString('en-IN')}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/client-master"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs font-bold text-[#006064] bg-teal-50 hover:bg-teal-100 border border-teal-200 flex items-center gap-1 transition-colors"
                >
                  <span>Open Client Master CRM</span>
                  <ExternalLink size={12} />
                </Link>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-neutral-100 border border-neutral-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
