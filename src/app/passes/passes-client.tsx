'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Upload,
  Loader2,
  FileText,
  Building2,
  Check,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/ui/auth-modal';
import { ShortTermAgreementModal, ShortTermAgreementData } from '@/components/ui/short-term-agreement-modal';

interface CentreOption {
  productId: number;
  locationId: number;
  name: string;
  area: string;
  address: string;
  image: string;
  capacity: number;
}

const CENTRES: CentreOption[] = [
  {
    productId: 1,
    locationId: 1,
    name: 'Agarwal Complex',
    area: 'C.G. Road',
    address: 'Agarwal Complex, Near Municipal Market, C.G. Road, Ahmedabad – 380009',
    image: '/IMAGES_SSPACIA/AGARWAL IMAGES/Meeting_Room_1.jpg',
    capacity: 20,
  },
  {
    productId: 6,
    locationId: 2,
    name: 'Mercado',
    area: 'C.G. Road',
    address: '6th Floor, Mercádo, Opp. Municipal Market, C.G. Road, Ahmedabad – 380009',
    image: '/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg',
    capacity: 25,
  },
  {
    productId: 11,
    locationId: 3,
    name: 'Premier House',
    area: 'S.G. Highway',
    address: 'Premier House, Opp. Gurudwara, S.G. Highway, Bodakdev, Ahmedabad – 380054',
    image: '/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG',
    capacity: 20,
  },
];

