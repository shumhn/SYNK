"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TaskDetailModal from "./task-detail-modal";
import TemplatesUseModal from "./templates-use-modal";

function PriorityBadge({ priority }) {
  const colors = {
    low: "bg-gray-700 text-gray-200",
    medium: "bg-blue-700 text-blue-100",
    high: "bg-orange-700 text-orange-100",
    urgent: "bg-red-700 text-red-100",
    critical: "bg-red-900 text-red-100",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[priority] || colors.medium}`}>{priority}</span>;
}

function StatusBadge({ status }) {
  const colors = {
    todo: "bg-gray-700 text-gray-200",
    in_progress: "bg-blue-700 text-blue-100",
    review: "bg-yellow-700 text-yellow-100",
    completed: "bg-green-700 text-green-100",
    blocked: "bg-red-700 text-red-100",
  };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || colors.todo}`}>{status.replace("_", " ")}</span>;
}

export default function TasksView({ initialTasks, projects, users, taskTypes = [], filters }) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState(null);
  const [selected, setSelected] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [bulkProject, setBulkProject] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");

  async function updateTask(id, patch) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    } catch {}
  }

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelected(initialTasks.map((t) => t._id));
  }

  function clearSelection() {
    setSelected([]);
  }

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.length} tasks?`)) return;
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "delete", taskIds: selected }),
    });
    router.refresh();
    clearSelection();
  }

  async function bulkMove() {
    if (!bulkProject) return alert("Select a target project");
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "move", taskIds: selected, updates: { project: bulkProject } }),
    });
    router.refresh();
    clearSelection();
  }

  async function bulkAssign() {
    if (!bulkAssignee) return alert("Select an assignee");
    await fetch("/api/tasks/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "assign", taskIds: selected, updates: { assignee: bulkAssignee } }),
    });
    router.refresh();
    clearSelection();
  }

  return (
    <div className="space-y-4">
      <TaskFilters filters={filters} projects={projects} users={users} taskTypes={taskTypes} />

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-neutral-900 rounded border border-neutral-800">
          <span className="text-sm">{selected.length} selected</span>
          <button onClick={clearSelection} className="text-sm underline">Clear</button>
          <button onClick={bulkDelete} className="text-sm text-red-400 underline">Delete</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div />
        <button onClick={() => setShowTemplateModal(true)} className="text-sm bg-white text-black px-3 py-1 rounded">Create from template</button>
      </div>

      <div className="overflow-x-auto rounded border border-neutral-800 mt-3">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">
                <input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearSelection())} />
              </th>
              <th className="text-left p-3">Task</th>
              <th className="text-left p-3">Project</th>
              <th className="text-left p-3">Assignee</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Priority</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Due</th>
            </tr>
          </thead>
          <tbody>
            {initialTasks.map((t) => (
              <tr key={t._id} className="border-t border-neutral-800 hover:bg-neutral-950 cursor-pointer" onClick={() => setSelectedTask(t)}>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} />
                </td>
                <td className="p-3">
                  <div className="font-medium">{t.title}</div>
                  {t.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs px-1 rounded bg-neutral-800">#{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-300">{t.project?.title || "—"}</td>
                <td className="p-3">
                  {t.assignee?.username || t.assignees?.map((a) => a.username).join(", ") || "—"}
                </td>
                <td className="p-3">
                  <select
                    defaultValue={t.status}
                    onChange={(e)=>updateTask(t._id, { status: e.target.value })}
                    className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td className="p-3">
                  <select
                    defaultValue={t.priority}
                    onChange={(e)=>updateTask(t._id, { priority: e.target.value })}
                    className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </td>
                <td className="p-3">{t.taskType}</td>
                <td className="p-3 text-gray-300">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {initialTasks.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">No tasks found. Adjust filters or create new tasks.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-neutral-900 rounded border border-neutral-800">
          <span className="text-sm">Bulk:</span>
          <select value={bulkProject} onChange={(e) => setBulkProject(e.target.value)} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
            <option value="">Move → Project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.title}</option>
            ))}
          </select>
          <button onClick={bulkMove} className="text-sm underline">Move</button>
          <select value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} className="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-sm">
            <option value="">Assign → User</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.username}</option>
            ))}
          </select>
          <button onClick={bulkAssign} className="text-sm underline">Assign</button>
        </div>
      )}

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {showTemplateModal && <TemplatesUseModal onClose={() => setShowTemplateModal(false)} projects={projects} users={users} />}
    </div>
  );
}

function TaskFilters({ filters, projects, users, taskTypes = [] }) {
  const router = useRouter();

  function updateFilter(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="p-4 rounded border border-neutral-800 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          placeholder="Search tasks..."
          defaultValue={filters.q}
          onChange={(e) => updateFilter("q", e.target.value)}
          className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
        />
        <select defaultValue={filters.status || ""} onChange={(e) => updateFilter("status", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <select defaultValue={filters.priority || ""} onChange={(e) => updateFilter("priority", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
        </select>
        <select defaultValue={filters.taskType || ""} onChange={(e) => updateFilter("taskType", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Types</option>
          {Array.isArray(taskTypes) && taskTypes.length > 0 ? (
            taskTypes.map((t) => (
              <option key={t.name} value={t.name}>{t.label || t.name}</option>
            ))
          ) : (
            <>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="meeting">Meeting</option>
              <option value="idea">Idea</option>
              <option value="review">Review</option>
              <option value="research">Research</option>
            </>
          )}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select defaultValue={filters.project || ""} onChange={(e) => updateFilter("project", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>{p.title}</option>
          ))}
        </select>
        <select defaultValue={filters.assignee || ""} onChange={(e) => updateFilter("assignee", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>{u.username}</option>
          ))}
        </select>
        <select defaultValue={filters.sortBy || "createdAt"} onChange={(e) => updateFilter("sort", e.target.value)} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="createdAt">Sort: Created</option>
          <option value="dueDate">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>
    </div>
  );
}
