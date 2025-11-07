"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TemplateForm({ onSavedPath = "/admin/templates" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    taskType: "task",
    priority: "medium",
    estimatedHours: 0,
    tags: "",
    checklist: [{ text: "", order: 0 }],
    subtasks: [],
    isPublic: false,
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateChecklist(i, patch) {
    const next = form.checklist.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    update("checklist", next);
  }

  function addChecklist() {
    update("checklist", [...form.checklist, { text: "", order: form.checklist.length }]);
  }

  function removeChecklist(i) {
    update("checklist", form.checklist.filter((_, idx) => idx !== i));
  }

  function addSubtask() {
    update("subtasks", [...form.subtasks, { title: "", description: "", estimatedHours: 0 }]);
  }

  function updateSubtask(i, patch) {
    update("subtasks", form.subtasks.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function removeSubtask(i) {
    update("subtasks", form.subtasks.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to create template");
      } else {
        router.push(onSavedPath);
        router.refresh();
      }
    } catch (e) {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input value={form.name} onChange={(e)=>update("name", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Task Type</label>
          <select value={form.taskType} onChange={(e)=>update("taskType", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="meeting">Meeting</option>
            <option value="idea">Idea</option>
            <option value="review">Review</option>
            <option value="research">Research</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Priority</label>
          <select value={form.priority} onChange={(e)=>update("priority", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Estimated Hours</label>
          <input type="number" value={form.estimatedHours} onChange={(e)=>update("estimatedHours", Number(e.target.value)||0)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1">Description</label>
        <textarea value={form.description} onChange={(e)=>update("description", e.target.value)} rows={3} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
      </div>

      <div>
        <label className="block text-sm mb-1">Tags (comma separated)</label>
        <input value={form.tags} onChange={(e)=>update("tags", e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Checklist</h3>
          <button type="button" onClick={addChecklist} className="text-sm bg-neutral-800 px-3 py-1 rounded">Add Item</button>
        </div>
        {form.checklist.map((item, i) => (
          <div key={i} className="grid grid-cols-6 gap-2">
            <input value={item.text} onChange={(e)=>updateChecklist(i, { text: e.target.value })} placeholder="Item text" className="col-span-5 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
            <button type="button" onClick={()=>removeChecklist(i)} className="text-red-400 underline text-sm">Remove</button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Subtasks</h3>
          <button type="button" onClick={addSubtask} className="text-sm bg-neutral-800 px-3 py-1 rounded">Add Subtask</button>
        </div>
        {form.subtasks.map((st, i) => (
          <div key={i} className="grid grid-cols-6 gap-2">
            <input value={st.title} onChange={(e)=>updateSubtask(i, { title: e.target.value })} placeholder="Title" className="col-span-2 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
            <input value={st.description} onChange={(e)=>updateSubtask(i, { description: e.target.value })} placeholder="Description" className="col-span-3 px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
            <input type="number" value={st.estimatedHours} onChange={(e)=>updateSubtask(i, { estimatedHours: Number(e.target.value)||0 })} placeholder="Est. Hrs" className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800" />
            <button type="button" onClick={()=>removeSubtask(i)} className="text-red-400 underline text-sm col-span-6 text-left">Remove</button>
          </div>
        ))}
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.isPublic} onChange={(e)=>update("isPublic", e.target.checked)} /> Public template
      </label>

      <div>
        <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">{loading ? "Creating..." : "Create Template"}</button>
      </div>
    </form>
  );
}
