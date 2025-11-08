"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import NotificationBell from "@/components/notifications/notification-bell";

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }

  function isActive(href) {
    return pathname?.startsWith(href);
  }

  return (
    <div className="w-full border-b border-neutral-800/50 bg-[#0A0A0A] backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href="/admin/users" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/users") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Users</Link>
          <Link href="/admin/departments" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/departments") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Departments</Link>
          <Link href="/admin/teams" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/teams") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Teams</Link>
          <Link href="/admin/projects" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/projects") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Projects</Link>
          <Link href="/admin/tasks" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/tasks") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Tasks</Link>
          <Link href="/admin/templates" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/templates") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Templates</Link>
          <Link href="/admin/channels" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/channels") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Channels</Link>
          <Link href="/admin/settings" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/settings") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Settings</Link>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button onClick={onLogout} disabled={loading} className="px-4 py-2 rounded-lg bg-white text-[#151515] text-sm font-semibold hover:bg-neutral-100 transition disabled:opacity-50">{loading ? "Signing out..." : "Sign out"}</button>
        </div>
      </div>
    </div>
  );
}
