"use client";

import { useEffect, useState } from "react";

export default function TemplateTaskModal({ projectId, users = [], onClose, onSave }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState({ assignee: "", dueDate: "" });

  useEffect(() => {
    (async function load() {
      try {
        const res = await fetch("/api/task-templates");
        const data = await res.json();
        if (!data.error) setTemplates(data.data || []);
      } catch (e) {}
    })();
  }, []);

  async function onUse() {
    if (!selected) return alert("Select a template");
    setLoading(true);
    try {
      const res = await fetch(`/api/task-templates/${selected}/use`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: projectId,
          assignee: form.assignee || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        onSave?.();
      } else {
        alert(data.message || "Failed to create from template");
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Create Task from Template</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Template</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            >
              <option value="">Select a template</option>
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Assignee (optional)</label>
              <select
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              >
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Due Date (optional)</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
              />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              disabled={loading}
              onClick={onUse}
              className="bg-white text-black px-4 py-2 rounded"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded border border-neutral-800">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
