import type { Metadata } from 'next';
import PassesClient from './passes-client';

export const metadata: Metadata = {
  title: 'Daily & Weekly Pass | Flexi Desk Coworking | SSPACIA',
  description:
    'Book instant Daily (₹500+GST) and Weekly (₹4,000+GST) Flexi Desk passes across SSPACIA premium coworking centres in Ahmedabad: Agarwal Complex, Mercado, and Premier House.',
};

export default function PassesPage() {
  return <PassesClient />;
}
