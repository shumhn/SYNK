"use client";

import { useState, useEffect } from "react";

export default function SecuritySettingsPage() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    // Check current 2FA status
    // This would come from the user's profile
    // For now, we'll assume it's in the session/auth
  }, []);

  async function handleSetup2FA() {
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/2fa/setup");
      const data = await res.json();
      
      if (res.ok) {
        setQrCode(data.qrCode);
        setSecret(data.secret);
        setShowSetup(true);
      } else {
        setError(data.error || "Failed to setup 2FA");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable2FA(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      });

      const data = await res.json();

      if (res.ok) {
        setBackupCodes(data.backupCodes || []);
        setTwoFAEnabled(true);
        setShowSetup(false);
        setVerifyToken("");
        setSuccess("2FA enabled successfully! Save your backup codes.");
      } else {
        setError(data.error || "Invalid code");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable2FA(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: disableToken }),
      });

      const data = await res.json();

      if (res.ok) {
        setTwoFAEnabled(false);
        setShowDisable(false);
        setDisableToken("");
        setBackupCodes([]);
        setSuccess("2FA disabled successfully");
      } else {
        setError(data.error || "Invalid code");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function copyBackupCodes() {
    const text = backupCodes.join("\n");
    navigator.clipboard.writeText(text);
    setSuccess("Backup codes copied to clipboard");
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Security Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account security and two-factor authentication</p>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-900/20 border border-red-800 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded bg-green-900/20 border border-green-800 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* 2FA Section */}
      <div className="border border-neutral-800 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Two-Factor Authentication (2FA)</h2>
            <p className="text-sm text-gray-400 mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-sm ${twoFAEnabled ? "bg-green-900/20 text-green-400" : "bg-gray-800 text-gray-400"}`}>
            {twoFAEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        {!twoFAEnabled && !showSetup && (
          <button
            onClick={handleSetup2FA}
            disabled={loading}
            className="px-4 py-2 bg-white text-black rounded hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Enable 2FA"}
          </button>
        )}

        {showSetup && (
          <div className="space-y-4">
            <div className="border border-neutral-700 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">Step 1: Scan QR Code</h3>
              <p className="text-sm text-gray-400">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              {qrCode && (
                <img src={qrCode} alt="2FA QR Code" className="w-64 h-64 border border-neutral-700 rounded" />
              )}
              <p className="text-xs text-gray-500">
                Manual entry: <code className="bg-neutral-800 px-2 py-1 rounded">{secret}</code>
              </p>
            </div>

            <form onSubmit={handleEnable2FA} className="space-y-3">
              <div>
                <label className="block text-sm mb-2">Step 2: Enter Verification Code</label>
                <input
                  type="text"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full max-w-xs px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-center tracking-widest"
                  required
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || verifyToken.length !== 6}
                  className="px-4 py-2 bg-white text-black rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSetup(false);
                    setVerifyToken("");
                  }}
                  className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {twoFAEnabled && !showDisable && (
          <button
            onClick={() => setShowDisable(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disable 2FA
          </button>
        )}

        {showDisable && (
          <form onSubmit={handleDisable2FA} className="space-y-3">
            <div>
              <label className="block text-sm mb-2">Enter 2FA Code or Backup Code</label>
              <input
                type="text"
                value={disableToken}
                onChange={(e) => setDisableToken(e.target.value)}
                placeholder="000000"
                className="w-full max-w-xs px-4 py-2 rounded bg-neutral-900 border border-neutral-800"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Disabling..." : "Disable 2FA"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDisable(false);
                  setDisableToken("");
                }}
                className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {backupCodes.length > 0 && (
          <div className="border border-yellow-800 bg-yellow-900/10 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-yellow-400">⚠️ Save Your Backup Codes</h3>
            <p className="text-sm text-gray-400">
              Save these backup codes in a secure place. Each can only be used once.
            </p>
            <div className="bg-neutral-950 rounded p-3 font-mono text-sm space-y-1">
              {backupCodes.map((code, idx) => (
                <div key={idx}>{code}</div>
              ))}
            </div>
            <button
              onClick={copyBackupCodes}
              className="px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700 text-sm"
            >
              Copy Codes
            </button>
          </div>
        )}
      </div>

      {/* Password Section */}
      <div className="border border-neutral-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Password</h2>
          <p className="text-sm text-gray-400 mt-1">Change your password regularly for better security</p>
        </div>
        <a
          href="/auth/forgot-password"
          className="inline-block px-4 py-2 bg-neutral-800 rounded hover:bg-neutral-700"
        >
          Change Password
        </a>
      </div>
    </div>
  );
}
