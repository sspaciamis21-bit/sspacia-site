import React, { Suspense } from 'react';
import { FinancialsClient } from './financials-client';

export const metadata = {
  title: 'Financial Intelligence & Profitability | SSPACIA Super Admin',
  description: 'Executive Centre-wise Revenue, Operational Expenses, and Gross Profit P&L Analytics.',
};

export default function FinancialsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-bold text-gray-500">Loading Financial Intelligence...</div>}>
      <FinancialsClient />
    </Suspense>
  );
}
