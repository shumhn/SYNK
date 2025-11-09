"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectActions({ projectId, archived, status }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status || "planning");

  const statusOptions = [
    "planning",
    "on_track",
    "at_risk",
    "delayed",
    "completed",
    "on_hold",
    "cancelled",
  ];

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

  async function onChangeStatus(e) {
    const next = e.target.value;
    if (next === currentStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to update status");
      } else {
        setCurrentStatus(next);
        router.refresh();
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Status</label>
        <select
          value={currentStatus}
          onChange={onChangeStatus}
          disabled={updatingStatus}
          className="text-sm px-2 py-1 rounded bg-neutral-900 border border-neutral-700"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <button onClick={onDuplicate} disabled={loading} className="text-sm px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
        Duplicate
      </button>
      <button onClick={onToggleArchive} disabled={loading} className="text-sm px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
        {archived ? "Unarchive" : "Archive"}
      </button>
    </div>
  );
}
