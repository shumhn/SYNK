"use client";

import { useState } from "react";

const ROLE_OPTIONS = ["admin", "hr", "manager", "employee", "viewer"];

export default function RolesForm({ userId, roles = [], permissions = [] }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState(roles);
  const [perms, setPerms] = useState((permissions || []).join(", "));

  function toggleRole(role, checked) {
    setSelectedRoles((r) => (checked ? Array.from(new Set([...r, role])) : r.filter((x) => x !== role)));
  }

  async function onSave(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    try {
      const payload = {
        roles: selectedRoles.length ? selectedRoles : ["employee"],
        permissions: perms
          ? perms
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      };
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
        return;
      }
    } catch (e) {
      setErrors({ global: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      {errors && (
        <div className="p-3 bg-red-600 text-white rounded">
          {typeof errors === "string" ? errors : JSON.stringify(errors)}
        </div>
      )}

      <div className="space-y-2">
        {ROLE_OPTIONS.map((r) => (
          <label key={r} className="flex items-center gap-2">
            <input type="checkbox" defaultChecked={selectedRoles.includes(r)} onChange={(e)=>toggleRole(r, e.target.checked)} />
            <span className="text-sm">{r}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="block text-sm mb-1">Permissions (comma separated)</label>
        <input value={perms} onChange={(e)=>setPerms(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
