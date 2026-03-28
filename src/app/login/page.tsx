'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { SectionLabel } from '@/components/ui/section-label';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const { refreshUser } = useAuth(); // Call useAuth at the top level

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { email, password } = formData; // Destructure email and password

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), // Use destructured email and password
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed'); // Updated error message
      }

      toast.success('Welcome back to SSPACIA!');
      
      // Refresh the user context to get the latest data
      await refreshUser();
      
      // Role-based redirection
      const role = data.user.role;
      if (role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (role === 'USER') {
        router.push('/dashboard');
      } else {
        // Any custom role (MANAGER, COMMUNITY_MANAGER, etc.)
        router.push('/manager/dashboard');
      }
      
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full"
      >
        <div className="bg-white/90 backdrop-blur-xl border border-[#CFD8DC]/50 rounded-[2.5rem] p-10 shadow-2xl shadow-[#006064]/5 relative overflow-hidden">
          {/* Decorative Background Element */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#E0F7FA]/40 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 text-center mb-10">
            <div className="inline-flex mb-6">
              <SectionLabel className="bg-[#E0F7FA] text-[#006064] border-[#006064]/10">
                <LogIn className="h-3 w-3" /> Member Access
              </SectionLabel>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#004D40]">
              Welcome Back
            </h1>
            <p className="text-[#616161] mt-3">Sign in to your SSPACIA workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#004D40] ml-4">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#9E9E9E] group-focus-within:text-[#006064] transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-5 py-4 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-2xl focus:ring-4 focus:ring-[#006064]/5 focus:border-[#006064] outline-none transition-all placeholder:text-[#9E9E9E] text-[#212121]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-4 mr-4">
                <label className="text-sm font-bold text-[#004D40]">Password</label>
                              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#9E9E9E] group-focus-within:text-[#006064] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-5 py-4 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-2xl focus:ring-4 focus:ring-[#006064]/5 focus:border-[#006064] outline-none transition-all placeholder:text-[#9E9E9E] text-[#212121]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#006064] hover:bg-[#004D40] text-white rounded-2xl font-bold shadow-lg shadow-[#006064]/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-8"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In to Workspace
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative z-10 mt-10 pt-8 border-t border-[#CFD8DC]/30 text-center">
            <p className="text-[#616161]">
              Don&apos;t have an account yet?{' '}
              <Link
                href="/signup"
                className="text-[#006064] font-bold hover:text-[#004D40] transition-colors"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
