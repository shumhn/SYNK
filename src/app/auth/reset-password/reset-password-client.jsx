"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC]">
        <div className="text-center max-w-md px-4">
          <h1 className="font-heading text-2xl font-semibold text-[#151515] mb-3">Invalid Link</h1>
          <p className="text-neutral-600 mb-6">This password reset link is invalid or expired.</p>
          <Link href="/auth/forgot-password" className="text-[#151515] font-semibold hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[#151515]">Password Reset Successfully</h1>
          <p className="text-neutral-600">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#151515] mb-2">Create new password</h1>
          <p className="text-sm text-neutral-500 font-body">Enter a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
              required
              minLength={8}
            />
            <p className="text-xs text-neutral-500 mt-2">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold shadow-[0_18px_30px_rgba(21,21,21,0.18)] hover:shadow-[0_22px_36px_rgba(21,21,21,0.22)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
