import { Metadata } from 'next';
import { Suspense } from 'react';
import SignupClient from './signup-client';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign Up | SSPACIA',
  description: 'Create your SSPACIA account to book premium workspaces and join our professional community.',
};

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[90vh] flex items-center justify-center bg-surface-lowest flex-row-reverse">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    }>
      <SignupClient />
    </Suspense>
  );
}
