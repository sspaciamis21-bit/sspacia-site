"use client";

import React, { useState, useEffect } from "react";
import { X, Lock, User, Mail, Sparkles, Loader2, Eye, EyeOff, LogIn, UserPlus, KeyRound, CheckCircle2 } from "lucide-react";


import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMode?: "login" | "signup";
  title?: string;
  message?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = "login",
  title,
  message,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Reset password state with mandatory 4-minute Email OTP
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpValidated, setOtpValidated] = useState(false);
  const [otpValidating, setOtpValidating] = useState(false);

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

  const handleSendForgotOtp = async () => {
    if (!forgotUsername.trim() || !forgotEmail.trim()) {
      toast.error("Please enter your Username and Email first");
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          email: forgotEmail.trim(),
          purpose: "FORGOT_PASSWORD",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification OTP");

      toast.success(data.message || "OTP sent to your email! Valid for 4 minutes.");
      setOtpSent(true);
      setOtpValidated(false);
      setOtpCountdown(data.expiresInSeconds || 240); // 4 minutes
    } catch (err: any) {
      toast.error(err.message || "Error sending OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleValidateForgotOtp = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      toast.error("Please enter the full 6-digit OTP code");
      return;
    }

    setOtpValidating(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          purpose: "FORGOT_PASSWORD",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired OTP");

      toast.success("OTP verified successfully! Please enter your new password.");
      setOtpValidated(true);
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
    } finally {
      setOtpValidating(false);
    }
  };


  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid login credentials");
      }

      toast.success("Welcome back to SSPACIA!");
      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to log in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      toast.error("Please fill in all registration fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          role: "USER",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      toast.success("Account created successfully! Welcome to SSPACIA.");
      await refreshUser();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim() || !forgotEmail.trim()) {
      toast.error("Username and Email are required");
      return;
    }
    if (!otpSent || !forgotOtp.trim()) {
      toast.error("Please click 'Send OTP' and enter the 6-digit code sent to your email");
      return;
    }
    if (!forgotNewPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          email: forgotEmail.trim(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      toast.success("Password reset successfully! Please log in with your new password.");
      setShowForgot(false);
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setOtpSent(false);
      setOtpCountdown(0);
      setMode("login");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-gray-200 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl my-auto relative rounded-sm">
        
        {/* TOP HEADER */}
        <div className="bg-[#1B1C1C] text-white p-5 flex items-center justify-between border-b border-teal-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1ab0bc] flex items-center justify-center text-white font-bold text-xs">
              SS
            </div>
            <div>
              <h3 className="font-display font-bold text-base uppercase tracking-tight flex items-center gap-1.5">
                <span>{title || (mode === "login" ? "Sign In to SSPACIA" : "Create an Account")}</span>
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              </h3>
              <p className="text-[10px] text-teal-300/80 font-mono">
                {message || (mode === "login" ? "Access your bookings and exclusive spaces" : "Join Ahmedabad's premium workspace community")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 font-bold transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB SWITCHER */}
        {!showForgot && (
          <div className="grid grid-cols-2 border-b border-gray-200 bg-neutral-50 text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setMode("login")}
              className={`py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-white text-[#006064] border-b-2 border-[#006064] shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "bg-white text-[#006064] border-b-2 border-[#006064] shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="p-6">
          {showForgot ? (
            /* FORGOT PASSWORD FORM */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 p-2.5 text-xs text-teal-900 leading-relaxed">
                Enter your Username & Registered Email to receive a <strong>4-minute verification code (OTP)</strong>.
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="e.g. tushar"
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#006064] outline-none text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Email Address
                  </label>
                  {otpSent && (
                    <span className="text-[10px] font-bold font-mono text-[#006064]">
                      {otpCountdown > 0 ? (
                        <span className="text-amber-700">⏳ Valid for {formatCountdown(otpCountdown)}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendForgotOtp}
                          disabled={otpSending}
                          className="text-[#006064] hover:underline font-bold"
                        >
                          Resend OTP
                        </button>
                      )}
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#006064] outline-none text-xs"
                />
              </div>

              {!otpSent ? (
                /* STEP 1: Send OTP Button */
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={otpSending || !forgotUsername.trim() || !forgotEmail.trim()}
                    className="w-full bg-[#006064] hover:bg-[#004D40] text-white py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {otpSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending OTP...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" /> Send 4-Minute Email OTP
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-500 mt-1.5 text-center">
                    A 6-digit code will be emailed to you for verification.
                  </p>
                </div>
              ) : !otpValidated ? (
                /* STEP 2: Enter & Validate OTP */
                <div className="space-y-3 pt-1">
                  <div className="bg-teal-50/70 p-3 border border-teal-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#006064] flex items-center gap-1">
                        <KeyRound className="w-3 h-3" /> Enter 6-Digit Email OTP *
                      </label>
                      <span className="text-[10px] font-bold font-mono text-neutral-600">
                        {otpCountdown > 0 ? `${formatCountdown(otpCountdown)} left` : 'Expired'}
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full border-2 border-[#006064] bg-white px-3 py-2 text-center text-lg font-mono font-black tracking-widest outline-none text-[#006064]"
                    />
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-gray-500">
                        {otpCountdown > 0 ? 'Check inbox / spam' : 'Code expired.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleSendForgotOtp}
                        disabled={otpSending || otpCountdown > 180}
                        className="text-[#006064] font-bold hover:underline disabled:opacity-40 cursor-pointer"
                      >
                        {otpSending ? 'Sending...' : 'Resend Code'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateForgotOtp}
                    disabled={otpValidating || forgotOtp.trim().length !== 6}
                    className="w-full bg-[#006064] hover:bg-[#004D40] text-white py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {otpValidating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating Code...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validate OTP Code
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* STEP 3: Set New Password */
                <>
                  <div className="bg-emerald-50 border border-emerald-300 p-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      OTP Verified ({forgotOtp})
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpValidated(false)}
                      className="text-[10px] text-emerald-800 underline font-normal cursor-pointer"
                    >
                      Change OTP
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 focus:border-[#006064] outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-gray-300 focus:border-[#006064] outline-none text-xs"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgot(false)}
                      className="w-1/2 border border-gray-300 text-gray-700 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !forgotOtp.trim()}
                      className="w-1/2 bg-[#006064] text-white py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#004D40] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Reset Password</span>}
                    </button>
                  </div>
                </>
              )}


            </form>
          ) : mode === "login" ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#006064]" />
                  <span>Username or Email</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#006064] outline-none text-xs font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#006064]" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[10px] font-bold text-[#006064] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-9 border border-gray-300 focus:border-[#006064] outline-none text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#006064] hover:bg-[#004D40] text-white py-3 text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>LOG IN & CONTINUE</span>}
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-gray-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-bold text-[#006064] hover:underline cursor-pointer"
                  >
                    Sign Up here
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* SIGNUP FORM */
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#006064]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#006064] outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#006064]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 focus:border-[#006064] outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#006064]" />
                  <span>Create Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-9 border border-gray-300 focus:border-[#006064] outline-none text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#006064] hover:bg-[#004D40] text-white py-3 text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>CREATE ACCOUNT & PROCEED</span>}
              </button>

              <div className="text-center pt-2">
                <p className="text-[11px] text-gray-500">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-bold text-[#006064] hover:underline cursor-pointer"
                  >
                    Log In here
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
