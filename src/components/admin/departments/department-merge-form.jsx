"use client";

import { useState } from "react";

export default function DepartmentMergeForm({ sourceId, departments = [] }) {
  const [targetId, setTargetId] = useState("");
  const [archiveSource, setArchiveSource] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (!targetId) {
      setMessage("Please select a target department");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/departments/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceId, targetId, archiveSource }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.message || "Failed to merge");
      } else {
        setMessage("Merged!");
      }
    } catch (e) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Merge into</label>
        <select value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">Select department</option>
          {departments.map((d)=> (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={archiveSource} onChange={(e)=>setArchiveSource(e.target.checked)} />
        Archive source after merge
      </label>
      <div>
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Merging..." : "Merge"}</button>
        {message && <span className="ml-3 text-sm text-green-400">{message}</span>}
      </div>
    </form>
  );
}
