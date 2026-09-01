import React, { Suspense } from 'react';
import { TerminationsClient } from '@/app/admin/client-master/terminations/terminations-client';

export const metadata = {
  title: 'Termination Checklist & Handover | SSPACIA Community Manager',
  description: 'Centre-scoped termination checklist, closure forms, and settlement pipeline.',
};

export default function ManagerTerminationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-bold text-gray-500">Loading Termination Hub...</div>}>
      <TerminationsClient isManagerView={true} />
    </Suspense>
  );
}
