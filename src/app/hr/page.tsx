import { Metadata } from 'next';
import { HrPortalClient } from './hr-portal-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HR Career & Recruitment Portal | SSPACIA Coworking',
  description: 'HR management portal to manage SSPACIA job openings and candidate applications.',
};

export default function HrPage() {
  return <HrPortalClient />;
}
