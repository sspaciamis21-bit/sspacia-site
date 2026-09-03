'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Clock, 
  CreditCard, 
  Search, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Filter,
  Trash2,
  AlertTriangle
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
  customer: { name: string; email: string };
  product: { name: string; location: { id: number; name: string } };
  status: { name: string; displayName: string };
  payments: Array<{ method: string }>;
}

export default function AdminBookingsPage() {
  const [activeTab, setActiveTab] = useState<'QR' | 'ALL'>('QR');
  const [qrBookings, setQrBookings] = useState<QrBookingItem[]>([]);
  const [bookings, setBookings] = useState<StandardBooking[]>([]);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Super Admin Delete Modal State
  const [deleteModalData, setDeleteModalData] = useState<{
    id: number;
    bookingNumber: string;
    customerName: string;
    customerEmail?: string;
    productName?: string;
    grandTotal?: number | string;
    isQr: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [qrRes, bkRes, locRes] = await Promise.all([
        fetch('/api/admin/qr-bookings'),
        fetch('/api/admin/bookings'),
        fetch('/api/admin/locations'),
      ]);

      const qrJson = await qrRes.json();
      const bkJson = await bkRes.json();
      const locJson = await locRes.json();

      if (qrJson.data) setQrBookings(qrJson.data);
      if (bkJson.data) setBookings(bkJson.data);
      if (locJson.data) setLocations(locJson.data);
    } catch {
      toast.error('Failed to load global booking logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteBooking = async () => {
    if (!deleteModalData) return;
    setIsDeleting(true);
    try {
      const url = deleteModalData.isQr
        ? `/api/admin/qr-bookings/${deleteModalData.id}`
        : `/api/admin/bookings/${deleteModalData.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete booking');
      }

      toast.success(json.message || `Booking ${deleteModalData.bookingNumber} deleted permanently`);
      setDeleteModalData(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting booking');
    } finally {
      setIsDeleting(false);
    }
  };


  const handleApproveQr = async (id: number) => {
    setProcessingId(id);
    const tid = toast.loading('Authorizing payment and confirming reservation...');
    try {
      const res = await fetch(`/api/admin/qr-bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast.success('QR Booking approved and reserved.', { id: tid });
      loadData();
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

      toast.success('QR Booking rejected.', { id: tid });
      setRejectModalId(null);
      setRejectReason('');
      loadData();
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
      const matchesLoc = selectedLocationId === 'ALL' || String(q.locationId) === selectedLocationId;
      const qSearch = searchQuery.toLowerCase();
      const matchesSearch = 
        q.bookingNumber.toLowerCase().includes(qSearch) ||
        q.customerName.toLowerCase().includes(qSearch) ||
        q.customerEmail.toLowerCase().includes(qSearch) ||
        q.productName.toLowerCase().includes(qSearch) ||
        q.locationName.toLowerCase().includes(qSearch);

      return matchesLoc && matchesSearch;
    });
  }, [qrBookings, selectedLocationId, searchQuery]);

  const filteredStandardBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesLoc = selectedLocationId === 'ALL' || (b.product?.location?.id && String(b.product.location.id) === selectedLocationId);
      const bSearch = searchQuery.toLowerCase();
      const matchesSearch =
        b.bookingNumber.toLowerCase().includes(bSearch) ||
        b.customer.name.toLowerCase().includes(bSearch) ||
        b.customer.email.toLowerCase().includes(bSearch) ||
        b.product.name.toLowerCase().includes(bSearch);

      return matchesLoc && matchesSearch;
    });
  }, [bookings, selectedLocationId, searchQuery]);

  return (
    <div className="space-y-10 pb-20 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-white text-[#1ab0bc] flex items-center justify-center border border-gray-200 shadow-md">
            <Briefcase size={32} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">
              Global Activity &amp; Bookings
            </h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-70">
              Super Admin oversight across all SSPACIA centers
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
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

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'ALL'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Activity Logs ({bookings.length})
          </button>
        </div>
      </div>

      {/* Modern Toolbar (Search + Center Filter) */}
      <div className="bg-white border border-gray-200 p-3 flex flex-col md:flex-row items-stretch gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="FILTER BY ID, CUSTOMER, EMAIL, OR ASSET..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border border-gray-200 text-xs font-bold uppercase tracking-wider text-[#1B1C1C] placeholder:text-gray-400 outline-none focus:border-[#1ab0bc]"
          />
        </div>

        {/* Center / Location Filter */}
        <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 border border-gray-200">
          <Filter size={14} className="text-gray-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-600 shrink-0">Center:</span>
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="bg-transparent text-xs font-bold uppercase text-gray-900 outline-none cursor-pointer"
          >
            <option value="ALL">All Centers (Global)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={String(loc.id)}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'QR' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-4">
            <div className="flex items-center gap-3">
              <QrCode className="h-5 w-5 text-[#1ab0bc]" />
              <p className="text-xs font-bold text-gray-800">
                Super Admin QR Gateway: Verify UPI QR payments, inspect payment screenshots, and approve reservations for any center.
              </p>
            </div>
            <span className="text-xs font-black text-[#1ab0bc] uppercase tracking-wider">
              {filteredQrBookings.length} Submissions
            </span>
          </div>

          {loading ? (
            <div className="min-h-[350px] flex flex-col items-center justify-center bg-white border border-gray-200 gap-4">
              <Loader2 size={36} className="text-[#1ab0bc] animate-spin" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Scanning QR Transactions...</p>
            </div>
          ) : filteredQrBookings.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-white border border-gray-200 p-12 text-center">
              <QrCode size={40} className="text-gray-300 mb-3" />
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">No QR Bookings Found</p>
              <p className="text-xs text-gray-500 mt-1">No activity matches the current center or search filters.</p>
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
                      {/* Left Block */}
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
                              Pending Verification
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
                          <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Space &amp; Center</p>
                            <p className="text-sm font-bold text-gray-900">{qr.productName}</p>
                            <p className="text-xs font-bold text-[#1ab0bc] flex items-center gap-1">
                              <MapPin size={11} /> {qr.locationName}
                            </p>
                          </div>

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

                      {/* Right Block */}
                      <div className="lg:w-72 flex flex-col justify-between items-start lg:items-end gap-6 lg:pl-6 lg:border-l border-gray-200">
                        <div className="text-left lg:text-right space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Amount</p>
                          <p className="text-2xl font-display font-black text-[#1ab0bc]">
                            ₹{parseFloat(qr.grandTotal.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Screenshot Proof */}
                        {qr.screenshotData ? (
                          <div className="space-y-1.5 w-full">
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Payment Screenshot:</p>
                            <button
                              type="button"
                              onClick={() => setSelectedScreenshot(qr.screenshotData)}
                              className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-teal-50 border border-gray-300 hover:border-[#1ab0bc] p-2 text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                            >
                              <Eye size={14} className="text-[#1ab0bc]" />
                              <span>Inspect Proof</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic">No Screenshot Attached</div>
                        )}

                        {/* Actions */}
                        <div className="w-full flex flex-col gap-2 pt-2">
                          {qr.status === 'PENDING' && (
                            <>
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
                                    <span>Authorize &amp; Reserve</span>
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
                            </>
                          )}

                          {qr.status === 'APPROVED' && (
                            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 border border-emerald-200 text-center">
                              ✓ Confirmed &amp; Reserved
                            </div>
                          )}

                          {qr.status === 'REJECTED' && (
                            <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-3 py-1.5 border border-rose-200 text-center">
                              ✕ Rejected
                            </div>
                          )}

                          {/* Super Admin Delete Booking Option */}
                          <button
                            type="button"
                            onClick={() => setDeleteModalData({
                              id: qr.id,
                              bookingNumber: qr.bookingNumber,
                              customerName: qr.customerName,
                              customerEmail: qr.customerEmail,
                              productName: qr.productName,
                              grandTotal: qr.grandTotal,
                              isQr: true,
                            })}
                            className="w-full bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-400 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Trash2 size={12} className="text-rose-500" />
                            <span>Delete Record</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      ) : (
        /* ── ALL ACTIVITY LOGS TABLE ── */
        <div className="bg-white border border-gray-200 shadow-xl overflow-hidden">
          {loading ? (
            <div className="px-10 py-32 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 text-[#1ab0bc] animate-spin mb-4" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Scanning History...</p>
            </div>
          ) : filteredStandardBookings.length === 0 ? (
            <div className="px-10 py-32 text-center">
              <Briefcase size={40} className="mx-auto mb-4 text-gray-300" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No activity logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Log Entry / UID</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Space &amp; Center</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Schedule</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredStandardBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-[#1ab0bc]">{b.bookingNumber}</span>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(b.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{b.customer.name}</span>
                        <p className="text-[10px] text-gray-500">{b.customer.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{b.product.name}</span>
                        <p className="text-[10px] text-gray-500">{b.product.location.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{new Date(b.startDate).toLocaleDateString()}</span>
                        <p className="text-[10px] text-gray-500">{b.startTime} - {b.endTime}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            b.status.name === 'CONFIRMED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {b.status.displayName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-gray-900">₹{parseFloat(b.grandTotal.toString()).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteModalData({
                            id: b.id,
                            bookingNumber: b.bookingNumber,
                            customerName: b.customer.name,
                            customerEmail: b.customer.email,
                            productName: b.product.name,
                            grandTotal: b.grandTotal,
                            isQr: false,
                          })}
                          title="Delete booking permanently (Super Admin)"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[9.5px] font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
                        >
                          <Trash2 size={12} className="text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Super Admin Permanent Delete Confirmation Modal */}
      {deleteModalData && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white max-w-lg w-full shadow-2xl rounded-sm border border-rose-300 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-gray-900">
                  Delete Booking Record
                </h3>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
                  Super Admin Authorization Required
                </span>
              </div>
            </div>

            {/* Target Booking Info Card */}
            <div className="bg-neutral-50 p-4 border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-neutral-200 pb-1.5">
                <span className="text-gray-500 font-bold uppercase text-[9.5px]">Booking UID:</span>
                <span className="font-mono font-bold text-[#006064] text-sm">{deleteModalData.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold uppercase text-[9.5px]">Customer:</span>
                <span className="font-bold text-gray-900">{deleteModalData.customerName}</span>
              </div>
              {deleteModalData.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9.5px]">Email:</span>
                  <span className="text-gray-700">{deleteModalData.customerEmail}</span>
                </div>
              )}
              {deleteModalData.productName && (
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[9.5px]">Space &amp; Center:</span>
                  <span className="font-bold text-gray-800">{deleteModalData.productName}</span>
                </div>
              )}
              {deleteModalData.grandTotal && (
                <div className="flex justify-between border-t border-neutral-200 pt-1.5">
                  <span className="text-gray-500 font-bold uppercase text-[9.5px]">Total Amount:</span>
                  <span className="font-bold text-[#006064]">₹{parseFloat(deleteModalData.grandTotal.toString()).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Detailed "What Will Happen" Explanations */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 block">
                What will happen after permanent deletion:
              </span>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="p-2.5 bg-rose-50 border-l-4 border-rose-500 space-y-1">
                  <p className="font-bold text-rose-900 flex items-center gap-1.5">
                    <span>🚫</span> <span>Hidden from External Customer:</span>
                  </p>
                  <p className="text-[11px] text-rose-800 leading-snug">
                    This booking will be completely removed from the customer&apos;s portal (`/dashboard/bookings`). The user will no longer see this reservation, invoice, or status.
                  </p>
                </div>

                <div className="p-2.5 bg-emerald-50 border-l-4 border-emerald-500 space-y-1">
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>🔓</span> <span>Inventory &amp; Time Slot Released:</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    The reserved date/time slot (or dedicated workspace/cabin unit) will instantly unlock and become available for other customers to book on the website.
                  </p>
                </div>

                <div className="p-2.5 bg-amber-50 border-l-4 border-amber-500 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>🛑</span> <span>All Automated Processes Terminated:</span>
                  </p>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    Any scheduled reminders, email follow-ups, agreement generation, or payment tracking associated with this booking will immediately stop.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalData(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-center"
              >
                Keep Booking (Do Not Delete)
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteBooking}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 text-center"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Yes, Permanently Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
              Please enter the reason for rejecting this booking.
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
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={handleRejectQr}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
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
                className="text-gray-500 hover:text-black font-bold text-sm px-2 py-1 cursor-pointer"
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
