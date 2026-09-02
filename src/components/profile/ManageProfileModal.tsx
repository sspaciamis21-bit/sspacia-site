'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Mail, Lock, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { validatePassword } from '@/lib/password-validator';

interface ManageProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageProfileModal({ isOpen, onClose }: ManageProfileModalProps) {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpValidated, setOtpValidated] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      setOtpValidated(false);
      setOtpCountdown(0);
    }
  }, [user, isOpen]);

  const handleSendOtp = async () => {
    const targetEmail = user?.email || email;
    if (!targetEmail.trim()) {
      toast.error('Email address not found');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail.trim(),
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
    const targetEmail = user?.email || email;
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
          email: targetEmail.trim(),
          otp: otp.trim(),
          purpose: 'RESET_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired OTP');

      toast.success('OTP verified successfully!');
      setOtpValidated(true);
    } catch (err: any) {
      toast.error(err.message || 'OTP validation failed');
    } finally {
      setOtpValidating(false);
    }
  };


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (!email.trim()) {
      toast.error('Email ID cannot be empty');
      return;
    }

    if (password) {
      const pwdCheck = validatePassword(password);
      if (!pwdCheck.isValid) {
        toast.error(pwdCheck.error || 'Password does not meet complexity requirements');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (!otpSent || !otp.trim()) {
        toast.error('Please click "Send OTP" and enter the 6-digit verification code sent to your email');
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: { name: string; email: string; password?: string; otp?: string } = {
        name: name.trim(),
        email: email.trim(),
      };
      if (password) {
        payload.password = password;
        payload.otp = otp.trim();
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully!');
      await refreshUser();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating profile');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white border border-[var(--outline-variant)] shadow-2xl overflow-hidden rounded-none"
        >
          {/* Header */}
          <div className="bg-[var(--surface-lowest)] p-6 border-b border-[var(--outline-variant)]/30 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-[var(--primary)] uppercase tracking-wider">
                Manage Profile
              </h3>
              <p className="text-xs text-[#616161]">Update your account credentials & details</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#616161] hover:text-black hover:bg-neutral-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#616161]">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[var(--primary)]">
                  <User size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. muskan-marcado"
                  className="w-full rounded-none border border-neutral-300 bg-neutral-50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:bg-white text-neutral-900 transition-colors"
                />
              </div>
            </div>

            {/* Email ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#616161]">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[var(--primary)]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-none border border-neutral-300 bg-neutral-50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:bg-white text-neutral-900 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#616161]">
                New Password <span className="text-neutral-400 font-normal lowercase">(leave blank to keep unchanged)</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[var(--primary)]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-none border border-neutral-300 bg-neutral-50 pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:bg-white text-neutral-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password & Mandatory Email OTP Verification */}
            {password && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#616161]">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[var(--primary)]">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!!password}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-none border border-neutral-300 bg-neutral-50 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:bg-white text-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                {/* Mandatory OTP Action Block */}
                {!otpSent ? (
                  <div className="bg-teal-50/70 p-3 border border-teal-200">
                    <div className="text-xs text-teal-900 font-semibold mb-2">
                      Changing your password requires a 4-minute Email OTP sent to <strong>{user?.email || email}</strong>.
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="w-full bg-[#006064] text-white py-2 px-3 text-xs font-bold uppercase tracking-wider hover:bg-[#004D40] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {otpSending ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Sending Verification Code...
                        </>
                      ) : (
                        'Send 4-Minute Email OTP'
                      )}
                    </button>
                  </div>
                ) : !otpValidated ? (
                  <div className="bg-teal-50/80 p-3 border-2 border-[#006064] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#006064]">
                        Enter 6-Digit Email OTP *
                      </label>
                      <span className="text-[10px] font-bold font-mono text-neutral-600">
                        {otpCountdown > 0 ? `⏳ ${formatCountdown(otpCountdown)} remaining` : 'Expired'}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full border-2 border-[#006064] bg-white px-3 py-2 text-center text-lg font-mono font-black tracking-widest outline-none text-[#006064]"
                    />
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-neutral-500">
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
                      className="w-full bg-[#006064] text-white py-2 px-3 text-xs font-bold uppercase tracking-wider hover:bg-[#004D40] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {otpValidating ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Validating OTP...
                        </>
                      ) : (
                        'Validate OTP Code'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span>✅ OTP Code Verified Successfully ({otp})</span>
                    <button
                      type="button"
                      onClick={() => setOtpValidated(false)}
                      className="text-[10px] text-emerald-800 underline font-normal cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}

              </>
            )}


            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-3 px-4 font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
