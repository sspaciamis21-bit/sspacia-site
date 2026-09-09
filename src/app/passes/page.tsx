import type { Metadata } from 'next';
import { Suspense } from 'react';
import PassesClient from './passes-client';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily & Weekly Pass | Flexi Desk Coworking | SSPACIA',
  description:
    'Book instant Daily (₹500+GST) and Weekly (₹4,000+GST) Flexi Desk passes across SSPACIA premium coworking centres in Ahmedabad: Agarwal Complex, Mercado, and Premier House.',
};

export default function PassesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#006064] animate-spin" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading Passes...</p>
          </div>
        </div>
      }
    >
      <PassesClient />
    </Suspense>
  );
}
