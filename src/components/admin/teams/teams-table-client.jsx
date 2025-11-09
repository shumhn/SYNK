"use client";

import { useState } from "react";

export default function TeamsTableClient({ teams = [], departments = [] }) {
  const [list, setList] = useState(teams);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", description: "" });

  function openEdit(t) {
    setEditing(t);
    setForm({ name: t.name || "", department: t.department?._id || "", description: t.description || "" });
  }

  function closeEdit() {
    setEditing(null);
    setForm({ name: "", department: "", description: "" });
  }

  async function submitEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${editing._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), department: form.department || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to update");
        return;
      }
      const dep = departments.find((d) => d._id === form.department) || null;
      setList((prev) => prev.map((x) => (x._id === editing._id ? { ...x, name: form.name, description: form.description, department: dep } : x)));
      closeEdit();
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(t) {
    if (!confirm("Delete this team?")) return;
    const res = await fetch(`/api/teams/${t._id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.message || "Failed to delete");
      return;
    }
    setList((prev) => prev.filter((x) => x._id !== t._id));
  }

  function formatDate(d) {
    if (!d) return "-";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
  }

  return (
    <div className="overflow-x-auto rounded border border-neutral-800">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-900">
          <tr>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Department</th>
            <th className="text-left p-3">Description</th>
            <th className="text-left p-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t._id} className="border-t border-neutral-800">
              <td className="p-3">{t.name}</td>
              <td className="p-3 text-gray-300">{t.department?.name || "-"}</td>
              <td className="p-3 text-gray-300">{t.description || "-"}</td>
              <td className="p-3 text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="mr-2">{formatDate(t.createdAt)}</span>
                  <button onClick={() => openEdit(t)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900 text-xs">Edit</button>
                  <button onClick={() => onDelete(t)} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900 text-xs text-red-400">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td className="p-4 text-center text-gray-400" colSpan={4}>No teams found.</td>
            </tr>
          )}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={closeEdit}>
          <div className="bg-neutral-900 p-6 rounded w-full max-w-lg" onClick={(e)=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Edit Team</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
              </div>
              <div>
                <label className="block text-sm mb-1">Department</label>
                <select value={form.department} onChange={(e)=>setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700">
                  <option value="">No Department</option>
                  {departments.map((d)=> (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <input value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={submitEdit} disabled={saving} className="bg-white text-black px-4 py-2 rounded">{saving ? "Saving..." : "Save"}</button>
                <button onClick={closeEdit} className="px-4 py-2 rounded border border-neutral-700">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
