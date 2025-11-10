"use client";

import { useState, useEffect } from "react";

function SubtaskNode({ subtask, level = 0, onToggleExpand, expanded, users, allTasks = [], onReparent }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReparentMenu, setShowReparentMenu] = useState(false);
  const hasChildren = subtask._id; // all tasks can potentially have children

  useEffect(() => {
    if (expanded && subtask._id) {
      loadChildren();
    }
  }, [expanded, subtask._id]);

  async function loadChildren() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${subtask._id}/subtasks`);
      const data = await res.json();
      if (!data.error) setChildren(data.data || []);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  async function handleReparent(newParentId) {
    if (!newParentId) return;
    try {
      const res = await fetch(`/api/tasks/${subtask._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentTask: newParentId === "root" ? null : newParentId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.message || "Failed to reparent");
      } else {
        setShowReparentMenu(false);
        onReparent?.();
      }
    } catch (e) {
      alert("Unexpected error");
    }
  }

  const indent = level * 24;

  return (
    <div>
      <div
        className="p-3 rounded border border-neutral-800 hover:bg-neutral-950 flex items-center gap-2"
        style={{ marginLeft: `${indent}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => onToggleExpand(subtask._id)}
            className="text-sm text-gray-400 hover:text-white w-5"
          >
            {expanded ? "▼" : "▶"}
          </button>
        )}
        {!hasChildren && <span className="w-5" />}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{subtask.title}</span>
            <div className="flex items-center gap-2">
              {subtask.status === "completed" && <span className="text-green-500 text-xs">✓</span>}
              <span className="text-xs px-2 py-1 rounded bg-neutral-800 capitalize">
                {subtask.status.replace("_", " ")}
              </span>
            </div>
          </div>
          {subtask.description && (
            <p className="text-xs text-gray-400 mb-1">{subtask.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs">
            {subtask.assignee && (
              <span className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800">
                👤 {subtask.assignee.username}
              </span>
            )}
            {!subtask.assignee && <span className="text-gray-500">Unassigned</span>}
            {subtask.estimatedHours > 0 && (
              <span className="text-gray-500">⏱ {subtask.estimatedHours}h</span>
            )}
            {subtask.priority && (
              <span className={`capitalize px-2 py-0.5 rounded text-xs ${
                subtask.priority === "urgent" || subtask.priority === "critical"
                  ? "bg-red-900/30 text-red-300 border border-red-800"
                  : subtask.priority === "high"
                  ? "bg-orange-900/30 text-orange-300 border border-orange-800"
                  : "text-gray-500"
              }`}>
                {subtask.priority}
              </span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowReparentMenu(!showReparentMenu); }}
              className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900"
              title="Move to another parent"
            >
              📋 Move
            </button>
            {showReparentMenu && (
              <div className="absolute top-full left-0 mt-1 bg-neutral-900 border border-neutral-800 rounded shadow-lg z-10 min-w-[200px] max-h-64 overflow-y-auto">
                <button
                  onClick={() => handleReparent("root")}
                  className="block w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm"
                >
                  Root (No parent)
                </button>
                {allTasks.filter(t => t._id !== subtask._id).map((t) => (
                  <button
                    key={t._id}
                    onClick={() => handleReparent(t._id)}
                    className="block w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm truncate"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {expanded && loading && (
        <div className="text-xs text-gray-500 p-2" style={{ marginLeft: `${indent + 24}px` }}>
          Loading...
        </div>
      )}
      {expanded &&
        !loading &&
        children.map((child) => (
          <SubtaskNode
            key={child._id}
            subtask={child}
            level={level + 1}
            onToggleExpand={onToggleExpand}
            expanded={expanded === child._id}
            users={users}
            allTasks={allTasks}
            onReparent={onReparent}
          />
        ))}
    </div>
  );
}

export default function SubtaskTree({ taskId, users = [], projectId }) {
  const [subtasks, setSubtasks] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [newSubtask, setNewSubtask] = useState({ title: "", assignee: "", estimatedHours: 0 });
  const [progressInfo, setProgressInfo] = useState({ total: 0, completed: 0, percentage: 0 });
  const [allProjectTasks, setAllProjectTasks] = useState([]);

  useEffect(() => {
    loadSubtasks();
    if (projectId) loadProjectTasks();
  }, [taskId, projectId]);

  async function loadProjectTasks() {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      if (!data.error) setAllProjectTasks(data.data || []);
    } catch (e) {}
  }

  async function loadSubtasks() {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`);
      const data = await res.json();
      if (!data.error) {
        const subs = data.data || [];
        setSubtasks(subs);
        // Calculate completion stats
        const total = subs.length;
        const completed = subs.filter((s) => s.status === "completed").length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        setProgressInfo({ total, completed, percentage });
      }
    } catch (e) {}
  }

  function toggleExpand(nodeId) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  async function createSubtask(e) {
    e.preventDefault();
    if (!newSubtask.title.trim()) return;
    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: newSubtask.title,
        assignee: newSubtask.assignee || undefined,
        estimatedHours: Number(newSubtask.estimatedHours) || undefined,
      }),
    });
    setNewSubtask({ title: "", assignee: "", estimatedHours: 0 });
    loadSubtasks();
  }

  function expandAll() {
    const allIds = new Set();
    function collect(list) {
      list.forEach((st) => {
        allIds.add(st._id);
      });
    }
    collect(subtasks);
    setExpandedNodes(allIds);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  return (
    <div className="space-y-3">
      {subtasks.length > 0 && (
        <div className="p-3 rounded bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Subtask Completion</span>
            <span className="text-sm text-gray-400">
              {progressInfo.completed} of {progressInfo.total} completed
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-neutral-800 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progressInfo.percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progressInfo.percentage}%</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            ℹ️ Parent task progress auto-updates based on subtask and checklist completion
          </div>
        </div>
      )}
      <form onSubmit={createSubtask} className="flex items-end gap-2 p-3 rounded border border-neutral-800">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            value={newSubtask.title}
            onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
            className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
            placeholder="Subtask title"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Assignee</label>
          <select
            value={newSubtask.assignee}
            onChange={(e) => setNewSubtask({ ...newSubtask, assignee: e.target.value })}
            className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Est. Hours</label>
          <input
            type="number"
            value={newSubtask.estimatedHours}
            onChange={(e) => setNewSubtask({ ...newSubtask, estimatedHours: e.target.value })}
            className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 w-28"
          />
        </div>
        <button className="bg-white text-black px-3 py-2 rounded">Add</button>
      </form>

      {subtasks.length > 0 && (
        <div className="flex gap-2 text-xs">
          <button onClick={expandAll} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
            Collapse All
          </button>
        </div>
      )}

      <div className="space-y-2">
        {subtasks.length > 0 ? (
          subtasks.map((st) => (
            <SubtaskNode
              key={st._id}
              subtask={st}
              level={0}
              onToggleExpand={toggleExpand}
              expanded={expandedNodes.has(st._id)}
              users={users}
              allTasks={allProjectTasks}
              onReparent={loadSubtasks}
            />
          ))
        ) : (
          <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">
            No subtasks yet. Add one above to break down this task.
          </div>
        )}
      </div>
    </div>
  );
}
