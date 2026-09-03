'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { User, Mail, Lock, ArrowRight, Loader2, UserPlus, Eye, EyeOff, CheckCircle2, KeyRound, Sparkles } from 'lucide-react';
import { SectionLabel } from '@/components/ui/section-label';
import { useAuth } from '@/context/AuthContext';
import { validatePassword } from '@/lib/password-validator';
import Image from 'next/image';

export default function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams ? searchParams.get('redirect') : null;
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER'
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Email OTP state with 4-minute validity
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpValidated, setOtpValidated] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);

  // 4-Minute Countdown Timer
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
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please enter your Full Name and Email Address first');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          purpose: 'REGISTRATION',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification OTP');

      toast.success(data.message || 'Verification OTP sent to your email! Valid for 4 minutes.');
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
          email: formData.email.trim(),
          otp: otp.trim(),
          purpose: 'REGISTRATION',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired OTP');

      toast.success('Email verified successfully! You can now set your password.');
      setOtpValidated(true);
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setOtpValidating(false);
    }
  };

  const pwdLengthValid = formData.password.trim().length >= 6;
  const pwdUppercaseValid = /[A-Z]/.test(formData.password);
  const pwdNumberValid = /[0-9]/.test(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpValidated) {
      toast.error('Please click "Send OTP" and verify your email before creating an account');
      return;
    }

    const pwdCheck = validatePassword(formData.password);
    if (!pwdCheck.isValid) {
      toast.error(pwdCheck.error || 'Password does not meet requirements');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, otp: otp.trim(), rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      toast.success('Account created! Welcome to SSPACIA.');

      await refreshUser();

      if (redirect) {
        router.push(decodeURIComponent(redirect));
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex bg-surface-lowest flex-row-reverse items-stretch">
      {/* Visual Side (Sticky in viewport) */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-high border-l border-outline-variant/10 overflow-hidden group sticky top-[72px] self-start h-[calc(100vh-72px)] min-h-[550px]">
        <Image
          src="/IMAGES_SSPACIA/PREMIER HOUSE/Reception.JPG"
          alt="SSPACIA Auth"
          fill
          className="object-cover transition-all duration-1000 group-hover:scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 z-10" />
        <div className="absolute top-0 left-12 w-[1px] h-full bg-white/10 z-20"></div>
        <div className="absolute bottom-8 right-8 z-20 space-y-3 text-right flex flex-col items-end max-w-md">
          <SectionLabel className="bg-white/15 text-white border-white/25 backdrop-blur-md self-end shadow-xs">
            <UserPlus className="h-3 w-3" /> New Membership
          </SectionLabel>
          <h2 className="text-3xl xl:text-4xl font-display font-bold text-white tracking-tight shadow-sm">
            Join the community.
          </h2>
          <p className="text-white/85 text-xs sm:text-sm font-light leading-relaxed">
            Create your account to book premium workspaces, connect with professionals, and fuel your productivity.
          </p>
        </div>
      </div>


      {/* Form Side */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-5 sm:p-12 lg:p-16 relative">
        <div className="absolute top-0 left-12 w-[1px] h-full bg-outline-variant/10 hidden md:block"></div>
        <div className="absolute top-12 right-0 w-full h-[1px] bg-outline-variant/10 hidden md:block"></div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tighter text-on-surface mb-3 sm:mb-4 relative inline-block">
              Create Account
              <span className="absolute -bottom-2 right-0 w-1/3 h-1 bg-primary"></span>
            </h1>
            <p className="text-tertiary mt-4 sm:mt-6 text-sm sm:text-lg font-light">Join Ahmedabad&apos;s premium workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary ml-2">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder=""
                  className="w-full rounded-none border-b-2 border-outline-variant/30 bg-surface-high pl-12 pr-4 py-4 text-sm outline-none transition-all focus:border-primary focus:bg-white text-on-surface placeholder:text-tertiary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary">Email Address</label>
                {otpSent && otpCountdown > 0 && (
                  <span className="text-[10px] text-amber-700 font-mono font-bold">
                    OTP Expires in: {formatCountdown(otpCountdown)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={otpValidated}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full rounded-none border-b-2 border-outline-variant/30 bg-surface-high pl-12 pr-4 py-4 text-sm outline-none transition-all focus:border-primary focus:bg-white text-on-surface placeholder:text-tertiary/50 disabled:bg-surface-lowest"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpSending || (otpSent && otpCountdown > 0 && !otpValidated)}
                  className="px-4 py-4 bg-surface-high border-b-2 border-outline-variant/30 hover:bg-surface-highest text-primary text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {otpSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  <span>{otpSent ? "Resend OTP" : "Send OTP"}</span>
                </button>
              </div>
            </div>

            {/* OTP Input Card */}
            {otpSent && !otpValidated && (
              <div className="bg-amber-50/60 border border-amber-200 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Enter 6-Digit Email Verification Code</span>
                  </label>
                  <span className="text-[10px] text-amber-800">Check your inbox</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="flex-1 px-3 py-3 border border-amber-300 bg-white focus:border-primary outline-none text-center font-mono text-base tracking-[0.35em] font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleValidateOtp}
                    disabled={otpValidating || otp.trim().length !== 6}
                    className="px-5 py-3 bg-primary hover:bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {otpValidating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Validate OTP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Verified Badge */}
            {otpValidated && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 flex items-center justify-between text-emerald-800 text-xs font-medium">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email verified successfully</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpValidated(false);
                    setOtpSent(false);
                  }}
                  className="text-[10px] text-emerald-800 underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            )}


            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-tertiary ml-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-tertiary group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
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

              {/* Password Requirements Helper */}
              {formData.password.length > 0 && (
                <div className="text-[11px] text-tertiary space-y-1 pt-1 bg-surface-high/60 p-2.5 border-l-2 border-primary">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      size={12}
                      className={pwdLengthValid ? 'text-emerald-600' : 'text-outline-variant'}
                    />
                    <span className={pwdLengthValid ? 'text-emerald-700 font-semibold' : ''}>
                      At least 6 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      size={12}
                      className={pwdUppercaseValid ? 'text-emerald-600' : 'text-outline-variant'}
                    />
                    <span className={pwdUppercaseValid ? 'text-emerald-700 font-semibold' : ''}>
                      At least 1 uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2
                      size={12}
                      className={pwdNumberValid ? 'text-emerald-600' : 'text-outline-variant'}
                    />
                    <span className={pwdNumberValid ? 'text-emerald-700 font-semibold' : ''}>
                      At least 1 number (0-9)
                    </span>
                  </div>
                </div>
              )}
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
                  Create Membership
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-outline-variant/20 flex flex-col items-center">
            <p className="text-tertiary font-light text-sm">
              Already have an account?{' '}
              <Link
                href={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-primary font-bold hover:text-primary-container transition-colors ml-1 uppercase text-[10px] tracking-widest relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-[1px] after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
