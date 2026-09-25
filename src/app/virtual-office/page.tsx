import { Metadata } from 'next';
import { seoConfig } from '@/config/seo';
import { StructuredData } from '@/components/structured-data';
import VirtualOfficeClient from './virtual-office-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Virtual Office in Ahmedabad | Prestigious Business Address & Mail Handling | SSPACIA',
  description:
    'Get a prestigious business address for company correspondence and commercial presence across 3 prime Ahmedabad centres: Agarwal Complex (CG Road), Mercado (CG Road) & Premier House (SG Highway). Fixed ₹24,000/year for business address usage.',
  keywords: [
    'Virtual Office Ahmedabad',
    'Business Address Ahmedabad',
    'Mailing Address Ahmedabad',
    'Virtual Office CG Road',
    'Virtual Office SG Highway',
    'Commercial Address Ahmedabad',
    'SSPACIA Virtual Office',
  ],
  alternates: {
    canonical: `${seoConfig.baseUrl}/virtual-office`,
  },
  openGraph: {
    title: 'Virtual Office in Ahmedabad | Prestigious Business Address | SSPACIA',
    description:
      'Prestigious business address in Ahmedabad across 3 prime centres. Professional mailing presence, courier receiving, and on-demand meeting rooms at ₹24,000/year.',
    url: `${seoConfig.baseUrl}/virtual-office`,
    siteName: seoConfig.siteName,
    images: [
      {
        url: `${seoConfig.baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'SSPACIA Virtual Office Ahmedabad',
      },
    ],
    type: 'website',
    locale: 'en_IN',
  },
};

export default function VirtualOfficePage() {
  const virtualOfficeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SSPACIA Virtual Office (Business Address Usage)',
    description:
      'Prestigious commercial business address across 3 prime Ahmedabad centres (Agarwal Complex CG Road, Mercado CG Road, Premier House SG Highway) for business correspondence and mail receiving. Fixed ₹24,000/year.',
    offers: {
      '@type': 'Offer',
      price: '24000',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
    brand: {
      '@type': 'Brand',
      name: 'SSPACIA',
    },
  };

  return (
    <>
      <StructuredData data={virtualOfficeSchema} />
      <VirtualOfficeClient />
    </>
  );
}
