"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MilestoneModal from "./milestone-modal";
import PhaseModal from "./phase-modal";
import ObjectiveModal from "./objective-modal";
import TaskModal from "./task-modal";
import TimelineView from "./timeline-view";
import TemplateTaskModal from "./template-task-modal";
import ProjectDependencies from "./project-dependencies";
import ProjectChat from "@/components/chat/project-chat";

export default function ProjectTabs({ tab, project, milestones, phases, objectives, tasks, allDepartments, allUsers }) {
  const router = useRouter();
  const tabs = [
    "overview",
    "timeline",
    "milestones",
    "phases",
    "objectives",
    "tasks",
    "dependencies",
    "budget",
    "resources",
    "team",
    "chat",
    "files",
  ];

  function TabButton({ name, active }) {
    return (
      <Link
        href={`?tab=${name}`}
        className={`px-4 py-2 rounded-t border-b-2 ${active ? "border-white" : "border-transparent text-gray-400 hover:text-gray-300"}`}
      >
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </Link>
    );
  }

  

  return (
    <div>
      <div className="flex gap-2 border-b border-neutral-800">
        {tabs.map((t) => (
          <TabButton key={t} name={t} active={tab === t} />
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <OverviewTab project={project} milestones={milestones} tasks={tasks} />}
        {tab === "timeline" && <TimelineView project={project} milestones={milestones} tasks={tasks} phases={phases} />}
        {tab === "milestones" && <MilestonesTab project={project} milestones={milestones} />}
        {tab === "phases" && <PhasesTab project={project} phases={phases} />}
        {tab === "objectives" && (
          <ObjectivesTab project={project} phases={phases} objectives={objectives} allUsers={allUsers} />
        )}
        {tab === "tasks" && (
          <TasksTab project={project} tasks={tasks} milestones={milestones} allUsers={allUsers} />
        )}
        {tab === "dependencies" && <ProjectDependencies projectId={project._id} />}
        {tab === "budget" && <BudgetTab project={project} />}
        {tab === "resources" && <ResourcesTab project={project} />}
        {tab === "team" && <TeamTab project={project} allDepartments={allDepartments} allUsers={allUsers} />}
        {tab === "chat" && (
          <div className="h-[600px]">
            <ProjectChat projectId={project._id} />
          </div>
        )}
        {tab === "files" && <FilesTab project={project} />}
      </div>
    </div>
  );
}

function PhasesTab({ project, phases }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function onSave() {
    setShowModal(false);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id) {
    if (!confirm("Delete this phase?")) return;
    await fetch(`/api/projects/${project._id}/phases/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Phases</h3>
        <button onClick={() => setShowModal(true)} className="text-sm bg-white text-black px-3 py-1 rounded">Add Phase</button>
      </div>
      {phases.length > 0 ? (
        phases.map((p) => (
          <div key={p._id} className="p-4 border border-neutral-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{p.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-neutral-800">{p.status}</span>
                <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-xs underline">Edit</button>
                <button onClick={() => onDelete(p._id)} className="text-xs text-red-400 underline">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-400">{p.description || "No description"}</p>
            <div className="text-xs text-gray-500 mt-2">
              <div>Start: {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"}</div>
              <div>End: {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}</div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No phases yet.</div>
      )}
      {showModal && (
        <PhaseModal
          projectId={project._id}
          phase={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function ObjectivesTab({ project, phases, objectives, allUsers }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const teamUserIds = new Set([...(project.managers || []), ...(project.members || [])].map((u) => (u._id || u).toString()));
  const teamUsers = (allUsers || []).filter((u) => teamUserIds.has((u._id || u).toString()));

  function onSave() {
    setShowModal(false);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id) {
    if (!confirm("Delete this objective?")) return;
    await fetch(`/api/projects/${project._id}/objectives/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Objectives</h3>
        <button onClick={() => setShowModal(true)} className="text-sm bg-white text-black px-3 py-1 rounded">Add Objective</button>
      </div>
      {objectives.length > 0 ? (
        objectives.map((o) => (
          <div key={o._id} className="p-4 border border-neutral-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{o.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-neutral-800">{o.status}</span>
                <button onClick={() => { setEditing(o); setShowModal(true); }} className="text-xs underline">Edit</button>
                <button onClick={() => onDelete(o._id)} className="text-xs text-red-400 underline">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-400">{o.description || "No description"}</p>
            <div className="text-xs text-gray-500 mt-2">
              <div>Due: {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "—"}</div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No objectives yet.</div>
      )}
      {showModal && (
        <ObjectiveModal
          projectId={project._id}
          objective={editing}
          phases={phases}
          users={teamUsers}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function OverviewTab({ project, milestones, tasks }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold mb-2">Description</h3>
        <p className="text-gray-300">{project.description || "No description provided."}</p>
      </section>
      
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Milestones" value={milestones.length} />
        <StatCard label="Tasks" value={tasks.length} />
        <StatCard label="Completed" value={tasks.filter((t) => t.status === "completed").length} />
        <StatCard label="Progress" value={`${project.progress}%`} />
      </section>
      
      <section>
        <h3 className="font-semibold mb-2">Timeline</h3>
        <div className="text-sm text-gray-300">
          <div>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</div>
          <div>End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}</div>
        </div>
      </section>
    </div>
  );
}

function MilestonesTab({ project, milestones }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function onSave() {
    setShowModal(false);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id) {
    if (!confirm("Delete this milestone?")) return;
    await fetch(`/api/projects/${project._id}/milestones/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Milestones</h3>
        <button onClick={() => setShowModal(true)} className="text-sm bg-white text-black px-3 py-1 rounded">Add Milestone</button>
      </div>
      {milestones.length > 0 ? (
        milestones.map((m) => (
          <div key={m._id} className="p-4 border border-neutral-800 rounded">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{m.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-neutral-800">{m.status}</span>
                <button onClick={() => { setEditing(m); setShowModal(true); }} className="text-xs underline">Edit</button>
                <button onClick={() => onDelete(m._id)} className="text-xs text-red-400 underline">Delete</button>
              </div>
            </div>
            <p className="text-sm text-gray-400">{m.description || "No description"}</p>
            <div className="text-xs text-gray-500 mt-2">Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "—"}</div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No milestones yet.</div>
      )}
      {showModal && (
        <MilestoneModal
          projectId={project._id}
          milestone={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function TasksTab({ project, tasks, milestones, allUsers }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  function onSave() {
    setShowModal(false);
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tasks</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplateModal(true)} className="text-sm px-3 py-1 rounded border border-neutral-700 hover:bg-neutral-900">From Template</button>
          <button onClick={() => setShowModal(true)} className="text-sm bg-white text-black px-3 py-1 rounded">Add Task</button>
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="overflow-x-auto rounded border border-neutral-800">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Assignee</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Priority</th>
                <th className="text-left p-3">Due</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t._id} className="border-t border-neutral-800">
                  <td className="p-3">{t.title}</td>
                  <td className="p-3">{t.assignee?.username || "—"}</td>
                  <td className="p-3">{t.status}</td>
                  <td className="p-3">{t.priority}</td>
                  <td className="p-3">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="p-3">
                    <button onClick={() => { setEditing(t); setShowModal(true); }} className="text-xs underline mr-2">Edit</button>
                    <button onClick={() => onDelete(t._id)} className="text-xs text-red-400 underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No tasks yet.</div>
      )}
      {showModal && (
        <TaskModal
          projectId={project._id}
          task={editing}
          milestones={milestones}
          users={allUsers}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
      {showTemplateModal && (
        <TemplateTaskModal
          projectId={project._id}
          users={allUsers}
          onClose={() => setShowTemplateModal(false)}
          onSave={() => { setShowTemplateModal(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function BudgetTab({ project }) {
  const initial = {
    allocated: project.budget?.allocated || 0,
    spent: project.budget?.spent || 0,
    currency: project.budget?.currency || "USD",
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const allocated = Number(form.allocated) || 0;
  const spent = Number(form.spent) || 0;
  const remaining = allocated - spent;
  const percentSpent = allocated ? Math.round((spent / allocated) * 100) : 0;

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ budget: { allocated: allocated < 0 ? 0 : allocated, spent: spent < 0 ? 0 : spent, currency: form.currency || "USD" } }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to save budget");
      } else {
        // no-op; parent refresh triggered elsewhere when needed
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Allocated" value={`${allocated} ${form.currency}`} />
        <StatCard label="Spent" value={`${spent} ${form.currency}`} />
        <StatCard label="Remaining" value={`${remaining} ${form.currency}`} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">Budget Usage</h3>
        <div className="w-full bg-neutral-900 rounded-full h-4">
          <div className="bg-green-600 h-4 rounded-full" style={{ width: `${Math.min(percentSpent, 100)}%` }} />
        </div>
        <p className="text-sm text-gray-400 mt-2">{percentSpent}% spent</p>
      </section>

      <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Allocated</label>
          <input type="number" value={form.allocated} onChange={(e)=>setForm({ ...form, allocated: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Spent</label>
          <input type="number" value={form.spent} onChange={(e)=>setForm({ ...form, spent: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div>
          <label className="block text-sm mb-1">Currency</label>
          <input value={form.currency} onChange={(e)=>setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
        <div className="flex items-end">
          <button disabled={saving} className="bg-white text-black px-4 py-2 rounded w-full">{saving ? "Saving..." : "Save Budget"}</button>
        </div>
      </form>
    </div>
  );
}

function TeamTab({ project, allDepartments, allUsers }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold mb-2">Departments</h3>
        <div className="flex flex-wrap gap-2">
          {(project.departments || []).map((d) => (
            <span key={d._id} className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm">{d.name}</span>
          ))}
          {!project.departments?.length && <p className="text-gray-400">No departments assigned</p>}
        </div>
      </section>
      
      <section>
        <h3 className="font-semibold mb-2">Managers</h3>
        <div className="space-y-2">
          {(project.managers || []).map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-2 border border-neutral-800 rounded">
              <div className="w-8 h-8 rounded-full bg-neutral-800" />
              <div>
                <div className="text-sm">{m.username}</div>
                <div className="text-xs text-gray-400">{m.email}</div>
              </div>
            </div>
          ))}
          {!project.managers?.length && <p className="text-gray-400">No managers assigned</p>}
        </div>
      </section>
      
      <section>
        <h3 className="font-semibold mb-2">Members ({(project.members || []).length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(project.members || []).map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-2 border border-neutral-800 rounded">
              <div className="w-8 h-8 rounded-full bg-neutral-800" />
              <div>
                <div className="text-sm">{m.username}</div>
                <div className="text-xs text-gray-400">{m.email}</div>
              </div>
            </div>
          ))}
          {!project.members?.length && <p className="text-gray-400">No members assigned</p>}
        </div>
      </section>
    </div>
  );
}

function ResourcesTab({ project }) {
  const router = useRouter();
  const [resources, setResources] = useState(project.resources || []);
  const [loading, setLoading] = useState(false);

  function add() {
    setResources([...resources, { type: "", name: "", quantity: 0, unit: "", unitCost: 0, hours: 0, hourlyRate: 0 }]);
  }

  function update(i, patch) {
    setResources((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function remove(i) {
    setResources((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resources: resources.filter((r) => r.name) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to save");
      } else {
        router.refresh();
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  } 
 

  function lineTotal(r) {
    const qty = Number(r.quantity) || 0;
    const unitCost = Number(r.unitCost) || 0;
    const hours = Number(r.hours) || 0;
    const hourlyRate = Number(r.hourlyRate) || 0;
    return qty * unitCost + hours * hourlyRate;
  }

  const grandTotal = resources.reduce((sum, r) => sum + lineTotal(r), 0);

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Resource Allocation</h3>
        <button type="button" onClick={add} className="text-sm bg-neutral-800 px-3 py-1 rounded">Add Resource</button>
      </div>
      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Qty</th>
              <th className="text-left p-2">Unit</th>
              <th className="text-left p-2">Unit Cost</th>
              <th className="text-left p-2">Hours</th>
              <th className="text-left p-2">Hourly Rate</th>
              <th className="text-left p-2">Line Total</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((r, i) => (
              <tr key={i} className="border-t border-neutral-800">
                <td className="p-2"><input value={r.type || ""} onChange={(e)=>update(i, {type: e.target.value})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input value={r.name || ""} onChange={(e)=>update(i, {name: e.target.value})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={r.quantity || 0} onChange={(e)=>update(i, {quantity: Number(e.target.value)||0})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input value={r.unit || ""} onChange={(e)=>update(i, {unit: e.target.value})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={r.unitCost || 0} onChange={(e)=>update(i, {unitCost: Number(e.target.value)||0})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={r.hours || 0} onChange={(e)=>update(i, {hours: Number(e.target.value)||0})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2"><input type="number" value={r.hourlyRate || 0} onChange={(e)=>update(i, {hourlyRate: Number(e.target.value)||0})} className="w-full px-2 py-1 rounded bg-neutral-900 border border-neutral-800" /></td>
                <td className="p-2 whitespace-nowrap">{(lineTotal(r) || 0).toFixed(2)}</td>
                <td className="p-2"><button type="button" onClick={()=>remove(i)} className="text-red-400 underline">Remove</button></td>
              </tr>
            ))}
            {resources.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center text-gray-400">No resources allocated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-300">
        <div>Total Planned Cost</div>
        <div className="font-semibold">{(grandTotal || 0).toFixed(2)} {project.budget?.currency || "USD"}</div>
      </div>
      <div>
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Saving..." : "Save Resources"}</button>
      </div>
    </form>
  );
}

function FilesTab({ project }) {
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ filename: "", url: "" });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function loadFiles() {
    try {
      const res = await fetch(`/api/projects/${project._id}/files`);
      const data = await res.json();
      if (!data.error) setFiles(data.data);
    } catch (e) {
      // no-op
    }
  }

  useEffect(() => { loadFiles(); }, []);

  async function onAdd(e) {
    e.preventDefault();
    if (!form.filename.trim() || !form.url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project._id}/files`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.error) {
        setFiles((prev) => [data.data, ...prev]);
        setForm({ filename: "", url: "" });
        setShowForm(false);
      }
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  }

  async function onUploadChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sigRes = await fetch(`/api/uploads/cloudinary/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: `projects/${project._id}`, uploadPreset: "zpb-uploads" }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok || sig.error) {
        alert(sig.message || "Failed to get upload signature");
        return;
      }
      const { cloudName, apiKey, timestamp, signature, folder, uploadPreset } = sig.data;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      if (folder) fd.append("folder", folder);
      if (uploadPreset) fd.append("upload_preset", uploadPreset);
      fd.append("signature", signature);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: fd });
      const up = await uploadRes.json();
      if (!uploadRes.ok || up.error) {
        alert(up.error?.message || "Upload failed");
        return;
      }
      const meta = {
        filename: up.original_filename || file.name,
        url: up.secure_url,
        size: up.bytes || file.size,
        mimeType: file.type,
        publicId: up.public_id,
        resourceType: up.resource_type,
      };
      const saveRes = await fetch(`/api/projects/${project._id}/files`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(meta),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok || saved.error) {
        alert(saved.message || "Failed to save file record");
        return;
      }
      setFiles((prev) => [saved.data, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert("Unexpected upload error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Project Files</h3>
        <button onClick={() => setShowForm(!showForm)} className="text-sm bg-white text-black px-3 py-1 rounded">{showForm ? "Cancel" : "Add File"}</button>
      </div>
      {showForm && (
        <form onSubmit={onAdd} className="p-4 rounded border border-neutral-800 space-y-3">
          <div>
            <label className="block text-sm mb-1">Filename</label>
            <input value={form.filename} onChange={(e) => setForm({ ...form, filename: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
          </div>
          <div>
            <label className="block text-sm mb-1">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
          </div>
          <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Adding..." : "Add"}</button>
        </form>
      )}
      <div className="space-y-2">
        {files.map((f) => (
          <div key={f._id} className="flex items-center justify-between p-3 rounded border border-neutral-800">
            <div>
              <div className="text-sm font-medium">{f.filename}</div>
              <div className="text-xs text-gray-400">Uploaded by {f.uploadedBy?.username} on {new Date(f.createdAt).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Download</a>
              <button onClick={() => deleteFile(f._id)} className="text-sm text-red-400 underline">Delete</button>
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">No files uploaded yet.</div>}
      </div>
      <div className="flex items-center gap-3">
        <input ref={fileInputRef} type="file" className="hidden" onChange={onUploadChange} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-white text-black px-4 py-2 rounded">
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="p-4 rounded border border-neutral-800">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
