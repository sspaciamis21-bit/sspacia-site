'use client';

import { useAuth } from '@/context/AuthContext';
import { InvoicePaymentManagement } from '@/components/admin/invoice-payment-management';

export default function OldInvoicesPage() {
  const { user, isRole } = useAuth();
  const isAdmin = isRole('ADMIN') || isRole('SUPERADMIN') || isRole('SUPER_ADMIN');
  const isAccountant =
    user?.email?.toLowerCase() === 'ssinfrazone21@gmail.com' ||
    user?.role?.toUpperCase() === 'ACCOUNTS' ||
    user?.role?.toUpperCase() === 'ACCOUNTANT';

  return (
    <div className="space-y-6">
      <InvoicePaymentManagement
        isSuperAdmin={isAdmin}
        userRoleView={isAccountant ? 'ACCOUNTANT' : 'CM'}
        canAccessCM={!isAccountant}
        canAccessAccountant={isAdmin || isAccountant}
        currentUserLocationId={(user as any)?.locationId || (user as any)?.assignedLocations?.[0]?.locationId}
        currentUserLocationName={(user as any)?.location?.name || (user as any)?.assignedLocations?.[0]?.location?.name}
      />
    </div>
  );
}
