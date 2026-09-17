'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { InvoicePaymentManagement } from '@/components/admin/invoice-payment-management';

export default function OldInvoicesPage() {
  const { user, isRole } = useAuth();
  const isAdmin = isRole('ADMIN') || isRole('SUPERADMIN') || isRole('SUPER_ADMIN');
  const isAccountant =
    user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
    user?.role?.toUpperCase() === 'ACCOUNTS' ||
    user?.role?.toUpperCase() === 'ACCOUNTANT' ||
    user?.name?.toLowerCase() === 'accounts';

  if (!isAdmin && !isAccountant) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white border border-red-200 shadow-xs text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          ✕
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-600 mb-6">
          Invoice Payment Receive Management and SDR Receive Management are strictly reserved for Accounts &amp; Super Admin only.
        </p>
        <Link
          href="/admin/Invoices"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#002B49] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
        >
          Return to Monthly Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InvoicePaymentManagement
        isSuperAdmin={isAdmin}
        userRoleView="ACCOUNTANT"
        canAccessCM={false}
        canAccessAccountant={true}
        currentUserLocationId={(user as any)?.locationId || (user as any)?.assignedLocations?.[0]?.locationId}
        currentUserLocationName={(user as any)?.location?.name || (user as any)?.assignedLocations?.[0]?.location?.name}
      />
    </div>
  );
}
