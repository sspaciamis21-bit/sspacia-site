'use client';
import { motion } from 'motion/react';
import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function BookingFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface w-full p-6">
       <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white p-12 text-center shadow-lg rounded-2xl max-w-lg border border-outline-variant/10 w-full">
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-display font-bold text-[#1b1c1c] mb-4">Payment Failed</h1>
          <p className="text-tertiary mb-8">We could not process your payment at this time. Please try again or contact support if the issue persists.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Link href="/dashboard" className="bg-black text-white px-8 py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl shadow-black/20 hover:scale-[1.02] transition-transform">
                Go to Dashboard
             </Link>
             <Link href="/contact" className="bg-surface-low text-tertiary px-8 py-3 rounded-xl font-bold text-sm tracking-wide hover:bg-surface-high border border-outline-variant/10 hover:scale-[1.02] transition-transform">
                Contact Support
             </Link>
          </div>
       </motion.div>
    </div>
  )
}
