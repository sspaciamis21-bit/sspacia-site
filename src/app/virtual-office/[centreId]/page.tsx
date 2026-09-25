import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCentreById, CENTRES } from '../centres-data';
import CentreCheckoutClient from './centre-checkout-client';
import { seoConfig } from '@/config/seo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ centreId: string }>;
}

export async function generateStaticParams() {
  return CENTRES.map((centre) => ({
    centreId: centre.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { centreId } = await params;
  const centre = getCentreById(centreId);

  if (!centre) {
    return {
      title: 'Centre Not Found | SSPACIA Virtual Office',
    };
  }

  return {
    title: `Virtual Office at ${centre.name} (${centre.area}) | Business Address & Mail Handling | SSPACIA`,
    description: `Book your dedicated Virtual Office at SSPACIA ${centre.name}, ${centre.area}, Ahmedabad. Commercial business address usage and front desk mail handling at fixed ₹24,000/year (0% GST).`,
    alternates: {
      canonical: `${seoConfig.baseUrl}/virtual-office/${centre.id}`,
    },
    openGraph: {
      title: `Virtual Office at ${centre.name} | SSPACIA Ahmedabad`,
      description: `Prestigious business address at ${centre.name} (${centre.area}). Courier & mail handling at ₹24,000/year.`,
      url: `${seoConfig.baseUrl}/virtual-office/${centre.id}`,
      siteName: seoConfig.siteName,
      type: 'website',
    },
  };
}

export default async function CentreVirtualOfficePage({ params }: PageProps) {
  const { centreId } = await params;
  const centre = getCentreById(centreId);

  if (!centre) {
    notFound();
  }

  return <CentreCheckoutClient centre={centre} />;
}
