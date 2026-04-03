import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginClient from './login-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Login | SSPACIA',
  description: 'Sign in to your SSPACIA workspace to manage bookings and community access.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[90vh] flex items-center justify-center bg-surface-lowest">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    }>
      <LoginClient />
    </Suspense>
  );
}
