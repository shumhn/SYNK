"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function TwoFactorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSetup = searchParams.get("setup") === "1";
  const returnTo = decodeURIComponent(searchParams.get("return") || "/admin");

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpAuthUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSetup() {
      if (!isSetup) return;
      setError("");
      try {
        const res = await fetch("/api/auth/2fa/setup");
        const data = await res.json();
        if (res.ok) {
          setQrCode(data.qrCode);
          setSecret(data.secret);
          setOtpAuthUrl(data.manualEntry || "");
        } else {
          setError(data.error || "Failed to start setup. Please sign in again.");
        }
      } catch {
        setError("Unexpected error during setup");
      }
    }
    fetchSetup();
  }, [isSetup]);

  const androidIntentUrl = useMemo(() => {
    if (!otpauthUrl) return "";
    return `intent://${otpauthUrl.replace("otpauth://", "")}#Intent;scheme=otpauth;package=com.google.android.apps.authenticator2;end`;
  }, [otpauthUrl]);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    if (token.length !== 6 && token.length !== 8) {
      setError("Enter a valid 6-digit code or backup code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(returnTo);
      } else {
        setError(data.error || "Invalid code. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e) {
    e.preventDefault();
    setError("");
    if (token.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupCodes(data.backupCodes || []);
        setEnabled(true);
      } else {
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold tracking-[0.2em] text-neutral-600 mb-6">
            ZALIENT
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-[#151515] mb-2">Two-Factor Authentication</h1>
          <p className="text-sm text-neutral-500 font-body">
            {isSetup ? "Scan the QR and enter the code to enable 2FA" : "Enter the 6-digit code from your authenticator app"}
          </p>
        </div>

        {isSetup ? (
          <div className="space-y-5">
            <div className="border border-[#E8E2D7] rounded-lg p-4 bg-white">
              {qrCode ? (
                <img src={qrCode} alt="2FA QR Code" className="w-64 h-64 mx-auto border rounded" />
              ) : (
                <div className="text-center text-sm text-neutral-500">Loading QR…</div>
              )}
              {secret && (
                <p className="mt-3 text-xs text-neutral-600 text-center">Manual entry: <code className="bg-[#F7F5F0] px-2 py-1 rounded">{secret}</code></p>
              )}
              {otpauthUrl && (
                <div className="mt-3 text-center space-x-2 text-sm">
                  <a href={otpauthUrl} className="underline">Open in Authenticator</a>
                  {androidIntentUrl && <>
                    <span className="text-neutral-400">·</span>
                    <a href={androidIntentUrl} className="underline">Open on Android</a>
                  </>}
                </div>
              )}
            </div>

            {!enabled ? (
              <form onSubmit={handleEnable} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-lg bg-white border border-[#E8E2D7] text-[#151515] text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[#151515] focus:border-transparent transition"
                    autoComplete="off"
                    required
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={loading || token.length !== 6}
                  className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold hover:shadow disabled:opacity-50"
                >
                  {loading ? "Enabling..." : "Verify & Enable"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {backupCodes.length > 0 && (
                  <div className="border border-neutral-300 rounded p-4 bg-white text-[#151515]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold">Backup Codes (save these)</div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(backupCodes.join("\n"));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                        className="text-xs underline"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
                      {backupCodes.map((c, i) => (<div key={i}>{c}</div>))}
                    </div>
                    <p className="mt-2 text-xs text-neutral-600">Each code can be used once. Store them somewhere safe.</p>
                  </div>
                )}
                <button onClick={() => router.push(returnTo)} className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold">Continue</button>
              </div>
            )}
          </div>
        ) : (
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
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="w-full py-3.5 rounded-full bg-[#151515] text-white font-semibold hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <p className="text-center text-sm text-neutral-500">Lost your device? Use a backup code.</p>
          </form>
        )}
      </div>
    </div>
  );
}
