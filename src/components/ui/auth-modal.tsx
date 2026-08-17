"use client";

import React, { useState } from "react";
import { X, Lock, User, Mail, Sparkles, Loader2, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
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

  // Reset password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");

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
    if (!forgotUsername.trim() || !forgotEmail.trim() || !forgotNewPassword) {
      toast.error("Please fill in all fields");
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
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      toast.success("Password reset successfully! Please log in.");
      setShowForgot(false);
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
              <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
                Enter your registered Username & Email to reset your password.
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
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
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
                  className="w-full px-3 py-2 border border-gray-300 focus:border-[#1ab0bc] outline-none text-xs"
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
                  disabled={isLoading}
                  className="w-1/2 bg-[#006064] text-white py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-[#004D40] transition-colors flex items-center justify-center gap-1.5"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Reset</span>}
                </button>
              </div>
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
