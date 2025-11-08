"use client";

import { useState } from "react";

const ROLE_OPTIONS = ["admin", "hr", "manager", "employee", "viewer"];

export default function RolesForm({ userId, roles = [], permissions = [] }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState(roles);
  const [perms, setPerms] = useState(Array.isArray(permissions) ? permissions : []);
  const [tagInput, setTagInput] = useState("");

  function toggleRole(role, checked) {
    setSelectedRoles((r) => (checked ? Array.from(new Set([...r, role])) : r.filter((x) => x !== role)));
  }

  function addPermission(value) {
    const v = (value || "").trim();
    if (!v) return;
    setPerms((prev) => Array.from(new Set([...prev, v])));
    setTagInput("");
  }

  function removePermission(value) {
    setPerms((prev) => prev.filter((p) => p !== value));
  }

  function onPermKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addPermission(tagInput);
    }
    if (e.key === "Backspace" && !tagInput) {
      // quick remove last
      setPerms((prev) => prev.slice(0, -1));
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    try {
      const payload = {
        roles: selectedRoles.length ? selectedRoles : ["employee"],
        permissions: perms,
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
        <label className="block text-sm mb-1">Permissions</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {perms.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-neutral-800 border border-neutral-700">
              {p}
              <button type="button" className="text-gray-400 hover:text-white" onClick={() => removePermission(p)}>×</button>
            </span>
          ))}
          {perms.length === 0 && <span className="text-xs text-gray-400">No permissions</span>}
        </div>
        <input
          value={tagInput}
          onChange={(e)=>setTagInput(e.target.value)}
          onKeyDown={onPermKeyDown}
          placeholder="Type and press Enter"
          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
        />
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
