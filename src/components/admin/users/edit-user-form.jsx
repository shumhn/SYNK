"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contractor", label: "Contractor" },
];

export default function EditUserForm({ user, departments = [], teams = [] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);

  const [form, setForm] = useState({
    username: user.username || "",
    email: user.email || "",
    designation: user.designation || "",
    employmentType: user.employmentType || "",
    department: user.department?._id || "",
    team: user.team?._id || "",
    profileCompletion: typeof user?.profile?.completion === 'number' ? user.profile.completion : 0,
    skills: (user?.profile?.skills || []).join(", "),
    experience: (user?.profile?.experience || []).map((exp, i) => ({
      id: i,
      company: exp.company || "",
      title: exp.title || "",
      startDate: exp.startDate ? new Date(exp.startDate).toISOString().slice(0, 10) : "",
      endDate: exp.endDate ? new Date(exp.endDate).toISOString().slice(0, 10) : "",
      description: exp.description || "",
    })),
    social: {
      linkedin: user?.profile?.social?.linkedin || "",
      github: user?.profile?.social?.github || "",
      twitter: user?.profile?.social?.twitter || "",
      website: user?.profile?.social?.website || "",
    },
    performance: {
      tasksCompleted: user?.performance?.tasksCompleted || 0,
      onTimeRate: user?.performance?.onTimeRate || 0,
      velocity: user?.performance?.velocity || 0,
    },
  });

  const teamsByDept = useMemo(() => {
    const map = {};
    for (const t of teams) {
      const key = t.department?._id || "";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [teams]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErrors(null);
    setLoading(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        designation: form.designation || undefined,
        employmentType: form.employmentType || undefined,
        department: form.department || undefined,
        team: form.team || undefined,
        profile: {
          completion: Number(form.profileCompletion) || 0,
          skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
          experience: form.experience
            .filter((exp) => exp.company || exp.title)
            .map((exp) => ({
              company: exp.company || undefined,
              title: exp.title || undefined,
              startDate: exp.startDate ? new Date(exp.startDate).toISOString() : undefined,
              endDate: exp.endDate ? new Date(exp.endDate).toISOString() : undefined,
              description: exp.description || undefined,
            })),
          social: {
            linkedin: form.social.linkedin || undefined,
            github: form.social.github || undefined,
            twitter: form.social.twitter || undefined,
            website: form.social.website || undefined,
          },
        },
        performance: {
          tasksCompleted: Number(form.performance.tasksCompleted) || 0,
          onTimeRate: Number(form.performance.onTimeRate) || 0,
          velocity: Number(form.performance.velocity) || 0,
          lastUpdatedAt: new Date().toISOString(),
        },
      };

      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrors(data.message || data);
        return;
      }
      router.refresh();
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
          <input name="username" value={form.username} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" name="email" value={form.email} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Designation</label>
          <input name="designation" value={form.designation} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Employment Type</label>
          <select name="employmentType" value={form.employmentType} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Select</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Department</label>
          <select name="department" value={form.department} onChange={(e)=>{
            const v = e.target.value;
            setForm((f)=> ({...f, department: v, team: ''}));
          }} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Unassigned</option>
            {departments.map((d)=> (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Team</label>
          <select name="team" value={form.team} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="">Unassigned</option>
            {(teamsByDept[form.department || ""] || teams).map((t)=> (
              <option key={t._id} value={t._id}>{t.name}{t.department?.name ? ` (${t.department.name})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Profile Completion (0-100)</label>
          <input type="number" min={0} max={100} name="profileCompletion" value={form.profileCompletion} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Skills (comma separated)</label>
          <input name="skills" value={form.skills} onChange={onChange} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-4 mt-4">
        <h3 className="text-lg mb-3">Experience</h3>
        {form.experience.map((exp, i) => (
          <div key={exp.id} className="mb-4 p-3 border border-neutral-700 rounded">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
              <input
                placeholder="Company"
                value={exp.company}
                onChange={(e) => {
                  const newExp = [...form.experience];
                  newExp[i].company = e.target.value;
                  setForm({ ...form, experience: newExp });
                }}
                className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
              <input
                placeholder="Title"
                value={exp.title}
                onChange={(e) => {
                  const newExp = [...form.experience];
                  newExp[i].title = e.target.value;
                  setForm({ ...form, experience: newExp });
                }}
                className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
              <input
                type="date"
                placeholder="Start Date"
                value={exp.startDate}
                onChange={(e) => {
                  const newExp = [...form.experience];
                  newExp[i].startDate = e.target.value;
                  setForm({ ...form, experience: newExp });
                }}
                className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
              <input
                type="date"
                placeholder="End Date"
                value={exp.endDate}
                onChange={(e) => {
                  const newExp = [...form.experience];
                  newExp[i].endDate = e.target.value;
                  setForm({ ...form, experience: newExp });
                }}
                className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
            <textarea
              placeholder="Description"
              value={exp.description}
              onChange={(e) => {
                const newExp = [...form.experience];
                newExp[i].description = e.target.value;
                setForm({ ...form, experience: newExp });
              }}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              rows={2}
            />
            <button
              type="button"
              onClick={() => {
                const newExp = form.experience.filter((_, idx) => idx !== i);
                setForm({ ...form, experience: newExp });
              }}
              className="text-red-400 text-sm mt-1"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setForm({
              ...form,
              experience: [
                ...form.experience,
                {
                  id: Date.now(),
                  company: "",
                  title: "",
                  startDate: "",
                  endDate: "",
                  description: "",
                },
              ],
            });
          }}
          className="text-sm bg-neutral-800 px-3 py-1 rounded"
        >
          Add Experience
        </button>
      </div>

      <div className="border-t border-neutral-800 pt-4 mt-4">
        <h3 className="text-lg mb-3">Social Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">LinkedIn</label>
            <input
              value={form.social.linkedin}
              onChange={(e) => setForm({ ...form, social: { ...form.social, linkedin: e.target.value } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">GitHub</label>
            <input
              value={form.social.github}
              onChange={(e) => setForm({ ...form, social: { ...form.social, github: e.target.value } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Twitter</label>
            <input
              value={form.social.twitter}
              onChange={(e) => setForm({ ...form, social: { ...form.social, twitter: e.target.value } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Website</label>
            <input
              value={form.social.website}
              onChange={(e) => setForm({ ...form, social: { ...form.social, website: e.target.value } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-4 mt-4">
        <h3 className="text-lg mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Tasks Completed</label>
            <input
              type="number"
              value={form.performance.tasksCompleted}
              onChange={(e) => setForm({ ...form, performance: { ...form.performance, tasksCompleted: Number(e.target.value) || 0 } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">On-Time Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.performance.onTimeRate}
              onChange={(e) => setForm({ ...form, performance: { ...form.performance, onTimeRate: Number(e.target.value) || 0 } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Velocity</label>
            <input
              type="number"
              step={0.1}
              value={form.performance.velocity}
              onChange={(e) => setForm({ ...form, performance: { ...form.performance, velocity: Number(e.target.value) || 0 } })}
              className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