// Helper to get today ISO string YYYY-MM-DD in local time
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper to add days to a YYYY-MM-DD date string and return YYYY-MM-DD
function addDaysToString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper to format date display (e.g. "8 Sep 2026")
function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PassesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth();

  // Initial params from URL if any
  const preselectedLocation = searchParams?.get('centre') || searchParams?.get('location');
  const preselectedType = searchParams?.get('type')?.toUpperCase();

  const [selectedCentre, setSelectedCentre] = useState<CentreOption>(() => {
    if (preselectedLocation) {
      const match = CENTRES.find(
        (c) =>
          c.name.toLowerCase().includes(preselectedLocation.toLowerCase()) ||
          c.productId.toString() === preselectedLocation ||
          c.locationId.toString() === preselectedLocation
      );
      if (match) return match;
    }
    return CENTRES[1]; // Mercado default
  });

  const [passType, setPassType] = useState<'DAILY' | 'WEEKLY'>(() => {
    return preselectedType === 'WEEKLY' ? 'WEEKLY' : 'DAILY';
  });

  const [seats, setSeats] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(getTodayString());
  const [endDate, setEndDate] = useState<string>(getTodayString());

  // Today confirmation modal for weekly pass
  const [showTodayConfirmModal, setShowTodayConfirmModal] = useState<boolean>(false);
  const [pendingDateForWeekly, setPendingDateForWeekly] = useState<string | null>(null);

  // Availability State
  const [availability, setAvailability] = useState<{
    totalCapacity: number;
    bookedSeats: number;
    availableSeats: number;
    isAvailable: boolean;
  } | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);

  // Client Details
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyGst, setCompanyGst] = useState<string>('');
  const [requestAgreement, setRequestAgreement] = useState<boolean>(true);

  // Payment
  const [remarks, setRemarks] = useState<string>('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modals
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Autofill user info if logged in
  useEffect(() => {
    if (user) {
      if (!clientName) setClientName(user.name || '');
      if (!clientEmail) setClientEmail(user.email || '');
      if (!clientPhone) setClientPhone(user.phone || (user as any).contactNumber || '');
      if (!companyName && (user as any).companyName) setCompanyName((user as any).companyName);
      if (!companyAddress && (user as any).companyStreet) setCompanyAddress((user as any).companyStreet);
    }
  }, [user, clientName, clientEmail, clientPhone, companyName, companyAddress]);

  // Recalculate end date whenever passType or startDate changes
  useEffect(() => {
    if (passType === 'WEEKLY') {
      setEndDate(addDaysToString(startDate, 6)); // 7 days total (e.g. today + 6 days)
    } else {
      setEndDate(startDate); // 1 day
    }
  }, [passType, startDate]);

  // Handle date change from picker
  const handleDateChange = (newDate: string) => {
    const today = getTodayString();

    if (passType === 'WEEKLY' && newDate === today) {
      // Show confirmation modal for today's date
      setPendingDateForWeekly(newDate);
      setShowTodayConfirmModal(true);
      return;
    }

    setStartDate(newDate);
  };

  const handleConfirmTodayDate = () => {
    if (pendingDateForWeekly) {
      setStartDate(pendingDateForWeekly);
    }
    setShowTodayConfirmModal(false);
    setPendingDateForWeekly(null);
  };

  const handleCancelTodayDate = () => {
    setShowTodayConfirmModal(false);
    setPendingDateForWeekly(null);
  };

  // Pricing calculations
  const baseRate = passType === 'WEEKLY' ? 4000 : 500;
  const subtotal = baseRate * seats;
  const sgst = (subtotal * 9) / 100;
  const cgst = (subtotal * 9) / 100;
  const total = subtotal + sgst + cgst;

  // Live Availability Check
  const checkAvailability = useCallback(async () => {
    if (!startDate || !selectedCentre) return;
    setIsCheckingAvailability(true);
    try {
      const calcEndDate = passType === 'WEEKLY' ? addDaysToString(startDate, 6) : startDate;
      const res = await fetch(
        `/api/passes/availability?productId=${selectedCentre.productId}&startDate=${startDate}&endDate=${calcEndDate}`
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setAvailability({
          totalCapacity: json.data.totalCapacity,
          bookedSeats: json.data.bookedSeats,
          availableSeats: json.data.availableSeats,
          isAvailable: json.data.availableSeats >= seats,
        });
      }
    } catch (err) {
      console.error('Availability check failed:', err);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [selectedCentre, startDate, passType, seats]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Handle Screenshot file upload
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
      toast.success('Payment screenshot attached');
    };
    reader.onerror = () => toast.error('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('MSSPACIAINDIAPRIVATELIMITED.eazypay@icici');
    setCopiedUpi(true);
    toast.success('Official UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Submission handler
  const handleBookPass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('Please enter client name and email');
      return;
    }

    if (!remarks.trim()) {
      toast.error('Please enter payment UTR / transaction reference number');
      return;
    }

    if (availability && seats > availability.availableSeats) {
      toast.error(
        `Only ${availability.availableSeats} seat(s) available for the selected dates. Please adjust quantity.`
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Securing your Flexi Desk pass reservation...');

    try {
      const res = await fetch('/api/passes/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedCentre.productId,
          passType,
          startDate,
          endDate,
          seats,
          customerName: clientName.trim(),
          customerEmail: clientEmail.trim(),
          customerPhone: clientPhone.trim(),
          companyName: companyName.trim(),
          companyAddress: companyAddress.trim(),
          companyGst: companyGst.trim(),
          requestAgreement,
          remarks: remarks.trim(),
          screenshotData,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to book pass');
      }

      toast.success('Pass Booked Successfully!', {
        id: toastId,
        description: `Booking ID: ${json.booking.bookingNumber}. Notification email sent to praveen.agarwal1@gmail.com.`,
      });

      router.push('/dashboard/bookings');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agreement modal data
  const agreementData: ShortTermAgreementData = useMemo(
    () => ({
      clientName: clientName || user?.name || 'Client',
      companyName: companyName || (user as any)?.companyName || undefined,
      registeredOffice: companyAddress || 'Ahmedabad, Gujarat',
      gstNumber: companyGst || 'N/A',
      seats,
      centreName: selectedCentre.name,
      centreAddress: selectedCentre.address,
      startDate,
      endDate: passType === 'WEEKLY' ? endDate : undefined,
      passType,
      bookingNumber: `PASS-${passType === 'WEEKLY' ? 'WEEK' : 'DAY'}-PREVIEW`,
    }),
    [
      clientName,
      user,
      companyName,
      companyAddress,
      companyGst,
      seats,
      selectedCentre,
      startDate,
      endDate,
      passType,
    ]
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] pt-6 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* ── Page Header ── */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0F7FA] text-[#006064] text-xs font-black uppercase tracking-widest rounded-full border border-[#006064]/20">
            <Sparkles size={13} className="text-[#1ab0bc]" />
            <span>Instant Workspace Access</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-black text-[#1B1C1C] tracking-tight uppercase">
            Flexi Desk Daily &amp; Weekly Pass
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto font-medium">
            Book ready-to-work flexi desks across Ahmedabad with ultra-fast Wi-Fi, premium amenities, 
            instant availability check, and official 1-page Short-Term Agreement.
          </p>
        </div>

        {/* ── Main Booking Grid ── */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Configuration & Options (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. SELECT CENTRE */}
            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#006064]">
                  <Building2 size={16} className="text-[#1ab0bc]" />
                  <span>Step 1: Choose Operating Centre</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">3 Centres Available</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {CENTRES.map((centre) => {
                  const isSelected = selectedCentre.productId === centre.productId;
                  return (
                    <button
                      key={centre.productId}
                      type="button"
                      onClick={() => setSelectedCentre(centre)}
                      className={`relative text-left p-3.5 border transition-all rounded-xs cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'border-[#006064] bg-[#E0F7FA]/30 shadow-md ring-1 ring-[#006064]'
                          : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}
                    >
                      <div className="relative aspect-[16/10] w-full mb-3 rounded-xs overflow-hidden bg-slate-100">
                        <Image
                          src={centre.image}
                          alt={centre.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 bg-[#006064] text-white p-1 rounded-full shadow">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1B1C1C] leading-snug">{centre.name}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-[#1ab0bc]" />
                          <span>{centre.area}</span>
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-500">
                        <span>Flexi Desk Pool</span>
                        <span className="font-bold text-slate-800">{centre.capacity} Desks</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PASS TYPE & SEATS */}
            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#006064]">
                  <Clock size={16} className="text-[#1ab0bc]" />
                  <span>Step 2: Pass Duration &amp; Seats</span>
                </div>
              </div>

              {/* Pass Type Tabs */}
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPassType('DAILY')}
                  className={`p-4 border text-left transition-all rounded-xs cursor-pointer flex flex-col justify-between ${
                    passType === 'DAILY'
                      ? 'border-[#006064] bg-[#E0F7FA]/40 ring-1 ring-[#006064] shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#006064]">1-Day Access</span>
                      <h3 className="text-lg font-bold text-[#1B1C1C] mt-0.5">Daily Pass</h3>
                    </div>
                    {passType === 'DAILY' && <CheckCircle2 size={18} className="text-[#006064]" />}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <p className="text-2xl font-black text-[#006064] font-display">
                      ₹500 <span className="text-xs text-gray-500 font-normal font-sans">+ 18% GST</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">₹590 per seat all inclusive</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPassType('WEEKLY')}
                  className={`p-4 border text-left transition-all rounded-xs cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    passType === 'WEEKLY'
                      ? 'border-[#006064] bg-[#E0F7FA]/40 ring-1 ring-[#006064] shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 bg-white'
                  }`}
                >
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Best Value
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">7-Day Access</span>
                      <h3 className="text-lg font-bold text-[#1B1C1C] mt-0.5">Weekly Pass</h3>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <p className="text-2xl font-black text-[#006064] font-display">
                      ₹4,000 <span className="text-xs text-gray-500 font-normal font-sans">+ 18% GST</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">₹4,720 per seat all inclusive (7 Days)</p>
                  </div>
                </button>
              </div>

              {/* Quantity / Seat selector */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Users size={14} className="text-[#1ab0bc]" />
                    <span>Number of Flexi Desks / Seats</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mt-0.5">Select how many seats you need at {selectedCentre.name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => Math.max(1, prev - 1))}
                    disabled={seats <= 1}
                    className="w-10 h-10 flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xs disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-lg font-bold font-mono text-[#006064]">
                    {seats}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSeats((prev) => prev + 1)}
                    disabled={availability ? seats >= availability.availableSeats : false}
                    className="w-10 h-10 flex items-center justify-center border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xs disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 3. DATE SELECTION & AVAILABILITY */}
            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#006064]">
                  <Calendar size={16} className="text-[#1ab0bc]" />
                  <span>Step 3: Pick Date &amp; Check Availability</span>
                </div>
                {isCheckingAvailability && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Checking...
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    {passType === 'WEEKLY' ? 'Select Start Date (1 Week)' : 'Select Date'}
                  </label>
                  <input
                    type="date"
                    min={getTodayString()}
                    value={startDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3.5 py-2.5 text-sm font-medium rounded-xs outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                    Validity Range
                  </label>
                  <div className="bg-[#E0F7FA]/50 border border-[#006064]/20 px-3.5 py-2.5 rounded-xs text-xs font-bold text-[#006064] flex items-center gap-2">
                    <Calendar size={14} className="text-[#1ab0bc] shrink-0" />
                    <span className="truncate">
                      {passType === 'WEEKLY'
                        ? `${formatDateDisplay(startDate)} → ${formatDateDisplay(endDate)} (7 Days)`
                        : formatDateDisplay(startDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Availability Status Display */}
              <div className="pt-4 border-t border-slate-100">
                {availability ? (
                  <div
                    className={`p-4 rounded-xs border flex items-center justify-between gap-3 ${
                      availability.isAvailable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {availability.isAvailable ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <p className="font-bold text-xs sm:text-sm">
                          {availability.availableSeats} of {availability.totalCapacity} Flexi Desks Available
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          At {selectedCentre.name} for{' '}
                          {passType === 'WEEKLY'
                            ? `${formatDateDisplay(startDate)} to ${formatDateDisplay(endDate)}`
                            : formatDateDisplay(startDate)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={checkAvailability}
                      disabled={isCheckingAvailability}
                      className="text-[10px] font-bold uppercase px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xs shadow-2xs cursor-pointer shrink-0"
                    >
                      {isCheckingAvailability ? 'Refreshing...' : 'Re-Check'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={checkAvailability}
                    disabled={isCheckingAvailability}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCheckingAvailability ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>Check Availability</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. CLIENT DETAILS & SHORT TERM AGREEMENT OPTION */}
            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#006064]">
                  <FileText size={16} className="text-[#1ab0bc]" />
                  <span>Step 4: Client Details &amp; Short Term Agreement</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Rajesh Shah"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="e.g. rajesh@company.com"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. TechCorp Solutions Pvt Ltd"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    Registered Office Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="e.g. 402, Trade Square, Ahmedabad"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyGst}
                    onChange={(e) => setCompanyGst(e.target.value)}
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#006064] focus:bg-white px-3 py-2 text-xs font-medium rounded-xs outline-none uppercase font-mono"
                  />
                </div>
              </div>

              {/* Agreement Checkbox & Preview */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xs">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-800">
                  <input
                    type="checkbox"
                    checked={requestAgreement}
                    onChange={(e) => setRequestAgreement(e.target.checked)}
                    className="w-4 h-4 accent-[#006064] rounded cursor-pointer"
                  />
                  <span>
                    Include <strong>1-Page Short-Term Legal Agreement</strong> for this booking
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsAgreementModalOpen(true)}
                  className="text-xs font-bold text-[#006064] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <FileText size={13} />
                  <span>Preview Agreement</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & QR Payment (5 cols sticky) */}
          <div className="lg:col-span-5 space-y-6 sticky top-28">
            <div className="bg-white p-6 sm:p-8 rounded-sm border border-slate-200 shadow-lg space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight">
                  Pass Summary
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedCentre.name} • {passType === 'WEEKLY' ? 'Weekly Pass (7 Days)' : 'Daily Pass'}
                </p>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 text-xs border-b border-slate-200 pb-4">
                <div className="flex justify-between items-center text-slate-600">
                  <span>
                    Rate per Seat ({passType === 'WEEKLY' ? 'Weekly' : 'Daily'})
                  </span>
                  <span className="font-semibold text-slate-900">₹{baseRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Seats / Desks</span>
                  <span className="font-semibold text-slate-900">{seats} Seat{seats > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Base Subtotal</span>
                  <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>SGST (9%)</span>
                  <span className="font-semibold text-slate-900">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>CGST (9%)</span>
                  <span className="font-semibold text-slate-900">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-bold text-[#006064]">
                  <span className="uppercase tracking-wider">Grand Total (Incl. GST)</span>
                  <span className="text-2xl font-black font-display">
                    ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* QR Code & Payment Instructions */}
              <div className="space-y-4 pt-1">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Pay via ICICI UPI QR Code</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">
                      Verified
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 relative bg-white p-1 border border-slate-300 rounded shrink-0">
                      <Image
                        src="/qr-codes/sspacia-icici-qr.jpg"
                        alt="SSPACIA ICICI QR"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900">M/S.SSPACIA INDIA PVT LTD</p>
                      <p className="text-[11px] text-gray-500">Scan via GPay, PhonePe, Paytm or BHIM.</p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-[#006064] bg-white border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          {copiedUpi ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          <span>{copiedUpi ? 'Copied' : 'Copy UPI ID'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* UTR Input (Mandatory) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex justify-between">
                    <span>Payment Remarks / UTR Reference ID *</span>
                    <span className="text-[10px] text-rose-600">Mandatory</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Paid via UPI - UTR 428192837192"
                    className="w-full bg-white border-2 border-slate-300 focus:border-[#006064] px-3.5 py-2.5 text-xs font-medium rounded-xs outline-none"
                  />
                  <p className="text-[10px] text-gray-500">
                    Enter the 12-digit UPI UTR number from your payment receipt.
                  </p>
                </div>

                {/* Screenshot Upload (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex justify-between">
                    <span>Attach Payment Screenshot</span>
                    <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                  </label>
                  <label className="cursor-pointer bg-slate-50 border border-slate-300 hover:border-[#006064] hover:bg-white text-slate-700 px-3 py-2 text-xs font-medium rounded-xs transition-all flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Upload size={13} className="text-[#1ab0bc]" />
                      <span className="truncate">{screenshotName || 'Upload Screenshot'}</span>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Submit Booking Button */}
                <button
                  type="button"
                  onClick={handleBookPass}
                  disabled={
                    isSubmitting ||
                    !clientName.trim() ||
                    !clientEmail.trim() ||
                    !remarks.trim() ||
                    (availability ? !availability.isAvailable : false)
                  }
                  className="w-full py-4 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-black uppercase tracking-[0.2em] rounded-xs shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Book Pass Now</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-500 text-center leading-tight">
                  Notification with client &amp; space details will be dispatched immediately to praveen.agarwal1@gmail.com and sales@sspacia.com.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TODAY'S DATE CONFIRMATION MODAL (WEEKLY PASS) ── */}
      <AnimatePresence>
        {showTodayConfirmModal && (
          <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-md w-full p-6 sm:p-7 rounded-sm shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-full shrink-0">
                  <Info size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Confirm Weekly Pass Start Date
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    Are you sure you want to continue with <strong>Today&apos;s date</strong> ({formatDateDisplay(pendingDateForWeekly || '')})?
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xs text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pass Type:</span>
                  <span className="font-bold text-slate-900">Weekly Pass (7 Continuous Days)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Validity:</span>
                  <span className="font-bold text-[#006064]">
                    {formatDateDisplay(pendingDateForWeekly || '')} to {formatDateDisplay(addDaysToString(pendingDateForWeekly || '', 6))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelTodayDate}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
                >
                  Choose Another Date
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTodayDate}
                  className="px-5 py-2 bg-[#006064] hover:bg-[#004d40] text-white text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer shadow-sm"
                >
                  Yes, Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SHORT-TERM AGREEMENT PREVIEW MODAL ── */}
      <ShortTermAgreementModal
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        data={agreementData}
        onConfirmSign={() => setRequestAgreement(true)}
        isSigned={false}
      />

      {/* ── QUICK AUTH MODAL ── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign In to Save Booking"
        message="Log in so this pass is automatically linked to your SSPACIA customer dashboard."
        onSuccess={() => {
          setIsAuthModalOpen(false);
          toast.success('Signed in successfully!');
        }}
      />
    </div>
  );
}
