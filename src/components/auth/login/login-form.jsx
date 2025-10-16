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
      await signIn("google", { callbackUrl: "/" });
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
          router.push("/blogs/view");
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
    <div className="flex items-center justify-center min-h-screen bg-black px-4">
      <div className="w-full max-w-md bg-neutral-900 rounded-xl shadow-lg border border-gray-800 p-6">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-white">Login to your account</h1>
        <p className="text-sm text-gray-400 mb-6">Enter your email below to login to your account</p>

        <form onSubmit={handleSubmit}>
          {errors.global && <div className="mt-2 p-2 bg-red-600 text-white rounded-md">{errors.global}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="m@example.com"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
              {errors.email && <p className="text-red-500 mt-1 text-sm">{errors.email[0]}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <Link href="#" className="text-sm text-gray-400 hover:underline">
                  Forgot your password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
              {errors.password && <p className="text-red-500 mt-1 text-sm">{errors.password[0]}</p>}
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-white text-black font-medium hover:brightness-95 transition"
              >
                {loading ? "Logging in ..." : "Login"}
              </button>

              {message && <div className="mt-4 p-2 bg-green-600 text-white rounded-md text-center">{message}</div>}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-900 px-2 text-gray-400">Or continue with</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 rounded-lg border border-gray-700 text-gray-200 bg-neutral-900 hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleLoading ? "Signing in..." : "Login with Google"}
              </button>
            </div>

            <div className="text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-white underline ml-1">
                Sign up
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}