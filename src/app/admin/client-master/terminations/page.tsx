import React, { Suspense } from 'react';
import { TerminationsClient } from './terminations-client';

export const metadata = {
  title: 'Termination Checklist & Clearance Hub | SSPACIA Super Admin',
  description: 'Manage client exit clearance, SDR refund calculations, closure forms, and approvals.',
};

export default function TerminationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-bold text-gray-500">Loading Termination Hub...</div>}>
      <TerminationsClient isManagerView={false} />
    </Suspense>
  );
}
