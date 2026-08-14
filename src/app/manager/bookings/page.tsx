'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FadeUp } from '@/components/ui/fade-up';
import { 
  Loader2, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ShoppingBag,
  QrCode,
  Eye,
  FileText,
  Calendar,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface QrBookingItem {
  id: number;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  productName: string;
  locationName: string;
  locationId: number;
  startDate: string;
  startTime: string | null;
  endTime: string | null;
  slots: string | null;
  durationUnits: number;
  seats: number;
  grandTotal: number | string;
  remarks: string;
  screenshotData: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  verifiedBy?: { name: string; email: string } | null;
  createdAt: string;
}

interface StandardBooking {
  id: number;
  bookingNumber: string;
  createdAt: string;
  startDate: string;
  startTime: string;
  endTime: string;
  grandTotal: number;
  notes: string | null;
  customer: { name: string; email: string; phone: string | null };
  product: { name: string; location: { name: string } };
  status: { id: number; name: string; displayName: string; color: string | null };
  payments: Array<{ method: string; status: { name: string } }>;
}

export default function ManagerBookingsPage() {
  const [activeTab, setActiveTab] = useState<'QR' | 'PENDING' | 'CONFIRMED' | 'ALL'>('QR');
  const [qrBookings, setQrBookings] = useState<QrBookingItem[]>([]);
  const [standardBookings, setStandardBookings] = useState<StandardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qrRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/qr-bookings'),
        fetch('/api/admin/bookings'),
      ]);

      const qrJson = await qrRes.json();
      const bookingsJson = await bookingsRes.json();

      if (qrJson.data) setQrBookings(qrJson.data);
      if (bookingsJson.data) setStandardBookings(bookingsJson.data);
    } catch {
      toast.error('Failed to load center bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQr = async (id: number) => {
    setProcessingId(id);
    const tid = toast.loading('Verifying payment and confirming space reservation...');
    try {
      const res = await fetch(`/api/admin/qr-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast.success('Booking approved! Space successfully reserved.', { id: tid });
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Error approving booking', { id: tid });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectQr = async () => {
    if (!rejectModalId) return;
    setProcessingId(rejectModalId);
    const tid = toast.loading('Rejecting QR booking...');
    try {
      const res = await fetch(`/api/admin/qr-bookings/${rejectModalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', reason: rejectReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      toast.success('Booking rejected.', { id: tid });
      setRejectModalId(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Error rejecting booking', { id: tid });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingQrCount = useMemo(() => {
    return qrBookings.filter(q => q.status === 'PENDING').length;
  }, [qrBookings]);

  const filteredQrBookings = useMemo(() => {
    return qrBookings.filter(q => {
      const qNum = q.bookingNumber.toLowerCase();
      const qCust = q.customerName.toLowerCase();
      const qEmail = q.customerEmail.toLowerCase();
      const qProd = q.productName.toLowerCase();
      const qSearch = searchQuery.toLowerCase();

      return qNum.includes(qSearch) || qCust.includes(qSearch) || qEmail.includes(qSearch) || qProd.includes(qSearch);
    });
  }, [qrBookings, searchQuery]);

  const filteredStandardBookings = useMemo(() => {
    return standardBookings.filter(b => {
      const matchesTab = activeTab === 'ALL' || b.status.name === activeTab;
      const matchesSearch = b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           b.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           b.product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [standardBookings, activeTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 bg-[#1ab0bc] text-white flex items-center justify-center rounded-none shadow-md">
              <ShoppingBag size={32} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">
                Center Bookings
              </h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-70">
                Community Manager verification &amp; space reservation portal
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-gray-100 p-1 border border-gray-200">
            <button 
              onClick={() => setActiveTab('QR')}
              className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'QR' 
                  ? 'bg-[#1ab0bc] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <QrCode size={14} />
              <span>QR Bookings</span>
              {pendingQrCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingQrCount}
                </span>
              )}
            </button>

            {(['PENDING', 'CONFIRMED', 'ALL'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeTab === tab 
                    ? 'bg-black text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* Search Bar */}
      <FadeUp delay={0.1}>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="FILTER BY BOOKING REF, CUSTOMER NAME, EMAIL, OR SPACE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 pl-14 pr-6 py-4 text-xs font-bold uppercase tracking-wider text-[#1B1C1C] focus:border-[#1ab0bc] outline-none transition-all placeholder:text-gray-400"
          />
        </div>
      </FadeUp>

      {/* ── QR BOOKINGS TAB VIEW ── */}
      {activeTab === 'QR' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-teal-50/70 border border-teal-200 p-4">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-[#1ab0bc]" />
              <p className="text-xs font-bold text-gray-800">
                Incoming UPI QR Submissions for your assigned center(s). Review customer remarks and screenshots to approve reservations.
              </p>
            </div>
            <span className="text-xs font-black text-[#1ab0bc] uppercase tracking-wider">
              {filteredQrBookings.length} Total QR Records
            </span>
          </div>

          {loading ? (
            <div className="min-h-[350px] flex flex-col items-center justify-center bg-white border border-gray-200 gap-4">
              <Loader2 size={36} className="text-[#1ab0bc] animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading QR Bookings...</p>
            </div>
          ) : filteredQrBookings.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-white border border-gray-200 p-12 text-center">
              <QrCode size={40} className="text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">No QR Bookings Found</p>
              <p className="text-xs text-gray-500 mt-1">No QR payments submitted yet for your center.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredQrBookings.map((qr) => (
                  <motion.div
                    key={qr.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-2 border-gray-200 hover:border-[#1ab0bc] transition-all shadow-xs p-6 md:p-8"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      {/* Left Block: Booking & Customer Details */}
                      <div className="flex-1 space-y-6">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                            {qr.bookingNumber}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(qr.createdAt).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {qr.status === 'PENDING' && (
                            <span className="bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Verification Pending
                            </span>
                          )}
                          {qr.status === 'APPROVED' && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Approved &amp; Reserved
                            </span>
                          )}
                          {qr.status === 'REJECTED' && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-300 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                              <XCircle size={12} className="text-rose-600" />
                              Rejected
                            </span>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2 border-t border-gray-100">
                          {/* Space Detail */}
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Space / Asset</p>
                            <p className="text-sm font-bold text-gray-900">{qr.productName}</p>
                            <p className="text-xs font-bold text-[#1ab0bc] flex items-center gap-1">
                              <MapPin size={11} /> {qr.locationName}
                            </p>
                          </div>

                          {/* Date & Slot */}
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Date &amp; Schedule</p>
                            <p className="text-sm font-bold text-gray-900">
                              {new Date(qr.startDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-gray-600">
                              {qr.slots ? `Slots: ${qr.slots}` : `${qr.durationUnits} Unit(s)`}
                            </p>
                          </div>

                          {/* Customer Contact */}
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Customer Details</p>
                            <p className="text-sm font-bold text-gray-900">{qr.customerName}</p>
                            <p className="text-xs text-gray-600 truncate">{qr.customerEmail}</p>
                            {qr.customerPhone && <p className="text-xs text-gray-600 font-mono">{qr.customerPhone}</p>}
                          </div>
                        </div>

                        {/* Customer Remarks Box */}
                        <div className="bg-neutral-50 p-4 border border-neutral-200 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                            Customer Payment Remarks / UTR:
                          </p>
                          <p className="text-xs font-bold text-gray-900 break-words">{qr.remarks}</p>
                        </div>

                        {qr.rejectionReason && (
                          <div className="bg-rose-50 p-3 border border-rose-200 text-xs text-rose-700">
                            <span className="font-bold uppercase">Rejection Reason:</span> {qr.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Right Block: Amount, Screenshot & Actions */}
                      <div className="lg:w-72 flex flex-col justify-between items-start lg:items-end gap-6 lg:pl-6 lg:border-l border-gray-200">
                        <div className="text-left lg:text-right space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Amount</p>
                          <p className="text-2xl font-display font-black text-[#1ab0bc]">
                            ₹{parseFloat(qr.grandTotal.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Screenshot Thumbnail */}
                        {qr.screenshotData ? (
                          <div className="space-y-1.5 w-full">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Payment Screenshot:</p>
                            <button
                              type="button"
                              onClick={() => setSelectedScreenshot(qr.screenshotData)}
                              className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-teal-50 border border-gray-300 hover:border-[#1ab0bc] p-2 text-xs font-bold text-gray-800 transition-colors"
                            >
                              <Eye size={14} className="text-[#1ab0bc]" />
                              <span>View Proof Image</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">No Screenshot Attached</div>
                        )}

                        {/* Action Buttons */}
                        {qr.status === 'PENDING' && (
                          <div className="w-full flex flex-col gap-2 pt-2">
                            <button
                              type="button"
                              disabled={processingId === qr.id}
                              onClick={() => handleApproveQr(qr.id)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              {processingId === qr.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Approve &amp; Reserve</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={processingId === qr.id}
                              onClick={() => {
                                setRejectModalId(qr.id);
                                setRejectReason('');
                              }}
                              className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 py-2 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {qr.status === 'APPROVED' && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 border border-emerald-200">
                            ✓ Space Slot Reserved
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        /* ── STANDARD BOOKINGS TAB VIEW ── */
        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="min-h-[350px] flex flex-col items-center justify-center bg-white border border-gray-200 gap-4">
              <Loader2 size={36} className="text-[#1ab0bc] animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading Bookings...</p>
            </div>
          ) : filteredStandardBookings.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-white border border-gray-200 p-12 text-center">
              <ShoppingBag size={40} className="text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">No Activity Logs Found</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredStandardBookings.map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 hover:border-gray-400 transition-all p-6 md:p-8"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{b.bookingNumber}</span>
                        <span className="text-[10px] font-bold text-gray-400">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            b.status.name === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {b.status.displayName}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{b.product.name}</p>
                          <p className="text-xs text-gray-500">{b.product.location.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{b.customer.name}</p>
                          <p className="text-xs text-gray-500">{b.customer.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-xl font-display font-black text-gray-900">
                        ₹{Math.round(b.grandTotal).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-md w-full shadow-2xl rounded-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900">
              Reject QR Booking
            </h3>
            <p className="text-xs text-gray-600">
              Please enter the reason for rejecting this booking (e.g. UTR mismatch, payment not received in account).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction ID not found in bank statement..."
              className="w-full h-24 p-3 border border-gray-300 text-xs outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={handleRejectQr}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div 
            className="bg-white p-4 max-w-2xl max-h-[90vh] overflow-auto shadow-2xl rounded-sm relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b mb-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                Customer Payment Screenshot Proof
              </h3>
              <button 
                onClick={() => setSelectedScreenshot(null)}
                className="text-gray-500 hover:text-black font-bold text-sm px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <img src={selectedScreenshot} alt="Payment Receipt Proof" className="w-full h-auto object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
