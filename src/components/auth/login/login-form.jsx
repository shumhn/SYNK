"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/admin/users" });
    } catch (error) {
      setErrors({ global: "Failed to sign in with Google" });
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    setMessage("");
    setLoading(true);

    const formData = new FormData(e.target);

    const userData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const url = "/api/auth/login";
    const options = { method: "POST", headers: { accept: "application/json" }, body: JSON.stringify(userData) };

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (data.error === false) {
        setMessage(data.message);
        setTimeout(() => {
          router.push("/thank-you");
        }, 1000);
      } else {
        setErrors(data.message || { global: "Something went wrong" });
      }
    } catch (error) {
      // no-op
      setErrors({ global: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFDFC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-neutral-500 hover:text-neutral-700 transition-colors font-medium text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-neutral-600 mb-6">
            ZALIENT
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#151515] mb-2">Welcome back</h1>
          <p className="text-sm text-neutral-500 font-body">Sign in to continue to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.global && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {errors.global}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
            />
            {errors.email && <p className="text-red-500 mt-2 text-sm font-medium">{errors.email[0]}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-neutral-700">Password</label>
              <Link href="/auth/forgot-password" className="text-sm text-neutral-500 hover:text-neutral-700 font-medium">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
            />
            {errors.password && <p className="text-red-500 mt-2 text-sm font-medium">{errors.password[0]}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold shadow-[0_18px_30px_rgba(21,21,21,0.18)] hover:shadow-[0_22px_36px_rgba(21,21,21,0.22)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {message && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-600 text-sm font-medium text-center">
              {message}
            </div>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E8E2D7]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-[#FDFDFC] px-3 text-neutral-400 font-semibold">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full py-3.5 rounded-full border border-[#E8E2D7] text-neutral-600 bg-white hover:bg-[#F7F5F0] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold"
          >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="text-center text-sm text-neutral-500 mt-6">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-[#151515] font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}