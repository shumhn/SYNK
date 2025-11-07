"use client";

import { useState } from "react";

export default function DepartmentKpisForm({ departmentId, initial = [] }) {
  const [items, setItems] = useState(
    (initial || []).map((k) => ({ key: k.key, label: k.label, target: k.target || 0, current: k.current || 0, unit: k.unit || "" }))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function update(i, patch) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function add() {
    setItems((prev) => [...prev, { key: "", label: "", target: 0, current: 0, unit: "" }]);
  }

  function remove(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSave(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const payload = { kpis: items.filter((k) => (k.key || "").trim()) };
      const res = await fetch(`/api/departments/${departmentId}/kpis`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.message || "Failed to save KPIs");
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
    <form onSubmit={onSave} className="space-y-3">
      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-2">Key</th>
              <th className="text-left p-2">Label</th>
              <th className="text-left p-2">Target</th>
              <th className="text-left p-2">Current</th>
              <th className="text-left p-2">Unit</th>
              <th className="text-left p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((k, i) => (
              <tr key={i} className="border-t border-neutral-800">
                <td className="p-2"><input value={k.key} onChange={(e)=>update(i,{ key: e.target.value })} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input value={k.label} onChange={(e)=>update(i,{ label: e.target.value })} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={k.target} onChange={(e)=>update(i,{ target: Number(e.target.value)||0 })} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={k.current} onChange={(e)=>update(i,{ current: Number(e.target.value)||0 })} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input value={k.unit} onChange={(e)=>update(i,{ unit: e.target.value })} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><button type="button" onClick={()=>remove(i)} className="text-red-400 underline">Remove</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-gray-400">No KPIs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={add} className="text-sm bg-neutral-800 px-3 py-1 rounded">Add KPI</button>
        <button disabled={loading} className="text-sm bg-white text-black px-3 py-1 rounded">{loading ? "Saving..." : "Save KPIs"}</button>
        {message && <span className="text-sm text-green-400">{message}</span>}
      </div>
    </form>
  );
}
