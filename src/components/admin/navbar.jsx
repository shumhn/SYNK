"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import NotificationBell from "@/components/notifications/notification-bell";

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, [session]);

  async function fetchCurrentUser() {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/users/${session.user.id}`);
      if (!res.ok) {
        console.warn("Failed to fetch user data:", res.status, res.statusText);
        return;
      }
      const data = await res.json();
      if (!data.error) {
        setCurrentUser(data.data);
      } else {
        console.warn("API returned error:", data.message);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      // Don't set currentUser to null, just log the error
    }
  }

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
          <Link href="/admin/dashboard" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/dashboard") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Dashboard</Link>
          <Link href="/admin/users" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/users") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Users</Link>
          <Link href="/admin/departments" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/departments") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Departments</Link>
          <Link href="/admin/teams" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/teams") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Teams</Link>
          <Link href="/admin/projects" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/projects") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Projects</Link>
          <Link href="/admin/tasks" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/tasks") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Tasks</Link>
          <Link href="/admin/templates" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/templates") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Templates</Link>
          <Link href="/admin/messages" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/messages") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Messages</Link>
          <Link href="/admin/channels" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/channels") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Channels</Link>
          <Link href="/admin/files" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/files") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Files</Link>
          <Link href="/admin/settings/task-types" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/settings/task-types") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Task Types</Link>
          <Link href="/admin/settings" className={`px-3 py-2 rounded-lg text-sm font-medium transition ${isActive("/admin/settings") ? "bg-neutral-800/80 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"}`}>Settings</Link>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          
          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-800 transition"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                  <span className="text-sm font-semibold">
                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <span className="text-sm">{session?.user?.name || currentUser?.username || "User"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50">
                {/* User Info */}
                <div className="p-4 border-b border-neutral-800">
                  <p className="font-semibold text-white">{session?.user?.name || currentUser?.username}</p>
                  <p className="text-sm text-gray-400">{session?.user?.email || currentUser?.email}</p>
                  {(currentUser?.roles || session?.user?.roles) && (currentUser?.roles || session?.user?.roles).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(currentUser?.roles || session?.user?.roles || []).map((role) => (
                        <span key={role} className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  <Link
                    href={`/admin/users/${session?.user?.id || currentUser?._id}`}
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 rounded hover:bg-neutral-800 transition text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View My Profile
                    </div>
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 rounded hover:bg-neutral-800 transition text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </div>
                  </Link>
                </div>

                {/* Sign Out */}
                <div className="p-2 border-t border-neutral-800">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    disabled={loading}
                    className="w-full px-3 py-2 rounded hover:bg-neutral-800 transition text-sm text-left text-red-400 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {loading ? "Signing out..." : "Sign out"}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
