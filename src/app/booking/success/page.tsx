'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function BookingSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full p-6">
       <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white p-12 text-center shadow-lg rounded-2xl max-w-lg border border-outline-variant/10 w-full">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold text-[#1b1c1c] mb-4">Booking Confirmed!</h1>
          <p className="text-tertiary mb-8">Thank you for your payment. Your booking has been successfully confirmed. You can view your booking details in your dashboard.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link href="/dashboard/bookings" className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                View My Bookings
             </Link>
             <Link href="/" className="bg-surface-low text-tertiary px-8 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-surface-high border border-outline-variant/10 hover:scale-[1.02] transition-transform">
                Back to Home
             </Link>
          </div>
       </motion.div>
    </div>
  )
}
