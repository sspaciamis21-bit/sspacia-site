'use client';

import { usePathname } from 'next/navigation';
import { Header } from './header';
import { Footer } from './footer';

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isDashboardPage = pathname?.startsWith('/admin') || 
                          pathname?.startsWith('/manager') || 
                          pathname?.startsWith('/dashboard');

  if (isDashboardPage) {
    return <main className="flex-1 h-screen overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#F8F9FA] via-[#F8F9FA] to-[#F8F9FA]">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
