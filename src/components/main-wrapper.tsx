'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';
import { useAuth } from '@/context/AuthContext';

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoggedIn, isLoading } = useAuth();

  const isDashboardPage = pathname?.startsWith('/admin') || 
                          pathname?.startsWith('/manager') || 
                          pathname?.startsWith('/dashboard');

  useEffect(() => {
    if (isDashboardPage || isLoading) return;

    // Retrieve or generate a session token for deduplication
    let sessionToken = sessionStorage.getItem('sspacia_session_token');
    if (!sessionToken) {
      sessionToken = `session_${Math.random().toString(36).substring(2)}_${Date.now()}`;
      sessionStorage.setItem('sspacia_session_token', sessionToken);
    }

    // Check last tracking timestamp to prevent tracking spam on rapid route navigation
    const lastTracked = sessionStorage.getItem('sspacia_last_tracked');
    const now = Date.now();
    
    // Only track once per 15 minutes per session unless user auth state changes
    if (lastTracked && (now - Number(lastTracked) < 15 * 60 * 1000)) {
      return;
    }

    sessionStorage.setItem('sspacia_last_tracked', String(now));

    fetch('/api/public/track-visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        isUnregistered: !isLoggedIn,
        isLoggedOut: isLoggedIn,
        userEmail: user?.email || null
      })
    }).catch(() => {});
  }, [pathname, isDashboardPage, isLoggedIn, isLoading, user?.email]);

  if (isDashboardPage) {
    return <main className="flex-1 h-screen overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F8F9FA] via-[#F8F9FA] to-[#F8F9FA]">
      <Header />
      <main className="flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
