"use client";

import { useState } from "react";

export default function DepartmentSettingsForm({ department, members = [], otherDepartments = [] }) {
  const [name, setName] = useState(department.name || "");
  const [description, setDescription] = useState(department.description || "");
  const [archived, setArchived] = useState(!!department.archived);
  const [head, setHead] = useState(department.head?._id || "");
  const [managers, setManagers] = useState((department.managers || []).map((m) => m._id));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function toggleManager(id, checked) {
    setManagers((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`/api/departments/${department._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), archived, head: head || null, managers }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.message || "Failed to save");
      } else {
        setMessage("Saved!");
      }
    } catch (e) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <input value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div className="flex items-center gap-2">
          <input id="archived" type="checkbox" checked={archived} onChange={(e)=>setArchived(e.target.checked)} />
          <label htmlFor="archived" className="text-sm">Archived</label>
        </div>
        <div>
          <label className="block text-sm mb-1">Head</label>
          <select value={head} onChange={(e)=>setHead(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Unassigned</option>
            {members.map((m)=> (
              <option key={m._id} value={m._id}>{m.username} ({m.email})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Managers</label>
        <div className="flex flex-wrap gap-3">
          {members.map((m)=> (
            <label key={m._id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={managers.includes(m._id)} onChange={(e)=>toggleManager(m._id, e.target.checked)} />
              <span>{m.username}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Saving..." : "Save Settings"}</button>
        {message && <span className="ml-3 text-sm text-green-400">{message}</span>}
      </div>
    </form>
  );
}
