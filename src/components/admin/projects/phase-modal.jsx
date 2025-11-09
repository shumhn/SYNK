"use client";

import { useState } from "react";

export default function PhaseModal({ projectId, phase, onClose, onSave }) {
  const [form, setForm] = useState({
    title: phase?.title || "",
    description: phase?.description || "",
    startDate: phase?.startDate ? new Date(phase.startDate).toISOString().slice(0, 10) : "",
    endDate: phase?.endDate ? new Date(phase.endDate).toISOString().slice(0, 10) : "",
    status: phase?.status || "planned",
    order: phase?.order || 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = phase
        ? `/api/projects/${projectId}/phases/${phase._id}`
        : `/api/projects/${projectId}/phases`;
      const method = phase ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "Failed to save");
      } else {
        onSave?.();
        onClose?.();
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 p-6 rounded max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{phase ? "Edit Phase" : "Create Phase"}</h2>
        {error && <div className="mb-3 p-2 bg-red-600 text-white rounded text-sm">{String(error)}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              >
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
              {loading ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-neutral-700">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
