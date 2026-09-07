'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  AlertTriangle,
  Calendar,
  Lock,
  FileText,
  MapPin,
  Building2,
  Phone,
  Mail,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  Bell,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface ContactPerson {
  id?: number;
  name: string;
  designation?: string | null;
  mobileNo?: string | null;
  email?: string | null;
}

interface NotificationItem {
  id: number;
  srNo?: number;
  companyName: string;
  agreementStartDate?: string | null;
  agreementEndDate?: string | null;
  lockinEndDate?: string | null;
  targetDate?: string;
  noticePeriodMonths?: number | null;
  noticePeriodApplicable?: string | null;
  daysRemaining: number;
  isExpired?: boolean;
  statusTag: 'EXPIRED' | 'URGENT' | 'DUE_SOON';
  type: 'AGREEMENT' | 'LOCK_IN';
  cabinName?: string | null;
  noOfSeats?: number | null;
  totalAmount?: number | null;
  contactPersons?: ContactPerson[];
  locationName?: string | null;
}

export function AgreementAlertPopup() {
  const { user, isRole } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [agreements, setAgreements] = useState<NotificationItem[]>([]);
  const [lockins, setLockins] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'AGREEMENT' | 'LOCK_IN'>('ALL');
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if current user is Community Manager or Super Admin / Admin
  const isSuperOrAdmin = isRole('ADMIN') || isRole('SUPER_ADMIN') || user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'SUPER_ADMIN';
  const isCommunityManager = isRole('COMMUNITY_MANAGER') || user?.role?.toUpperCase() === 'COMMUNITY_MANAGER' || user?.role?.toUpperCase()?.includes('MANAGER');
  const isAccountant =
    user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
    user?.role?.toUpperCase() === 'ACCOUNTS' ||
    user?.role?.toUpperCase() === 'ACCOUNTANT' ||
    user?.name?.toLowerCase() === 'accounts';

  const isEligibleUser = (isSuperOrAdmin || isCommunityManager) && !isAccountant;

  const fetchAlerts = useCallback(async () => {
    if (!isEligibleUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agreement-notifications');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          const fetchedAgreements: NotificationItem[] = json.agreements || [];
          const fetchedLockins: NotificationItem[] = json.lockins || [];
          setAgreements(fetchedAgreements);
          setLockins(fetchedLockins);

          const totalAlerts = fetchedAgreements.length + fetchedLockins.length;
          // Check if dismissed in this session
          const dismissedInSession = sessionStorage.getItem('sspacia_agreement_popup_dismissed_session');
          if (totalAlerts > 0 && !dismissedInSession) {
            setIsOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch agreement and lock-in alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [isEligibleUser]);

  useEffect(() => {
    if (isEligibleUser) {
      fetchAlerts();
    }
  }, [isEligibleUser, fetchAlerts]);

  // Listen for custom trigger from bell icon or other buttons to reopen
  useEffect(() => {
    const handleReopen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-agreement-alert-popup', handleReopen);
    return () => window.removeEventListener('open-agreement-alert-popup', handleReopen);
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('sspacia_agreement_popup_dismissed_session', 'true');
  };

  const handleNavigateToClient = (companyName: string) => {
    handleDismiss();
    const basePath = isSuperOrAdmin ? '/admin/client-master' : '/manager/client-master';
    router.push(`${basePath}?search=${encodeURIComponent(companyName)}`);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 360;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isEligibleUser) return null;

  // Sort agreements and lock-ins individually by daysRemaining (most urgent/expired first)
  const sortedAgreements = [...agreements].sort((a, b) => a.daysRemaining - b.daysRemaining);
  const sortedLockins = [...lockins].sort((a, b) => a.daysRemaining - b.daysRemaining);

  // FIRST show all Agreement End Date items, THEN Lock-in End Date items
  const combinedItems: NotificationItem[] = [
    ...(activeFilter === 'LOCK_IN' ? [] : sortedAgreements),
    ...(activeFilter === 'AGREEMENT' ? [] : sortedLockins),
  ];

  const totalCount = agreements.length + lockins.length;
  if (totalCount === 0 && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs overscroll-contain">
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white border border-neutral-200 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden font-sans"
          >
            {/* ── TOP BANNER HEADER ── */}
            <div className="px-5 sm:px-7 py-4 bg-gradient-to-r from-[#004D40] via-[#006064] to-[#00838F] text-white flex items-start justify-between gap-3 shrink-0 shadow-xs">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 shadow-inner">
                  <AlertTriangle size={22} className="animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
                      Action Required: Agreement & Lock-in Alerts
                    </h2>
                    <span className="px-2 py-0.5 bg-amber-400 text-amber-950 rounded-full text-[10px] font-black uppercase tracking-wider shadow-2xs">
                      {totalCount} {totalCount === 1 ? 'Alert' : 'Alerts'}
                    </span>
                  </div>
                  <p className="text-xs text-teal-50/90 mt-0.5 leading-relaxed max-w-2xl">
                    Clients approaching 2 months agreement end date or lock-in period end dates requiring renewal or completion review.
                  </p>
                </div>
              </div>

              {/* DISMISS (X) BUTTON */}
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer shrink-0 mt-0.5"
                title="Dismiss and close (X)"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── FILTER TABS & SCROLL CONTROLS ── */}
            <div className="px-5 sm:px-7 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 mr-1">
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-[#006064] text-white shadow-2xs'
                      : 'bg-white text-gray-700 hover:bg-neutral-200 border border-neutral-300'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('AGREEMENT')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === 'AGREEMENT'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white text-gray-700 hover:bg-neutral-200 border border-neutral-300'
                  }`}
                >
                  <FileText size={12} className={activeFilter === 'AGREEMENT' ? 'text-teal-200' : 'text-teal-600'} />
                  <span>2 Months Agreement End Date ({agreements.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('LOCK_IN')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeFilter === 'LOCK_IN'
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-white text-gray-700 hover:bg-neutral-200 border border-neutral-300'
                  }`}
                >
                  <Lock size={12} className={activeFilter === 'LOCK_IN' ? 'text-purple-200' : 'text-purple-600'} />
                  <span>Lock-in End Date ({lockins.length})</span>
                </button>
              </div>

              {/* HORIZONTAL SCROLL ARROWS */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 hidden sm:inline font-mono">
                  Scroll list:
                </span>
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  className="p-1.5 rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-gray-700 transition-colors cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  className="p-1.5 rounded bg-white hover:bg-neutral-200 border border-neutral-300 text-gray-700 transition-colors cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* ── HORIZONTAL CARDS LIST CONTAINER ── */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto overflow-y-hidden p-5 sm:p-7 flex flex-row gap-4 items-stretch scroll-smooth scrollbar-thin scrollbar-thumb-neutral-300 overscroll-x-contain min-h-[360px]"
            >
              {combinedItems.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center p-12 text-center bg-neutral-50 border border-dashed border-neutral-300 rounded-xl">
                  <Bell size={36} className="text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-800">No active agreement or lock-in alerts match this filter</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">All clients are within safe agreement and lock-in periods.</p>
                </div>
              ) : (
                combinedItems.map((item, idx) => {
                  const isExpired = item.daysRemaining < 0;
                  const isUrgent = !isExpired && item.daysRemaining <= 15;
                  const primaryContact = item.contactPersons?.[0];

                  return (
                    <div
                      key={`${item.type}_${item.id}_${idx}`}
                      className={`w-[320px] sm:w-[355px] shrink-0 bg-white rounded-xl border flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative overflow-hidden ${
                        isExpired
                          ? 'border-red-300 border-l-[5px] border-l-red-600'
                          : isUrgent
                          ? 'border-amber-300 border-l-[5px] border-l-amber-500'
                          : 'border-teal-200 border-l-[5px] border-l-[#006064]'
                      }`}
                    >
                      {/* CARD TOP HEADER */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col">
                        {/* BADGE BAR */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          {item.type === 'AGREEMENT' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-[#006064] border border-teal-200 rounded text-[10.5px] font-bold">
                              <FileText size={11} className="text-[#006064]" />
                              <span>2 Months Agreement End Date</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded text-[10.5px] font-bold">
                              <Lock size={11} className="text-purple-700" />
                              <span>Lock-in End Date</span>
                            </span>
                          )}

                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-[10.5px] font-black">
                              🚨 Expired {Math.abs(item.daysRemaining)}d ago
                            </span>
                          ) : isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10.5px] font-bold">
                              ⚠️ {item.daysRemaining} days left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10.5px] font-bold">
                              ⏳ {item.daysRemaining} days left
                            </span>
                          )}
                        </div>

                        {/* COMPANY & CENTRE */}
                        <div>
                          <h3 className="font-black text-sm sm:text-[15px] text-[#1B1C1C] leading-snug line-clamp-2" title={item.companyName}>
                            {item.companyName}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1 text-gray-600 text-xs">
                            <MapPin size={12} className="text-[#006064] shrink-0" />
                            <span className="font-semibold text-gray-800">{item.locationName || 'Main Centre'}</span>
                            {item.cabinName && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-500 truncate" title={item.cabinName}>{item.cabinName}</span>
                              </>
                            )}
                          </div>
                          {item.noOfSeats ? (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {item.noOfSeats} {item.noOfSeats === 1 ? 'Seat' : 'Seats'}
                              {item.totalAmount ? ` • ₹${Number(item.totalAmount).toLocaleString('en-IN')}/mo` : ''}
                            </div>
                          ) : null}
                        </div>

                        {/* KEY DATES CARD (AGREEMENT END DATE FIRST, THEN LOCK-IN) */}
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 space-y-1.5 text-xs font-mono">
                          {/* 1. Agreement End Date First */}
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-[10.5px] uppercase font-sans font-medium">
                              Agreement End Date:
                            </span>
                            <strong className={`text-xs ${item.type === 'AGREEMENT' && isExpired ? 'text-red-700 font-bold' : item.type === 'AGREEMENT' ? 'text-teal-900 font-bold' : 'text-gray-900'}`}>
                              {formatDate(item.agreementEndDate || (item.type === 'AGREEMENT' ? item.targetDate : null))}
                            </strong>
                          </div>

                          {/* 2. Lock-in End Date Second */}
                          {item.lockinEndDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 text-[10.5px] uppercase font-sans font-medium">
                                Lock-in End Date:
                              </span>
                              <strong className={`text-xs ${item.type === 'LOCK_IN' && isExpired ? 'text-red-700 font-bold' : item.type === 'LOCK_IN' ? 'text-purple-900 font-bold' : 'text-gray-700'}`}>
                                {formatDate(item.lockinEndDate)}
                              </strong>
                            </div>
                          )}

                          {item.agreementStartDate && (
                            <div className="flex items-center justify-between text-gray-500 text-[11px]">
                              <span className="font-sans">Start Date:</span>
                              <span>{formatDate(item.agreementStartDate)}</span>
                            </div>
                          )}
                        </div>

                        {/* CONTACT PERSON */}
                        {primaryContact && (
                          <div className="pt-2 border-t border-neutral-100 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-gray-800">
                              <User size={11} className="text-gray-400 shrink-0" />
                              <span className="truncate">{primaryContact.name}</span>
                              {primaryContact.designation && (
                                <span className="text-[10px] text-gray-400 font-normal">
                                  ({primaryContact.designation})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px] text-gray-600 flex-wrap">
                              {primaryContact.mobileNo && (
                                <a
                                  href={`tel:${primaryContact.mobileNo}`}
                                  className="inline-flex items-center gap-1 hover:text-[#006064] font-mono hover:underline"
                                  title="Call client"
                                >
                                  <Phone size={10} className="text-teal-600" />
                                  <span>{primaryContact.mobileNo}</span>
                                </a>
                              )}
                              {primaryContact.email && (
                                <a
                                  href={`mailto:${primaryContact.email}`}
                                  className="inline-flex items-center gap-1 hover:text-[#006064] truncate max-w-[170px] hover:underline"
                                  title={primaryContact.email}
                                >
                                  <Mail size={10} className="text-teal-600" />
                                  <span className="truncate">{primaryContact.email}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CARD ACTION FOOTER */}
                      <div className="p-3 bg-neutral-50/80 border-t border-neutral-200 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono text-gray-400">
                          {item.srNo ? `#${item.srNo}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleNavigateToClient(item.companyName)}
                          className="px-3 py-1.5 bg-[#006064] hover:bg-[#004D40] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>View in Client Master</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── MODAL FOOTER ── */}
            <div className="px-5 sm:px-7 py-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                <span className="hidden sm:inline">
                  Click <strong>X</strong> to dismiss. You can always inspect these alerts anytime from the top-right <strong>Bell Icon</strong>.
                </span>
                <span className="sm:hidden">
                  Click <strong>X</strong> to dismiss.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Dismiss (X)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
