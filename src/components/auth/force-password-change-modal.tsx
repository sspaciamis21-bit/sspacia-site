'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, KeyRound, ShieldAlert, Loader2, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function ForcePasswordChangeModal() {
  const { user, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpValidated, setOtpValidated] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 4-Minute OTP Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [otpCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          purpose: 'RESET_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification OTP');

      toast.success(data.message || 'OTP sent to your email! Valid for 4 minutes.');
      setOtpSent(true);
      setOtpValidated(false);
      setOtpCountdown(data.expiresInSeconds || 240); // 4 minutes
    } catch (err: any) {
      toast.error(err.message || 'Error sending OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleValidateOtp = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error('Please enter the full 6-digit OTP code');
      return;
    }

    setOtpValidating(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          otp: otp.trim(),
          purpose: 'RESET_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired OTP');

      toast.success('OTP verified successfully! Please enter your new password.');
      setOtpValidated(true);
    } catch (err: any) {
      toast.error(err.message || 'OTP validation failed');
    } finally {
      setOtpValidating(false);
    }
  };


  // If no user, mustChangePassword is not true, or user is HR, do not render
  if (!user || !user.mustChangePassword || user.role === 'HR') {
    return null;
  }



  const hasMinLength = newPassword.trim().length >= 6;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isFormValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch && otpValidated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpValidated || !otp.trim()) {
      toast.error('Please validate your 6-digit Email OTP first');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (!hasMinLength) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!hasUppercase) {
      toast.error('Password must contain at least one uppercase letter (A-Z)');
      return;
    }

    if (!hasNumber) {
      toast.error('Password must contain at least one number (0-9)');
      return;
    }

    if (!passwordsMatch) {
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
          otp: otp.trim(),
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
              {/* STEP 1: Send OTP Block */}
              {!otpSent ? (
                <div className="bg-teal-50 p-3 border border-teal-200 space-y-2">
                  <div className="text-xs text-teal-950 font-semibold">
                    Security Verification: We need to send a <strong>4-minute Email OTP</strong> to <strong>{user.email}</strong> to authorize this password change.
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    className="w-full py-2.5 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {otpSending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sending OTP to {user.email}...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={14} />
                        <span>Send 4-Minute Email OTP</span>
                      </>
                    )}
                  </button>
                </div>
              ) : !otpValidated ? (
                /* STEP 2: Enter & Validate OTP */
                <div className="bg-teal-50/80 p-3.5 border-2 border-[#006064] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#006064] flex items-center gap-1">
                      <KeyRound size={12} /> Enter 6-Digit Email OTP *
                    </label>
                    <span className="text-[10px] font-bold font-mono text-neutral-600">
                      {otpCountdown > 0 ? `⏳ ${formatCountdown(otpCountdown)} left` : 'Expired'}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-white border-2 border-[#006064] py-2 px-3 text-center text-lg font-mono font-black tracking-widest outline-none text-[#006064]"
                  />
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-gray-500">
                      {otpCountdown > 0 ? 'Code sent to your email' : 'Code expired.'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || otpCountdown > 180}
                      className="text-[#006064] font-bold hover:underline disabled:opacity-40 cursor-pointer"
                    >
                      {otpSending ? 'Sending...' : 'Resend Code'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateOtp}
                    disabled={otpValidating || otp.trim().length !== 6}
                    className="w-full py-2.5 bg-[#006064] hover:bg-[#004d40] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm mt-1"
                  >
                    {otpValidating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Validating OTP...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Validate OTP Code</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* STEP 3: OTP Verified - Set New Password */
                <>
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span>✅ OTP Verified Successfully ({otp})</span>
                    <button
                      type="button"
                      onClick={() => setOtpValidated(false)}
                      className="text-[10px] text-emerald-800 underline font-normal cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !isFormValid}
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
                </>
              )}

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
