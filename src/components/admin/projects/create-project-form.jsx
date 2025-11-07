"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateProjectForm({ departments = [], users = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    departments: [],
    managers: [],
    members: [],
    budgetAllocated: 0,
    budgetCurrency: "USD",
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleMulti(field, id, checked) {
    setForm((f) => ({
      ...f,
      [field]: checked ? [...f[field], id] : f[field].filter((x) => x !== id),
    }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: {
            allocated: Number(form.budgetAllocated) || 0,
            spent: 0,
            currency: form.budgetCurrency,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
      } else {
        router.push(`/admin/projects/${data.data.id}`);
      }
    } catch (e) {
      setErrors({ global: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  const managers = users.filter((u) => (u.roles || []).some((r) => ["admin", "hr", "manager"].includes(r)));

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-2xl">
      {errors && <div className="p-3 bg-red-600 text-white rounded">{typeof errors === "string" ? errors : JSON.stringify(errors)}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Title</label>
          <input value={form.title} onChange={(e) => update("title", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" rows={3} />
        </div>
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Budget Allocated</label>
          <input type="number" value={form.budgetAllocated} onChange={(e) => update("budgetAllocated", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Currency</label>
          <input value={form.budgetCurrency} onChange={(e) => update("budgetCurrency", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Departments</label>
        <div className="flex flex-wrap gap-3">
          {departments.map((d) => (
            <label key={d._id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.departments.includes(d._id)} onChange={(e) => toggleMulti("departments", d._id, e.target.checked)} />
              {d.name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Managers</label>
        <div className="flex flex-wrap gap-3">
          {managers.map((u) => (
            <label key={u._id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.managers.includes(u._id)} onChange={(e) => toggleMulti("managers", u._id, e.target.checked)} />
              {u.username}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Members</label>
        <div className="flex flex-wrap gap-3 max-h-40 overflow-y-auto">
          {users.map((u) => (
            <label key={u._id} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.members.includes(u._id)} onChange={(e) => toggleMulti("members", u._id, e.target.checked)} />
              {u.username}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Creating..." : "Create Project"}</button>
      </div>
    </form>
  );
}
