"use client";

import Link from "next/link";

export default function TwoFABanner() {
  return (
    <div className="w-full bg-yellow-500/10 border-b border-yellow-600/40 text-yellow-200">
      <div className="max-w-7xl mx-auto px-6 py-2 text-sm flex items-center justify-between">
        <span>
          Two-factor verification is required for this session. Please verify to continue privileged actions.
        </span>
        <Link href="/auth/2fa?verify=1" className="underline">Verify 2FA</Link>
      </div>
    </div>
  );
}
