"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditTemplateModal({ template }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: template.name || "",
    description: template.description || "",
    taskType: template.taskType || "task",
    priority: template.priority || "medium",
    estimatedHours: template.estimatedHours || 0,
    tags: (template.tags || []).join(", "),
    checklist: (template.checklist || []).map((c) => ({ text: c.text || "", order: c.order || 0 })),
    subtasks: (template.subtasks || []).map((s) => ({ title: s.title || "", description: s.description || "", estimatedHours: s.estimatedHours || 0 })),
    isPublic: !!template.isPublic,
  });

  function update(field, value) { setForm((f) => ({ ...f, [field]: value })); }
  function updateChecklist(i, patch) { update("checklist", form.checklist.map((it, idx) => (idx === i ? { ...it, ...patch } : it))); }
  function addChecklist() { update("checklist", [...form.checklist, { text: "", order: form.checklist.length }]); }
  function removeChecklist(i) { update("checklist", form.checklist.filter((_, idx) => idx !== i)); }
  function addSubtask() { update("subtasks", [...form.subtasks, { title: "", description: "", estimatedHours: 0 }]); }
  function updateSubtask(i, patch) { update("subtasks", form.subtasks.map((s, idx) => (idx === i ? { ...s, ...patch } : s))); }
  function removeSubtask(i) { update("subtasks", form.subtasks.filter((_, idx) => idx !== i)); }

  async function onSave(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/task-templates/${template._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) alert(data.message || "Failed to save template");
      else {
        setOpen(false);
        router.refresh();
      }
    } catch (e) { alert("Unexpected error"); }
    finally { setLoading(false); }
  }

  async function onDelete() {
    if (!confirm("Delete this template?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/task-templates/${template._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) alert(data.message || "Failed to delete template");
      else router.refresh();
    } catch (e) { alert("Unexpected error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-4 rounded border border-neutral-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{template.name}</div>
          <div className="text-xs text-gray-400">{template.taskType} • {template.priority} {template.isPublic ? "• Public" : ""}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setOpen(!open)} className="text-sm bg-neutral-800 px-3 py-1 rounded">{open ? "Close" : "Edit"}</button>
          <button onClick={onDelete} className="text-sm text-red-400 underline">Delete</button>
        </div>
      </div>
      {open && (
        <form onSubmit={onSave} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name} onChange={(e)=>update("name", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
            <select value={form.taskType} onChange={(e)=>update("taskType", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="meeting">Meeting</option>
              <option value="idea">Idea</option>
              <option value="review">Review</option>
              <option value="research">Research</option>
            </select>
            <select value={form.priority} onChange={(e)=>update("priority", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
            <input type="number" value={form.estimatedHours} onChange={(e)=>update("estimatedHours", Number(e.target.value)||0)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
          </div>
          <textarea value={form.description} onChange={(e)=>update("description", e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
          <input value={form.tags} onChange={(e)=>update("tags", e.target.value)} placeholder="tags (comma separated)" className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Checklist</div>
              <button type="button" onClick={addChecklist} className="text-xs bg-neutral-800 px-2 py-1 rounded">Add</button>
            </div>
            {form.checklist.map((item, i) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                <input value={item.text} onChange={(e)=>updateChecklist(i, { text: e.target.value })} className="col-span-5 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
                <button type="button" onClick={()=>removeChecklist(i)} className="text-red-400 underline text-xs">Remove</button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Subtasks</div>
              <button type="button" onClick={addSubtask} className="text-xs bg-neutral-800 px-2 py-1 rounded">Add</button>
            </div>
            {form.subtasks.map((st, i) => (
              <div key={i} className="grid grid-cols-6 gap-2">
                <input value={st.title} onChange={(e)=>updateSubtask(i, { title: e.target.value })} className="col-span-2 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
                <input value={st.description} onChange={(e)=>updateSubtask(i, { description: e.target.value })} className="col-span-3 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
                <input type="number" value={st.estimatedHours} onChange={(e)=>updateSubtask(i, { estimatedHours: Number(e.target.value)||0 })} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
                <button type="button" onClick={()=>removeSubtask(i)} className="text-red-400 underline text-xs col-span-6 text-left">Remove</button>
              </div>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.isPublic} onChange={(e)=>update("isPublic", e.target.checked)} /> Public
          </label>

          <div>
            <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
