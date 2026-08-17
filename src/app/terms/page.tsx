import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft, ShieldCheck, Scale, AlertCircle } from 'lucide-react';
import { seoConfig } from '@/config/seo';

export const metadata: Metadata = {
  title: `Terms of Service | SSPACIA Coworking`,
  description: `Terms of service and workspace membership agreement guidelines for SSPACIA Coworking Solutions Ltd.`,
  alternates: { canonical: `${seoConfig.baseUrl}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface py-16 px-4 md:px-8 max-w-[1200px] mx-auto space-y-12">
      
      {/* TOP BACK BUTTON & HEADER */}
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1ab0bc] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-3 pt-4">
          <div className="w-12 h-12 rounded-full bg-[#1ab0bc]/10 text-[#1ab0bc] flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-[#1B1C1C]">
              TERMS OF SERVICE
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Last Updated: August 2026 // SSPACIA Workspace Terms</p>
          </div>
        </div>
      </div>

      {/* TERMS CONTENT SECTIONS */}
      <div className="bg-white border border-gray-200 p-8 md:p-12 space-y-8 text-xs text-gray-700 leading-relaxed shadow-sm">
        
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1ab0bc]" />
            <span>1. Acceptance of Terms & Membership Scope</span>
          </h3>
          <p>
            By accessing SSPACIA websites, reserving desk spaces, booking guest meeting rooms, or signing membership contracts across our centers (Premier House, Mercado, Agarwal Complex), you agree to be bound by these Terms of Service.
          </p>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1ab0bc]" />
            <span>2. Workspace Rules & Conduct</span>
          </h3>
          <p>
            Members and guests agree to maintain a professional workspace environment:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>Noise & Etiquette:</strong> Keep phone conversations and discussions at reasonable volumes in shared open workspace zones.</li>
            <li><strong>Access Controls:</strong> RFID access badges and keycards are non-transferable. Visitors must register at the Community Desk.</li>
            <li><strong>Property Care:</strong> Erase whiteboards after meeting room use and maintain cleanliness in community lounge areas.</li>
          </ul>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#1ab0bc]" />
            <span>3. Billing, Renewals & Cancellation</span>
          </h3>
          <p>
            Monthly workspace rents are payable in advance on or before the 1st of each calendar month. Notice periods for membership cancellations must comply with the specific lock-in terms outlined in your signed Client Master Contract.
          </p>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C]">4. Contact Us</h3>
          <div className="bg-neutral-50 p-4 border border-gray-200 text-xs font-mono space-y-1">
            <p><strong>SSPACIA Coworking Solutions Ltd.</strong></p>
            <p>Support: <a href="mailto:sales@sspacia.com" className="text-[#1ab0bc] hover:underline">sales@sspacia.com</a></p>
            <p>Phone: <a href="tel:+917600393779" className="text-[#1ab0bc] hover:underline">+91 76003 93779</a></p>
          </div>
        </section>

      </div>

    </div>
  );
}
