"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteUserButton({ userId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (loading) return;
    const ok = confirm("Are you sure you want to permanently delete this user? This cannot be undone.");
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        alert(data?.message || "Failed to delete user");
        return;
      }
      router.push("/admin/users");
      router.refresh();
    } catch (e) {
      alert("Unexpected error while deleting user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={loading}
      className="px-3 py-1 rounded border border-red-700 text-red-300 hover:bg-red-900/20 disabled:opacity-50"
      title="Delete User"
    >
      {loading ? "Deleting..." : "Delete User"}
    </button>
  );
}
