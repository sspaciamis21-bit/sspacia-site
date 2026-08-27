'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, KeyRound, ShieldAlert, Loader2, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function ForcePasswordChangeModal() {
  const { user, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no user or mustChangePassword is not true, do not render
  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success(data.message || 'Password updated successfully!');
      await refreshUser();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating your password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white border-2 border-[#006064] shadow-2xl overflow-hidden rounded-xs"
        >
          {/* Header Bar */}
          <div className="p-6 bg-[#006064] text-white flex items-center gap-4">
            <div className="h-12 w-12 bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <KeyRound size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/20 text-amber-200 text-[9px] font-black uppercase tracking-widest border border-amber-400/30 mb-1">
                <ShieldAlert size={11} /> First-Time Login Action Required
              </div>
              <h2 className="text-lg font-bold uppercase tracking-tight text-white">
                Set Your Personal Password
              </h2>
              <p className="text-xs text-white/80 font-light">
                For account security, you must replace your initial temporary password.
              </p>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* User Details Read-only Banner */}
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Logged In Account
                </span>
                <span className="font-extrabold text-[#1B1C1C] text-sm">
                  {user.name}
                </span>
                <span className="text-gray-500 block text-[11px]">
                  {user.email}
                </span>
              </div>
              <span className="px-2 py-1 bg-teal-50 text-[#006064] text-[10px] font-extrabold uppercase tracking-wider border border-teal-200">
                {user.role}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block">
                  New Confidential Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full bg-[#F8F9FA] border border-neutral-300 pl-10 pr-10 py-3 text-xs font-semibold text-[#1B1C1C] focus:outline-none focus:border-[#006064] focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#006064] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password to confirm"
                    className="w-full bg-[#F8F9FA] border border-neutral-300 pl-10 pr-10 py-3 text-xs font-semibold text-[#1B1C1C] focus:outline-none focus:border-[#006064] focus:bg-white transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#006064] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Rule Helper */}
              <div className="text-[11px] text-gray-500 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={13}
                    className={newPassword.length >= 6 ? 'text-emerald-600' : 'text-gray-300'}
                  />
                  <span className={newPassword.length >= 6 ? 'text-emerald-700 font-bold' : ''}>
                    At least 6 characters long
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={13}
                    className={
                      newPassword && confirmPassword && newPassword === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-gray-300'
                    }
                  />
                  <span
                    className={
                      newPassword && confirmPassword && newPassword === confirmPassword
                        ? 'text-emerald-700 font-bold'
                        : ''
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full py-3.5 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-6 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Secure Password...</span>
                  </>
                ) : (
                  <>
                    <span>Save Password &amp; Access Workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Logout Alternative */}
            <div className="text-center pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={logout}
                className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-red-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={12} />
                <span>Log out and update later</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
