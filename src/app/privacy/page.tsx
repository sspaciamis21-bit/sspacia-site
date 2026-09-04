import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, FileText, CheckCircle } from 'lucide-react';
import { seoConfig } from '@/config/seo';
import { StructuredData } from '@/components/structured-data';

export const metadata: Metadata = {
  title: seoConfig.pages.privacy.title,
  description: seoConfig.pages.privacy.description,
  alternates: { canonical: `${seoConfig.baseUrl}/privacy` },
  openGraph: {
    title: seoConfig.pages.privacy.title,
    description: seoConfig.pages.privacy.description,
    url: `${seoConfig.baseUrl}/privacy`,
    type: "website",
  },
};

export default function PrivacyPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": seoConfig.baseUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Privacy Policy",
        "item": `${seoConfig.baseUrl}/privacy`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface py-16 px-4 md:px-8 max-w-[1200px] mx-auto space-y-12">
      <StructuredData data={breadcrumbSchema} />
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
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-[#1B1C1C]">
              PRIVACY POLICY
            </h1>
            <p className="text-xs text-gray-500 font-mono mt-1">Last Updated: August 2026 // SSPACIA Legal & Compliance</p>
          </div>
        </div>
      </div>

      {/* POLICY CONTENT SECTIONS */}
      <div className="bg-white border border-gray-200 p-8 md:p-12 space-y-8 text-xs text-gray-700 leading-relaxed shadow-sm">
        
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#1ab0bc]" />
            <span>1. Information We Collect</span>
          </h3>
          <p>
            At SSPACIA Coworking Solutions Ltd. ("SSPACIA", "we", "us", "our"), we respect your privacy. When you visit our website, register for workspace tours, book guest meeting rooms, or sign corporate workspace lease agreements, we collect information including:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>Personal Identification Details:</strong> Name, business email address, mobile number, designation, and company name.</li>
            <li><strong>KYC Documents:</strong> Government-issued identity cards (Aadhaar, PAN, Passport) required for statutory tenant verification and security badging.</li>
            <li><strong>Transaction & Payment Details:</strong> Billing records, GSTIN numbers, bank wire UTR references, and invoice transaction histories.</li>
            <li><strong>Digital Interaction Data:</strong> IP addresses, browser cookies, visitor live chat messages, and website navigation analytics.</li>
          </ul>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1ab0bc]" />
            <span>2. How We Use Your Information</span>
          </h3>
          <p>
            The personal and corporate information we collect is strictly used for legitimate business operations:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Facilitating workspace reservations, private cabin leases, and guest meeting room bookings.</li>
            <li>Issuing monthly tax invoices, GST-compliant billing, and payment processing.</li>
            <li>Providing 24/7 access control badges and security management across our Ahmedabad centers (Premier House, Mercado, Agarwal Complex).</li>
            <li>Sending critical operational updates, agreement renewal alerts, and customer support ticket resolution.</li>
          </ul>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#1ab0bc]" />
            <span>3. Data Protection & Confidentiality</span>
          </h3>
          <p>
            SSPACIA enforces strict technical and organizational security measures to protect your personal data against unauthorized access, loss, or disclosure. We do not sell, rent, or trade your personal or business information to third-party advertisers.
          </p>
        </section>

        <section className="space-y-3 pt-6 border-t border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1B1C1C]">4. Contact Legal & Support</h3>
          <p>
            If you have questions regarding this Privacy Policy or wish to exercise your data rights, please contact our legal compliance team:
          </p>
          <div className="bg-neutral-50 p-4 border border-gray-200 text-xs font-mono space-y-1">
            <p><strong>SSPACIA Coworking Solutions Ltd.</strong></p>
            <p>Email: <a href="mailto:sales@sspacia.com" className="text-[#1ab0bc] hover:underline">sales@sspacia.com</a></p>
            <p>Phone: <a href="tel:+917600393779" className="text-[#1ab0bc] hover:underline">+91 76003 93779</a></p>
            <p>Address: Premier House, SG Highway, Bodakdev, Ahmedabad, Gujarat 380054</p>
          </div>
        </section>

      </div>

    </div>
  );
}
