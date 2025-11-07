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
    <form onSubmit={onSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Channel name"
        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
        required
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
      />
      <div className="flex items-center gap-3">
        {departments.map((d) => (
          <label key={d._id} className="inline-flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={selectedDeps.includes(d._id)}
              onChange={(e) => toggleDep(d._id, e.target.checked)}
            />
            {d.name}
          </label>
        ))}
      </div>
      <button disabled={loading} className="bg-white text-black px-3 py-2 rounded">
        {loading ? "Creating..." : "Create"}
      </button>
      {message && <span className="text-sm text-green-400">{message}</span>}
    </form>
  );
}
