"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    
    if (token.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      const data = await res.json();
      
      if (res.ok) {
        router.push("/admin/users");
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC]">
        <div className="text-center max-w-md px-4">
          <h1 className="font-heading text-2xl font-semibold text-[#151515] mb-3">Invalid Request</h1>
          <p className="text-neutral-600 mb-6">Please sign in again.</p>
          <a href="/auth/login" className="text-[#151515] font-semibold hover:underline">Go to Sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-neutral-600 mb-6">
            ZALIENT
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#151515] mb-2">Two-Factor Authentication</h1>
          <p className="text-sm text-neutral-500 font-body">Enter the 6-digit code from your authenticator app</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Verification Code</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-4 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] text-center text-3xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
              autoComplete="off"
              autoFocus
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
            disabled={loading || token.length !== 6}
            className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold shadow-[0_18px_30px_rgba(21,21,21,0.18)] hover:shadow-[0_22px_36px_rgba(21,21,21,0.22)] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <p className="text-center text-sm text-neutral-500">
            Lost your device? Use a backup code instead.
          </p>
        </form>
      </div>
    </div>
  );
}
