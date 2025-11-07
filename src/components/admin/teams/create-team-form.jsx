"use client";

import { useState } from "react";

export default function CreateTeamForm({ departments = [] }) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          department: department || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.message || "Failed to create");
      } else {
        setMessage("Created!");
        setName("");
        setDepartment("");
        setDescription("");
        window.location.reload();
      }
    } catch (e) {
      setMessage("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Team name"
        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
        required
      />
      <select
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
      >
        <option value="">No Department</option>
        {departments.map((d) => (
          <option key={d._id} value={d._id}>{d.name}</option>
        ))}
      </select>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
      />
      <button disabled={loading} className="bg-white text-black px-3 py-2 rounded">
        {loading ? "Creating..." : "Create"}
      </button>
      {message && <span className="text-sm text-green-400">{message}</span>}
    </form>
  );
}
