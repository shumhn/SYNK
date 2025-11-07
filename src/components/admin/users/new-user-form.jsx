"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

const ROLE_OPTIONS = ["admin", "hr", "manager", "employee", "viewer"];
const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
];

export default function NewUserForm({ departments = [], teams = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  const teamsByDept = useMemo(() => {
    const map = {};
    for (const t of teams) {
      const key = t.department?._id || "";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [teams]);

  async function onSubmit(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      username: fd.get("username")?.toString().trim(),
      email: fd.get("email")?.toString().trim(),
      password: fd.get("password")?.toString(),
      designation: fd.get("designation")?.toString().trim() || undefined,
      employmentType: fd.get("employmentType") || undefined,
      department: fd.get("department") || undefined,
      team: fd.get("team") || undefined,
      roles: Array.from(e.currentTarget.querySelectorAll('input[name="roles"]:checked')).map((i) => i.value),
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
        return;
      }
      router.push("/admin/users");
    } catch (e) {
      setErrors({ global: "Unexpected error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors && (
        <div className="p-3 bg-red-600 text-white rounded">
          {typeof errors === "string" ? errors : JSON.stringify(errors)}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input name="username" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" name="email" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input type="password" name="password" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Designation</label>
          <input name="designation" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Employment Type</label>
          <select name="employmentType" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Select</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Department</label>
          <select name="department" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" onChange={(e)=>{
            const deptId = e.target.value;
            const options = document.querySelectorAll('select[name="team"] option');
            options.forEach((o)=>{
              const d = o.getAttribute('data-dept');
              o.hidden = d && deptId && d !== deptId;
            });
          }}>
            <option value="">Unassigned</option>
            {departments.map((d)=> (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Team</label>
          <select name="team" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Unassigned</option>
            {teams.map((t)=> (
              <option key={t._id} value={t._id} data-dept={t.department?._id || ""}>{t.name}{t.department?.name ? ` (${t.department.name})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2">Roles</label>
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((r)=> (
            <label key={r} className="inline-flex items-center gap-2">
              <input type="checkbox" name="roles" value={r} defaultChecked={r === "employee"} />
              <span className="text-sm">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
