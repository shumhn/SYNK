"use client";

import { useState } from "react";

export default function TaskTypeModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: type?.name || "",
    label: type?.label || "",
    description: type?.description || "",
    color: type?.color || "#3b82f6",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name: form.name.trim().toLowerCase() || form.label.trim().toLowerCase(),
      label: form.label.trim(),
      description: form.description.trim(),
      color: form.color.trim(),
    };

    if (!payload.label) {
      setError("Label is required");
      setLoading(false);
      return;
    }

    try {
      const url = type ? `/api/task-types/${type._id}` : `/api/task-types`;
      const method = type ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "Failed to save");
      } else {
        onSaved?.();
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
        <h2 className="text-lg font-semibold mb-4">{type ? "Edit Task Type" : "Add Task Type"}</h2>
        {error && <div className="mb-3 p-2 bg-red-600 text-white rounded text-sm">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Label (Display Name)</label>
            <input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. Bug, Feature"
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Name (Internal ID, lowercase)</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. bug, feature (auto-generated if empty)"
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
            />
            <div className="text-xs text-gray-500 mt-1">Leave empty to auto-generate from label</div>
          </div>
          <div>
            <label className="block text-sm mb-1">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-16 h-10 rounded border border-neutral-700 bg-neutral-800"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
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
