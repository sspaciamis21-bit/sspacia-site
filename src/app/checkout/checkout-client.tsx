"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Extend Window to include Razorpay
declare global {
  interface Window {
    Razorpay: unknown;
  }
}

interface Product {
  id: number;
  name: string;
  location: { name: string };
  pricingPlans: Array<{ type: string; price: string; [key: string]: unknown }>;
  images: Array<{ url: string;[key: string]: unknown }>;
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" });

  // URL Params
  const productId = searchParams?.get("productId") || null;
  const date = searchParams?.get("date") || null;
  const slotsFromUri = searchParams?.get("slots")?.split(",") || [];
  const slots = slotsFromUri.filter(Boolean);

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

  const handleApplyDiscount = () => {
    if (discountCode.toUpperCase() === 'WELCOME10') {
      setDiscountAmount(subTotal * 0.1);
      toast.success("Discount code applied!");
    } else {
      setDiscountAmount(0);
      toast.error("Invalid discount code");
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to continue");
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast.error("Please fill in billing information");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/admin/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          date,
          slots,
          discountCode: discountCode.toUpperCase(),
          userId: user.id,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email
        }),
      });

      const orderData = await response.json();

      if (!response.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder', 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SSPACIA Coworking",
        description: `Booking for ${product?.name}`,
        order_id: orderData.orderId,
        handler: async function (response: { razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature: string }) {
          try {
            const verifyRes = await fetch("/api/admin/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_sim_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || 'simulated_test_sig',
                bookingId: orderData.bookingId
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              toast.success("Payment successful! Booking confirmed.");
              router.push("/booking/success");
            } else {
              toast.error(verifyData.error || "Payment verification failed");
              router.push("/booking/failed");
            }
          } catch (err) {
            console.error(err);
            toast.error("Error verifying payment");
            router.push("/booking/failed");
          }
        },
        prefill: {
          name: customerInfo.name,
          email: customerInfo.email,
          contact: customerInfo.phone || (user as any)?.phone || (user as any)?.contactNumber || "",
        },
        theme: {
          color: "#083329",
        },
      };

      const RazorpayConstructor = window.Razorpay as new (options: unknown) => { 
        on: (event: string, handler: (response: { error: { description: string } }) => void) => void;
        open: () => void;
      };
      const rzp1 = new RazorpayConstructor(options);
      rzp1.on("payment.failed", function (response: { error: { description: string } }) {
        toast.error(`Payment failed: ${response.error.description}`);
        router.push("/booking/failed");
      });
      rzp1.open();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to initiate payment");
      } else {
        toast.error("Failed to initiate payment");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const subTotal = useMemo(() => {
    if (!product || !slots.length) return 0;
    // Find hourly rate or default to first plan
    const hourlyPlan = product.pricingPlans.find(p => p.type?.toLowerCase().includes("hour")) || product.pricingPlans[0];
    const hourlyRate = parseFloat(hourlyPlan?.price || "0");
    return hourlyRate * slots.length;
  }, [product, slots]);

  const sgst = subTotal * 0.09;
  const cgst = subTotal * 0.09;
  const igst = 0;
  const total = subTotal + sgst + cgst + igst - discountAmount;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen flex flex-col items-center justify-center">Product not found.</div>;

  const productImage = product.images?.[0]?.url || "/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg";

  return (
    <div className="min-h-screen bg-surface py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/products/${productId}`}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary hover:text-primary transition-colors mb-12"
        >
          <ChevronLeft className="h-4 w-4" /> Return to Space
        </Link>

        <motion.div
          className="grid lg:grid-cols-12 gap-12 items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

          <div className="lg:col-span-8 space-y-8">
            <section className="bg-white border border-outline-variant/10 p-10 shadow-sm transition-shadow">
              <h1 className="font-display text-4xl font-bold tracking-tighter text-[#1b1c1c] mb-10">
                Confirm your Booking
              </h1>

              <div className="flex flex-col md:flex-row gap-8 pb-10 border-b border-outline-variant/10 mb-10">
                <div className="relative w-full md:w-56 aspect-[4/3] overflow-hidden border border-outline-variant/10">
                  <Image src={productImage} alt={product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-[#1b1c1c] tracking-tighter">{product.name}</h2>
                    <p className="text-sm text-tertiary flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4 text-primary" /> {product.location.name}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-surface-low/50 p-4 border border-outline-variant/10 flex items-center gap-3">
                      <div className="h-10 w-10 bg-white flex items-center justify-center shadow-sm">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-tertiary tracking-widest">Date</p>
                        <p className="text-xs font-bold text-[#1b1c1c]">{date}</p>
                      </div>
                    </div>
                    <div className="bg-surface-low/50 p-4 border border-outline-variant/10 flex items-center gap-3">
                      <div className="h-10 w-10 bg-white flex items-center justify-center shadow-sm">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase font-bold text-tertiary tracking-widest">Duration</p>
                        <p className="text-xs font-bold text-[#1b1c1c]">
                          {slots.length > 0 ? `${slots[0]} - ${slots[slots.length - 1]} (${slots.length}hrs)` : "Not Selected"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-tertiary">Billing Information</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-5 py-4 text-sm outline-none focus:border-primary/30 focus:bg-white" 
                      placeholder="John Doe" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-5 py-4 text-sm outline-none focus:border-primary/30 focus:bg-white" 
                      placeholder="john@example.com" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-tertiary uppercase ml-1">Mobile</label>
                    <input 
                      type="tel" 
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      className="w-full bg-surface-low/30 border border-outline-variant/20 px-5 py-4 text-sm outline-none focus:border-primary/30 focus:bg-white" 
                      placeholder="+91 00000 00000" 
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-outline-variant/10 p-10 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-tertiary mb-8">Payment Method</h3>
              <div className="border border-primary bg-primary/5 p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 bg-white flex items-center justify-center shadow-sm text-primary">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#1b1c1c]">Instant Payment Gateway</p>
                    <p className="text-[11px] text-tertiary">Secure transaction powered by Stripe / Razorpay</p>
                  </div>
                </div>
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
            </section>
          </div>

          {/* ── Order Summary (Right Column) ── */}
          <div className="lg:col-span-4 sticky top-32">
            <div className="bg-white border border-outline-variant/10 p-10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />

              <h2 className="font-display text-3xl font-bold tracking-tighter text-[#1b1c1c] mb-10 relative z-10">
                Order Summary
              </h2>

              <div className="space-y-6 relative z-10">
                <div className="space-y-4 pb-6 border-b border-outline-variant/10 text-sm">
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
                  <div className="flex justify-between items-center text-[#1b1c1c]">
                    <span className="text-tertiary font-medium">IGST (0%)</span>
                    <span className="font-bold">₹{igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-primary">
                      <span className="font-bold">Discount</span>
                      <span className="font-bold">-₹{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 pb-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tertiary">Total Amount</span>
                  <div className="text-4xl font-display font-bold text-primary tracking-tighter">
                    ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="flex-1 bg-surface-low/30 border border-outline-variant/10 px-4 py-3 text-xs outline-none focus:bg-white"
                      placeholder="PROMOCODE"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      className="bg-surface-low border border-outline-variant/10 text-tertiary px-4 text-[9px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-surface-low/30 p-4 border border-outline-variant/5">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <p className="text-[10px] leading-tight text-tertiary font-medium">
                    Secure 256-bit SSL encrypted transaction with industry standard safety.
                  </p>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-primary text-white py-5 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary-container transition-all shadow-xl shadow-primary/20 active:scale-[0.98] cursor-pointer mt-4 disabled:opacity-50"
                >
                  {isProcessing ? "Processing..." : "Confirm & Pay Total"}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-tertiary text-center mt-8 px-8 leading-relaxed">
              By clicking &quot;Confirm &amp; Pay&quot;, you agree to SSPACIA&apos;s <Link href="/terms" className="underline">Terms</Link> and <Link href="/policy" className="underline">Booking Policy</Link>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
