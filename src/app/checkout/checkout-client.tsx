"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  QrCode,
  Copy,
  Upload,
  Loader2,
  Wifi,
  Coffee,
  Sparkles,
  Wind,
  Check,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/ui/auth-modal";

interface Product {
  id: number;
  name: string;
  location: { name: string; address?: string };
  pricingPlans: Array<{ type: string; price: string; [key: string]: unknown }>;
  images: Array<{ url: string;[key: string]: unknown }>;
  capacity?: string | number;
  accessTime?: string;
  amenities?: Array<{
    amenity: {
      id: number;
      name: string;
      icon?: string;
    };
  }>;
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" });

  // URL Params
  const productId = searchParams?.get("productId") || null;
  const date = searchParams?.get("date") || null;
  const slotsFromUri = searchParams?.get("slots")?.split(",") || [];
  const slots = slotsFromUri.filter(Boolean);

  // Extract all valid image URLs for the product
  const productImages: string[] = useMemo(() => {
    if (!product) return ["/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"];
    const list: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img: any) => {
        const url = typeof img === "string" ? img : img?.url;
        if (url && typeof url === "string" && url.trim()) list.push(url.trim());
      });
    }
    return list.length > 0 ? list : ["/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"];
  }, [product]);

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isHoveredImg, setIsHoveredImg] = useState(false);

  // Auto-swipe images every 3 seconds if multiple images exist
  useEffect(() => {
    if (productImages.length <= 1 || isHoveredImg || isImageModalOpen) return;
    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % productImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [productImages.length, isHoveredImg, isImageModalOpen]);

  // Format Duration string e.g. "15:00 - 16:00 (1 hr)" instead of "15:00 - 15:00 (1hrs)"
  const formatDuration = (slotList: string[]) => {
    if (!slotList || slotList.length === 0) return "Not Selected";
    const startSlot = slotList[0];
    const lastSlot = slotList[slotList.length - 1];

    const [lastHourStr, lastMinStr] = lastSlot.split(":");
    const lastHour = parseInt(lastHourStr, 10);
    const lastMin = lastMinStr || "00";

    const endHour = (lastHour + 1) % 24;
    const formattedEnd = `${String(endHour).padStart(2, "0")}:${lastMin}`;

    const hrsText = slotList.length === 1 ? "1 hr" : `${slotList.length} hrs`;
    return `${startSlot} - ${formattedEnd} (${hrsText})`;
  };

  useEffect(() => {
    if (productId) {
      fetch(`/api/public/products/${productId}`)
        .then((res) => res.json())
        .then((resp) => {
          setProduct(resp.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Fetch error:", err);
          setLoading(false);
        });
    }
  }, [productId]);

  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || user.contactNumber || ""
      });
    }
  }, [user]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    try {
      const res = await fetch("/api/public/promocodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode.trim().toUpperCase(),
          subTotal,
        }),
      });

      const json = await res.json();
      if (res.ok && json.valid) {
        setDiscountAmount(json.discountAmount || 0);
        toast.success(json.message || `Promo code "${json.code}" applied!`);
      } else {
        setDiscountAmount(0);
        toast.error(json.error || "Invalid promo code");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error checking promo code");
    }
  };

  const [remarks, setRemarks] = useState("");
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText("MSSPACIAINDIAPRIVATELIMITED.eazypay@icici");
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot file size must be under 5MB");
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
      toast.success("Payment screenshot attached successfully");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handlePayment = async () => {
    if (!user) {
      toast.info("Please sign in or create an account to complete your booking.");
      setIsAuthModalOpen(true);
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast.error("Please fill in your billing information (Name & Email)");
      return;
    }

    if (!remarks.trim()) {
      toast.error("Please enter Payment Remarks / UTR / Reference ID (Mandatory)");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/admin/qr-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          date,
          slots,
          discountCode: discountCode.toUpperCase(),
          customerName: customerInfo.name.trim(),
          customerEmail: customerInfo.email.trim(),
          customerPhone: customerInfo.phone.trim(),
          remarks: remarks.trim(),
          screenshotData: screenshotData || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit booking");
      }

      toast.success("QR Payment submitted! Our Community Manager will verify and confirm your booking.");
      router.push("/dashboard/bookings");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Failed to submit payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const subTotal = useMemo(() => {
    if (!product || !slots.length) return 0;
    const hourlyPlan = product.pricingPlans.find(p => p.type?.toLowerCase().includes("hour")) || product.pricingPlans[0];
    const hourlyRate = parseFloat(hourlyPlan?.price || "0");
    return hourlyRate * slots.length;
  }, [product, slots]);

  const sgst = subTotal * 0.09;
  const cgst = subTotal * 0.09;
  const igst = 0;
  const total = Math.max(0, subTotal + sgst + cgst + igst - discountAmount);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen flex flex-col items-center justify-center">Product not found.</div>;

  const productImage = product.images?.[0]?.url || "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg";

  return (
    <div className="min-h-screen bg-surface pt-4 sm:pt-6 pb-12 sm:pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/products/${productId}`}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary hover:text-primary transition-colors mb-3 sm:mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Return to Space
        </Link>

        <motion.div
          className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

          <div className="lg:col-span-8 space-y-8">
            <section className="bg-white border border-outline-variant/10 p-6 sm:p-8 shadow-xs transition-shadow">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tighter text-[#1b1c1c] mb-5">
                Confirm your Booking
              </h1>

              <div className="flex flex-col md:flex-row gap-6 md:gap-8 pb-6 border-b border-outline-variant/10 mb-6">
                {/* ── AUTO-SLIDING MULTI-IMAGE CAROUSEL + EYE PREVIEW ── */}
                <div 
                  onMouseEnter={() => setIsHoveredImg(true)}
                  onMouseLeave={() => setIsHoveredImg(false)}
                  className="relative w-full md:w-60 aspect-[4/3] overflow-hidden border border-outline-variant/15 rounded-xs shrink-0 group bg-gray-100"
                >
                  <Image
                    src={productImages[currentImageIdx] || "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"}
                    alt={`${product.name} photo ${currentImageIdx + 1}`}
                    fill
                    className="object-cover transition-all duration-700 ease-in-out"
                    priority
                  />

                  {/* Indicator Dots if multiple photos */}
                  {productImages.length > 1 && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10 bg-black/45 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      {productImages.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentImageIdx(idx)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            idx === currentImageIdx ? "w-3 bg-[#1ab0bc]" : "w-1.5 bg-white/60 hover:bg-white"
                          }`}
                          title={`Image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Small Eye Icon to View Full Image */}
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-[#1ab0bc] text-white p-1.5 rounded-full shadow-md backdrop-blur-xs transition-all hover:scale-110 flex items-center justify-center cursor-pointer z-10 opacity-90 group-hover:opacity-100"
                    title="View High-Resolution Image"
                  >
                    <Eye size={13} />
                  </button>
                </div>

                <div className="flex-1 space-y-4 md:space-y-5">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-[#1b1c1c] tracking-tighter">{product.name}</h2>
                    <p className="text-xs sm:text-sm text-tertiary flex items-center gap-2 mt-1.5">
                      <MapPin className="h-4 w-4 text-primary shrink-0" /> {product.location.name}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="bg-surface-low/50 p-3.5 border border-outline-variant/10 flex items-center gap-3">
                      <div className="h-9 w-9 bg-white flex items-center justify-center shadow-xs shrink-0 rounded-xs">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-tertiary tracking-widest">Date</p>
                        <p className="text-xs font-bold text-[#1b1c1c]">{date || "Not Selected"}</p>
                      </div>
                    </div>
                    <div className="bg-surface-low/50 p-3.5 border border-outline-variant/10 flex items-center gap-3">
                      <div className="h-9 w-9 bg-white flex items-center justify-center shadow-xs shrink-0 rounded-xs">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-tertiary tracking-widest">Duration</p>
                        <p className="text-xs font-bold text-[#1b1c1c]">
                          {formatDuration(slots)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Space Amenities */}
                  <div className="pt-3 border-t border-outline-variant/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#006064] flex items-center gap-1.5 mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1ab0bc]" />
                      <span>Included Space Amenities</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.amenities && product.amenities.length > 0 ? (
                        product.amenities.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064]/5 border border-[#006064]/15 text-[#004D40] text-xs font-semibold rounded-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#1ab0bc]" />
                            <span>{item.amenity.name}</span>
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064]/5 border border-[#006064]/15 text-[#004D40] text-xs font-semibold rounded-xs">
                            <Wifi className="w-3.5 h-3.5 text-[#1ab0bc]" />
                            <span>High-Speed Wi-Fi</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064]/5 border border-[#006064]/15 text-[#004D40] text-xs font-semibold rounded-xs">
                            <Wind className="w-3.5 h-3.5 text-[#1ab0bc]" />
                            <span>Full Air Conditioning</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064]/5 border border-[#006064]/15 text-[#004D40] text-xs font-semibold rounded-xs">
                            <Coffee className="w-3.5 h-3.5 text-[#1ab0bc]" />
                            <span>Beverages &amp; Water</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006064]/5 border border-[#006064]/15 text-[#004D40] text-xs font-semibold rounded-xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#1ab0bc]" />
                            <span>24/7 Security &amp; Reception Support</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-tertiary">Billing Information</h3>
                <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Full Name *</label>
                    <input 
                      type="text" 
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-4 py-3 text-xs sm:text-sm outline-none focus:border-primary/30 focus:bg-white font-medium" 
                      placeholder="John Doe" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Email Address *</label>
                    <input 
                      type="email" 
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-4 py-3 text-xs sm:text-sm outline-none focus:border-primary/30 focus:bg-white font-medium" 
                      placeholder="john@example.com" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Mobile (+91)</label>
                    <input 
                      type="tel" 
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-4 py-3 text-xs sm:text-sm outline-none focus:border-primary/30 focus:bg-white font-mono" 
                      placeholder="+91 98765 43210" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── ICICI QR CODE PAYMENT SECTION ── */}
            <section className="bg-white border border-outline-variant/10 p-6 sm:p-10 shadow-sm space-y-8">
              <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-[#1ab0bc]/10 text-[#1ab0bc] flex items-center justify-center rounded-sm font-bold">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#1b1c1c]">ICICI Bank UPI QR Payment</h3>
                    <p className="text-[11px] text-tertiary">Scan to pay with any UPI App (GPay, PhonePe, Paytm, BHIM, iMobile)</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 border border-emerald-200">
                  Instant UPI
                </span>
              </div>

              {/* QR Code Container */}
              <div className="grid md:grid-cols-2 gap-8 items-center bg-neutral-50/70 p-6 sm:p-8 border border-neutral-200/80 rounded-sm">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <div className="bg-white p-3 border-2 border-[#1ab0bc] shadow-md rounded-md">
                    <img 
                      src="/qr-codes/sspacia-icici-qr.jpg" 
                      alt="SSPACIA ICICI UPI QR Code"
                      className="w-60 sm:w-64 h-auto object-contain"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-[#1b1c1c]">M/S.SSPACIA INDIA PRIVATE LIMITED</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-tertiary">Amount to Pay</span>
                    <div className="text-3xl font-display font-black text-[#1ab0bc]">
                      ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary">Official UPI ID</span>
                    <div className="flex items-center gap-2 bg-white p-2.5 border border-gray-300 rounded-sm">
                      <span className="font-mono text-xs font-bold text-gray-800 break-all select-all flex-1">
                        MSSPACIAINDIAPRIVATELIMITED.eazypay@icici
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="bg-neutral-100 hover:bg-[#1ab0bc] hover:text-white text-gray-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1 border border-gray-200"
                      >
                        {copiedUpi ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUpi ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-600 bg-white p-3 border border-gray-200 rounded-sm space-y-1">
                    <p className="font-bold text-gray-800">Quick Steps:</p>
                    <p>1. Open GPay / PhonePe / Paytm / BHIM app.</p>
                    <p>2. Scan this QR code &amp; pay exact amount ₹{total.toFixed(2)}.</p>
                    <p>3. Enter your UTR / transaction remarks below &amp; submit.</p>
                  </div>
                </div>
              </div>

              {/* Remarks & Attachment Inputs */}
              <div className="space-y-6 pt-4 border-t border-outline-variant/10">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-800 flex items-center justify-between">
                    <span>1. Payment Remarks / UTR / Reference ID * (Mandatory)</span>
                    <span className="text-[10px] text-rose-600 font-bold lowercase">Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Paid via GPay - UTR 428192837192 / GooglePay ref 41829"
                    className="w-full bg-white border-2 border-gray-300 focus:border-[#1ab0bc] px-4 py-3 text-xs sm:text-sm font-medium outline-none rounded-sm transition-colors"
                  />
                  <p className="text-[10px] text-gray-500">Please provide your 12-digit UPI UTR or bank transaction reference number so our Community Manager can instantly verify.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#1ab0bc]" />
                      <span>2. Attach Payment Screenshot (Optional)</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal lowercase">Optional</span>
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer bg-white border border-gray-300 hover:border-[#1ab0bc] hover:bg-teal-50/40 text-gray-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 shadow-xs">
                      <Upload className="w-4 h-4 text-[#1ab0bc]" />
                      <span>{screenshotName ? "Change Screenshot" : "Upload Screenshot"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                      />
                    </label>
                    {screenshotName && (
                      <span className="text-xs font-mono text-emerald-700 font-bold truncate max-w-xs">
                        ✓ {screenshotName}
                      </span>
                    )}
                  </div>

                  {screenshotData && (
                    <div className="mt-3 relative w-32 h-32 border border-gray-300 rounded-sm overflow-hidden bg-gray-50">
                      <img src={screenshotData} alt="Payment Screenshot Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setScreenshotData(null); setScreenshotName(""); }}
                        className="absolute top-1 right-1 bg-black/75 hover:bg-rose-600 text-white p-1 rounded-full text-xs"
                        title="Remove attachment"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ── Order Summary (Right Column) ── */}
          <div className="lg:col-span-4 sticky top-28">
            <div className="bg-white border border-outline-variant/10 p-6 sm:p-10 shadow-lg relative overflow-hidden group rounded-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />

              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tighter text-[#1b1c1c] mb-8 relative z-10">
                Order Summary
              </h2>

              <div className="space-y-6 relative z-10">
                <div className="space-y-3 pb-6 border-b border-outline-variant/10 text-xs sm:text-sm">
                  <div className="flex justify-between items-center text-[#1b1c1c]">
                    <span className="text-tertiary font-medium">Sub Total</span>
                    <span className="font-bold">₹{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1b1c1c]">
                    <span className="text-tertiary font-medium">SGST (9%)</span>
                    <span className="font-bold">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#1b1c1c]">
                    <span className="text-tertiary font-medium">CGST (9%)</span>
                    <span className="font-bold">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-primary">
                      <span className="font-bold">Discount</span>
                      <span className="font-bold">-₹{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 pb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">Total Amount</span>
                  <div className="text-3xl sm:text-4xl font-display font-bold text-[#1ab0bc] tracking-tighter">
                    ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="space-y-4">
                  {discountAmount > 0 ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-xs text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-emerald-800 uppercase tracking-wider">{discountCode}</span>
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100/90 px-2 py-0.5 rounded-xs">
                          -₹{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Applied
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountAmount(0);
                          setDiscountCode("");
                          toast.info("Promo code removed");
                        }}
                        className="text-gray-400 hover:text-rose-600 font-bold text-xs p-1 cursor-pointer transition-colors"
                        title="Remove promo code"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-surface-low/30 border border-outline-variant/10 px-4 py-2.5 text-xs outline-none focus:bg-white uppercase font-mono"
                        placeholder="PROMOCODE"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyDiscount();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        className="bg-surface-low border border-outline-variant/10 text-tertiary px-4 text-[9px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-surface-low/30 p-3.5 border border-outline-variant/5">
                  <ShieldCheck className="h-5 w-5 text-[#1ab0bc] shrink-0" />
                  <p className="text-[10px] leading-tight text-tertiary font-medium">
                    Verified directly by the SSPACIA Space Community Manager.
                  </p>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-[#1ab0bc] text-white py-4 sm:py-5 text-xs sm:text-[11px] font-black uppercase tracking-[0.2em] hover:bg-teal-600 transition-all shadow-xl shadow-[#1ab0bc]/20 active:scale-[0.98] cursor-pointer mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Payment &amp; Book</span>}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-tertiary text-center mt-6 px-4 leading-relaxed">
              By clicking &quot;Submit Payment&quot;, you agree to SSPACIA&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Booking Policy</Link>.
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── HIGH-RESOLUTION IMAGE LIGHTBOX PREVIEW MODAL ── */}
      {isImageModalOpen && (
        <div 
          onClick={() => setIsImageModalOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[85vh] aspect-[16/10] bg-black rounded-lg overflow-hidden flex items-center justify-center shadow-2xl border border-white/10"
          >
            <Image 
              src={productImages[currentImageIdx] || "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"} 
              alt={product.name} 
              fill 
              className="object-contain" 
              priority
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer z-20"
              title="Close Preview"
            >
              <X size={18} />
            </button>

            {/* Prev / Next controls */}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImageIdx((prev) => (prev - 1 + productImages.length) % productImages.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full backdrop-blur-md transition-transform hover:scale-110 cursor-pointer z-20"
                  title="Previous Image"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImageIdx((prev) => (prev + 1) % productImages.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-full backdrop-blur-md transition-transform hover:scale-110 cursor-pointer z-20"
                  title="Next Image"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
              {currentImageIdx + 1} / {productImages.length}
            </div>
          </div>
        </div>
      )}

      {/* QUICK AUTH POPUP MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign In to Complete Booking"
        message="Log in or register to secure your workspace booking with instant confirmation."
        onSuccess={() => {
          toast.success("Authentication successful! You can now submit your booking.");
        }}
      />
    </div>
  );
}

