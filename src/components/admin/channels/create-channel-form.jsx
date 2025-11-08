"use client";

import { useState } from "react";

export default function CreateChannelForm({ departments = [] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDeps, setSelectedDeps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function toggleDep(id, checked) {
    setSelectedDeps((prev) => (checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, departments: selectedDeps }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.message || "Failed to create");
      } else {
        setMessage("Created!");
        setName("");
        setDescription("");
        setSelectedDeps([]);
        window.location.reload();
      }
    } catch (e) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1 grid md:grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name"
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          required
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
        />
      </div>

      <div className="md:min-w-[320px]">
        <label className="block text-sm mb-1">Departments</label>
        <div className="flex flex-wrap gap-2 p-2 rounded border border-neutral-800 bg-neutral-900">
          {departments.length === 0 && (
            <span className="text-xs text-gray-400">No departments yet</span>
          )}
          {departments.map((d) => (
            <label key={d._id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-800 border border-neutral-700">
              <input
                type="checkbox"
                className="accent-white"
                checked={selectedDeps.includes(d._id)}
                onChange={(e) => toggleDep(d._id, e.target.checked)}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={loading} className="bg-white text-black px-3 py-2 rounded">
          {loading ? "Creating..." : "Create"}
        </button>
        {message && <span className="text-sm text-green-400">{message}</span>}
      </div>
    </form>
  );
}
