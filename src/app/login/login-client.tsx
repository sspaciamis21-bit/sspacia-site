'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { User, Mail, Lock, ArrowRight, Loader2, LogIn, Eye, EyeOff, X, KeyRound, CheckCircle2 } from 'lucide-react';
import { SectionLabel } from '@/components/ui/section-label';
import { useAuth } from '@/context/AuthContext';
import { validatePassword } from '@/lib/password-validator';
import Image from 'next/image';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams ? searchParams.get('redirect') : null;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Modal State with Mandatory Email OTP (4-minute validity)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotData, setForgotData] = useState({
    username: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpValidated, setOtpValidated] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);

  const { refreshUser } = useAuth();

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

  // Step 1: Dispatch 4-Minute OTP to Registered Email
  const handleSendOtp = async () => {
    const { username, email } = forgotData;
    if (!username.trim() || !email.trim()) {
      toast.error('Please enter your Username and Email first');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          purpose: 'FORGOT_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification OTP');
      }

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

  // Step 2: Validate OTP Code before entering new password
  const handleValidateOtp = async () => {
    const { email, otp } = forgotData;
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
          email: email.trim(),
          otp: otp.trim(),
          purpose: 'FORGOT_PASSWORD',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP');
      }

      toast.success('OTP verified successfully! Please enter your new password.');
      setOtpValidated(true);
    } catch (err: any) {
      toast.error(err.message || 'OTP validation failed');
    } finally {
      setOtpValidating(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { username, password } = formData;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast.success('Welcome back to SSPACIA!');

      await refreshUser();

      if (redirect) {
        router.push(decodeURIComponent(redirect));
        return;
      }

      const role = data.user.role?.toUpperCase();
      if (role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (role === 'USER') {
        router.push('/dashboard');
      } else {
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

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, email, otp, newPassword, confirmPassword } = forgotData;

    if (!username.trim() || !email.trim()) {
      toast.error('Username and Email are required');
      return;
    }

    if (!otpSent || !otp.trim()) {
      toast.error('Please click "Send OTP" and enter the 6-digit code sent to your email');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.isValid) {
      toast.error(pwdCheck.error || 'Password does not meet complexity requirements');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          otp: otp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success(data.message || 'Password reset successfully! You can now log in.');
      setShowForgotModal(false);
      setForgotData({ username: '', email: '', otp: '', newPassword: '', confirmPassword: '' });
      setOtpSent(false);
      setOtpCountdown(0);
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex bg-surface-lowest">
      {/* Visual Side */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-high border-r border-outline-variant/10 overflow-hidden group">
        <Image
          src="/IMAGES_SSPACIA/MERCADO IMAGES/Reception.jpg"
          alt="SSPACIA Auth"
          fill
          className="object-cover transition-all duration-1000 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
        <div className="absolute top-0 right-12 w-[1px] h-full bg-white/10 z-20"></div>
        <div className="absolute bottom-12 left-12 z-20 space-y-4">
          <SectionLabel className="bg-white/10 text-white border-white/20 backdrop-blur-md">
            <LogIn className="h-3 w-3" /> Member Access
          </SectionLabel>
          <h2 className="text-4xl font-display font-bold text-white tracking-tighter shadow-sm">Your premium space awaits.</h2>
          <p className="text-white/80 max-w-sm font-light">Sign in to manage your bookings, access the community, and explore exclusive perks.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-5 sm:p-12 lg:p-16 relative">
        <div className="absolute top-0 right-12 w-[1px] h-full bg-outline-variant/10 hidden md:block"></div>
        <div className="absolute top-12 left-0 w-full h-[1px] bg-outline-variant/10 hidden md:block"></div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tighter text-on-surface mb-3 sm:mb-4 relative inline-block">
              Welcome Back
              <span className="absolute -bottom-2 left-0 w-1/3 h-1 bg-primary"></span>
            </h1>
            <p className="text-tertiary mt-4 sm:mt-6 text-sm sm:text-lg font-light">Sign in to your SSPACIA workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary ml-2">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="-"
                  className="w-full rounded-none border-b-2 border-outline-variant/30 bg-surface-high pl-12 pr-4 py-4 text-sm outline-none transition-all focus:border-primary focus:bg-white text-on-surface placeholder:text-tertiary/50"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-2 mr-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline transition-all"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-none border-b-2 border-outline-variant/30 bg-surface-high pl-12 pr-12 py-4 text-sm outline-none transition-all focus:border-primary focus:bg-white text-on-surface placeholder:text-tertiary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-tertiary hover:text-primary transition-colors outline-none cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-none border border-outline-variant/50 text-primary accent-primary cursor-pointer"
                />
                <span className="text-xs text-tertiary font-medium">Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="liquid-hover group flex w-full items-center justify-center gap-4 rounded-none bg-primary px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed mt-6 cursor-pointer"
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

          <div className="mt-12 pt-8 border-t border-outline-variant/20 flex flex-col items-center">
            <p className="text-tertiary font-light text-sm">
              Don&apos;t have an account yet?{' '}
              <Link
                href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-primary font-bold hover:text-primary-container transition-colors ml-1 uppercase text-[10px] tracking-widest relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[1px] after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                Create Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-outline-variant/30 shadow-2xl overflow-hidden rounded-none p-6 sm:p-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <KeyRound size={20} className="text-primary" />
                  <h3 className="font-display font-bold text-lg text-on-surface uppercase tracking-wider">
                    Reset Password
                  </h3>
                </div>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="p-2 text-tertiary hover:text-on-surface hover:bg-surface-high transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-tertiary mt-4 mb-6">
                Enter your registered Username and Email ID to set a new password.
              </p>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                    Registered Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={forgotData.username}
                      onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
                      placeholder="-"
                      className="w-full border border-outline-variant/30 bg-surface-high pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface rounded-none"
                    />
                  </div>
                </div>

                {/* Email ID with Send/Resend OTP Button */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                      Registered Email ID
                    </label>
                    {otpSent && (
                      <span className="text-[10px] font-bold font-mono text-primary">
                        {otpCountdown > 0 ? (
                          <span className="text-amber-700">⏳ Valid for {formatCountdown(otpCountdown)}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpSending}
                            className="text-primary hover:underline font-bold"
                          >
                            Resend OTP
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotData.email}
                      onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                      placeholder="e.g. user@example.com"
                      className="w-full border border-outline-variant/30 bg-surface-high pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface rounded-none"
                    />
                  </div>
                </div>

                {/* Send OTP Action Banner */}
                {/* STEP 1: Send OTP Button */}
                {!otpSent ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending || !forgotData.username.trim() || !forgotData.email.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-[#006064] text-white py-2.5 px-4 font-bold text-xs uppercase tracking-widest hover:bg-[#004d40] disabled:opacity-50 transition-colors rounded-none cursor-pointer"
                    >
                      {otpSending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Sending OTP...
                        </>
                      ) : (
                        <>
                          <KeyRound size={14} /> Send 4-Minute Email OTP
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-tertiary mt-1.5 text-center">
                      A 6-digit verification code will be sent to your registered email.
                    </p>
                  </div>
                ) : !otpValidated ? (
                  /* STEP 2: Enter & Validate OTP */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1 bg-teal-50/50 p-3 border border-teal-200">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#006064] flex items-center gap-1">
                          <KeyRound size={12} /> Enter 6-Digit Email OTP *
                        </label>
                        <span className="text-[10px] font-bold font-mono text-neutral-600">
                          {otpCountdown > 0 ? `${formatCountdown(otpCountdown)} left` : 'Expired'}
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={forgotData.otp}
                        onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value.replace(/\D/g, '') })}
                        placeholder="123456"
                        className="w-full border-2 border-[#006064] bg-white px-3 py-2 text-center text-lg font-mono font-black tracking-widest outline-none text-[#006064] rounded-none focus:ring-1 focus:ring-[#006064]"
                      />
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-neutral-600">
                          {otpCountdown > 0 ? 'Check inbox / spam' : 'Code expired.'}
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
                    </div>

                    <button
                      type="button"
                      onClick={handleValidateOtp}
                      disabled={otpValidating || forgotData.otp.trim().length !== 6}
                      className="w-full flex items-center justify-center gap-2 bg-[#006064] text-white py-3 px-4 font-bold text-xs uppercase tracking-widest hover:bg-[#004d40] disabled:opacity-50 transition-colors rounded-none cursor-pointer shadow-sm"
                    >
                      {otpValidating ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> Validating Code...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} /> Validate OTP Code
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* STEP 3: OTP Verified - Set New Password */
                  <>
                    <div className="bg-emerald-50 border border-emerald-300 p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        OTP Verified ({forgotData.otp})
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpValidated(false)}
                        className="text-[10px] text-emerald-800 underline font-normal cursor-pointer"
                      >
                        Change OTP
                      </button>
                    </div>

                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                        New Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotData.newPassword}
                          onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full border border-outline-variant/30 bg-surface-high pl-10 pr-10 py-2.5 text-sm outline-none focus:border-primary text-on-surface rounded-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary hover:text-primary cursor-pointer"
                        >
                          {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">
                        Confirm New Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-tertiary">
                          <Lock size={16} />
                        </div>
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          required
                          value={forgotData.confirmPassword}
                          onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full border border-outline-variant/30 bg-surface-high pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary text-on-surface rounded-none"
                        />
                      </div>
                    </div>

                    {/* Password Rule Helper */}
                    {forgotData.newPassword.length > 0 && (
                      <div className="text-[11px] text-tertiary space-y-1 bg-surface-high p-2.5 border-l-2 border-primary">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            size={12}
                            className={forgotData.newPassword.trim().length >= 6 ? 'text-emerald-600' : 'text-outline-variant'}
                          />
                          <span className={forgotData.newPassword.trim().length >= 6 ? 'text-emerald-700 font-semibold' : ''}>
                            At least 6 characters
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            size={12}
                            className={/[A-Z]/.test(forgotData.newPassword) ? 'text-emerald-600' : 'text-outline-variant'}
                          />
                          <span className={/[A-Z]/.test(forgotData.newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                            At least 1 uppercase letter (A-Z)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            size={12}
                            className={/[0-9]/.test(forgotData.newPassword) ? 'text-emerald-600' : 'text-outline-variant'}
                          />
                          <span className={/[0-9]/.test(forgotData.newPassword) ? 'text-emerald-700 font-semibold' : ''}>
                            At least 1 number (0-9)
                          </span>
                        </div>
                        {forgotData.confirmPassword.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              size={12}
                              className={forgotData.newPassword === forgotData.confirmPassword ? 'text-emerald-600' : 'text-outline-variant'}
                            />
                            <span className={forgotData.newPassword === forgotData.confirmPassword ? 'text-emerald-700 font-semibold' : ''}>
                              Passwords match
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 font-bold text-xs uppercase tracking-widest hover:bg-primary-container disabled:opacity-50 transition-colors mt-4 rounded-none cursor-pointer"
                    >
                      {forgotLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Reset & Save Password'
                      )}
                    </button>
                  </>
                )}

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
