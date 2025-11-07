"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectActions({ projectId, archived }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDuplicate() {
    if (!confirm("Duplicate this project?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to duplicate");
      } else {
        router.push(`/admin/projects/${data.data.id}`);
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function onToggleArchive() {
    if (!confirm(archived ? "Unarchive this project?" : "Archive this project?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to update");
      } else {
        router.refresh();
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button onClick={onDuplicate} disabled={loading} className="text-sm px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
        Duplicate
      </button>
      <button onClick={onToggleArchive} disabled={loading} className="text-sm px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
        {archived ? "Unarchive" : "Archive"}
      </button>
    </div>
  );
}
