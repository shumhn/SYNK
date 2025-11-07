"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

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
    <div className="w-full border-b border-neutral-800 bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin/users" className={`text-sm ${isActive("/admin/users") ? "font-semibold" : "text-gray-300"}`}>Users</Link>
          <Link href="/admin/departments" className={`text-sm ${isActive("/admin/departments") ? "font-semibold" : "text-gray-300"}`}>Departments</Link>
          <Link href="/admin/teams" className={`text-sm ${isActive("/admin/teams") ? "font-semibold" : "text-gray-300"}`}>Teams</Link>
          <Link href="/admin/projects" className={`text-sm ${isActive("/admin/projects") ? "font-semibold" : "text-gray-300"}`}>Projects</Link>
          <Link href="/admin/tasks" className={`text-sm ${isActive("/admin/tasks") ? "font-semibold" : "text-gray-300"}`}>Tasks</Link>
          <Link href="/admin/templates" className={`text-sm ${isActive("/admin/templates") ? "font-semibold" : "text-gray-300"}`}>Templates</Link>
          <Link href="/admin/channels" className={`text-sm ${isActive("/admin/channels") ? "font-semibold" : "text-gray-300"}`}>Channels</Link>
        </div>
        <button onClick={onLogout} disabled={loading} className="text-sm bg-white text-black px-3 py-1 rounded">{loading ? "Logging out..." : "Logout"}</button>
      </div>
    </div>
  );
}
