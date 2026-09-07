import { Metadata } from 'next';
import { seoConfig } from '@/config/seo';
import { StructuredData } from '@/components/structured-data';
import VirtualOfficeClient from './virtual-office-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Virtual Office in Ahmedabad with GST Registration & ROC Address | SSPACIA',
  description:
    'Get a prestigious business address for GST & MCA company registration across 3 prime Ahmedabad centres: Agarwal Complex (CG Road), Mercado (CG Road) & Premier House (SG Highway). Includes Landlord NOC, electricity bill & mail handling.',
  keywords: [
    'Virtual Office Ahmedabad',
    'GST Registration Address Ahmedabad',
    'Virtual Office CG Road',
    'Virtual Office SG Highway',
    'ROC Registration Office Ahmedabad',
    'Business Address Ahmedabad',
    'SSPACIA Virtual Office',
  ],
  alternates: {
    canonical: `${seoConfig.baseUrl}/virtual-office`,
  },
  openGraph: {
    title: 'Virtual Office in Ahmedabad with GST Registration & ROC Address | SSPACIA',
    description:
      'Prestigious business address in Ahmedabad across 3 prime centres. 100% compliant with Landlord NOC, electricity bill, and courier handling.',
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
    name: 'SSPACIA Virtual Office & GST Registration',
    description:
      'Prestigious business address across 3 prime Ahmedabad centres (Agarwal Complex CG Road, Mercado CG Road, Premier House SG Highway) for GST registration and company incorporation.',
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
