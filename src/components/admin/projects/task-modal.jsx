"use client";

import { useState } from "react";

export default function TaskModal({ projectId, task, milestones = [], users = [], onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    milestone: task?.milestone?._id || "",
    assignee: task?.assignee?._id || "",
    assignees: task?.assignees?.map((a) => a._id || a) || [],
    status: task?.status || "todo",
    priority: task?.priority || "medium",
    taskType: task?.taskType || "task",
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    estimatedHours: task?.estimatedHours || 0,
    tags: task?.tags?.join(", ") || "",
    checklist: task?.checklist || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = task ? `/api/tasks/${task._id}` : `/api/projects/${projectId}/tasks`;
      const method = task ? "PATCH" : "POST";
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "Failed to save");
      } else {
        onSave?.();
        onClose();
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-neutral-900 p-6 rounded max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{task ? "Edit Task" : "Create Task"}</h2>
        {error && <div className="mb-3 p-2 bg-red-600 text-white rounded text-sm">{String(error)}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Milestone</label>
              <select
                value={form.milestone}
                onChange={(e) => setForm({ ...form, milestone: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              >
                <option value="">None</option>
                {milestones.map((m) => (
                  <option key={m._id} value={m._id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Assignee</label>
              <select
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.username}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Task Type</label>
            <select
              value={form.taskType}
              onChange={(e) => setForm({ ...form, taskType: e.target.value })}
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
            >
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
            <label className="block text-sm mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. frontend, urgent, design"
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Est. Hours</label>
              <input
                type="number"
                value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button disabled={loading} className="bg-white text-black px-4 py-2 rounded">
              {loading ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border border-neutral-700">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
