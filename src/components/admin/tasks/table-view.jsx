"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TableView({ tasks, onTaskClick, projects, users }) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [sortBy, setSortBy] = useState("dueDate"); // field to sort by
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' or 'desc'
  const [filters, setFilters] = useState({ status: "", priority: "", assignee: "" });
  const [savingCells, setSavingCells] = useState(new Set()); // optimistic UI

  async function handleCellUpdate(taskId, field, value) {
    const cellKey = `${taskId}-${field}`;
    setSavingCells(prev => new Set([...prev, cellKey]));
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      router.refresh();
      setEditingCell(null);
    } catch (e) {
      console.error("Failed to update task", e);
      alert("Failed to update task");
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  }

  function startEdit(taskId, field, currentValue) {
    setEditingCell(`${taskId}-${field}`);
    setEditValue(currentValue || "");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  const getStatusColor = (status) => {
    const colors = {
      todo: "bg-gray-700 text-gray-200",
      in_progress: "bg-blue-700 text-blue-100",
      review: "bg-purple-700 text-purple-100",
      completed: "bg-green-700 text-green-100",
      blocked: "bg-red-700 text-red-100",
    };
    return colors[status] || colors.todo;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: "bg-red-700 text-red-100",
      urgent: "bg-orange-700 text-orange-100",
      high: "bg-yellow-700 text-yellow-100",
      medium: "bg-blue-700 text-blue-100",
      low: "bg-gray-700 text-gray-200",
    };
    return colors[priority] || colors.medium;
  };

  // Filter and sort tasks
  const filteredTasks = tasks.filter(task => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignee && task.assignee?._id !== filters.assignee) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Handle nested objects
    if (sortBy === "assignee") {
      aVal = a.assignee?.username || "";
      bVal = b.assignee?.username || "";
    } else if (sortBy === "project") {
      aVal = a.project?.title || "";
      bVal = b.project?.title || "";
    }
    
    // Handle dates
    if (sortBy === "dueDate") {
      aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  function handleSort(field) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white">📊 Table View</h2>
          <p className="text-sm text-gray-400">Spreadsheet-like grid with editable cells</p>
        </div>
        <div className="text-sm text-gray-500">
          {sortedTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-3 bg-neutral-900/50 rounded-lg border border-neutral-800">
        <span className="text-xs text-gray-400">Filters:</span>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700 text-sm"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filters.assignee}
          onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
          className="px-3 py-1.5 rounded bg-neutral-800 border border-neutral-700 text-sm"
        >
          <option value="">All Assignees</option>
          {users?.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username}
            </option>
          ))}
        </select>
        {(filters.status || filters.priority || filters.assignee) && (
          <button
            onClick={() => setFilters({ status: "", priority: "", assignee: "" })}
            className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-800 rounded-lg">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">
                #
              </th>
              <th 
                onClick={() => handleSort("title")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[250px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Task {sortBy === "title" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("status")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("priority")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Priority {sortBy === "priority" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("assignee")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[150px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Assignee {sortBy === "assignee" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("project")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[150px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Project {sortBy === "project" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("dueDate")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Due Date {sortBy === "dueDate" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th 
                onClick={() => handleSort("progress")}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px] cursor-pointer hover:text-white hover:bg-neutral-800/50 transition-colors"
              >
                Progress {sortBy === "progress" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px]">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950/50">
            {sortedTasks.map((task, index) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
              const isSaving = (field) => savingCells.has(`${task._id}-${field}`);
              
              return (
                <tr key={task._id} className="hover:bg-neutral-900/50 transition-colors group relative">
                  {/* Row Number */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {index + 1}
                  </td>

                  {/* Task Title - Editable */}
                  <td 
                    className="px-4 py-3 cursor-pointer relative"
                    onClick={() => onTaskClick(task)}
                  >
                    {editingCell === `${task._id}-title` ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task._id, "title", editValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task._id, "title", editValue);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full px-2 py-1 bg-neutral-800 border border-blue-500 rounded text-sm text-white"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex-1 text-sm font-medium text-white group-hover:text-blue-400 transition-colors"
                          onDoubleClick={(e) => { e.stopPropagation(); startEdit(task._id, "title", task.title); }}
                        >
                          {task.title}
                        </div>
                        {isSaving("title") && (
                          <div className="flex-shrink-0 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status - Dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={task.status}
                      onChange={(e) => handleCellUpdate(task._id, "status", e.target.value)}
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)} border-0 cursor-pointer w-full`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>

                  {/* Priority - Dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={task.priority}
                      onChange={(e) => handleCellUpdate(task._id, "priority", e.target.value)}
                      className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)} border-0 cursor-pointer w-full capitalize`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </td>

                  {/* Assignee - Dropdown */}
                  <td className="px-4 py-3">
                    <select
                      value={task.assignee?._id || ""}
                      onChange={(e) => handleCellUpdate(task._id, "assignee", e.target.value || null)}
                      className="text-xs px-2 py-1 rounded bg-neutral-800 text-gray-300 border border-neutral-700 cursor-pointer w-full"
                    >
                      <option value="">Unassigned</option>
                      {users?.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Project */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300 truncate block">
                      {task.project?.title || "—"}
                    </span>
                  </td>

                  {/* Due Date - Editable */}
                  <td className="px-4 py-3">
                    {editingCell === `${task._id}-dueDate` ? (
                      <input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task._id, "dueDate", editValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task._id, "dueDate", editValue);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full px-2 py-1 bg-neutral-800 border border-blue-500 rounded text-sm text-white"
                      />
                    ) : (
                      <div 
                        className={`text-xs px-2 py-1 rounded cursor-pointer ${
                          isOverdue 
                            ? "bg-red-500/10 text-red-400 border border-red-500/30 font-medium" 
                            : "text-gray-400"
                        }`}
                        onDoubleClick={(e) => { 
                          e.stopPropagation(); 
                          startEdit(task._id, "dueDate", task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""); 
                        }}
                      >
                        {task.dueDate 
                          ? `${isOverdue ? "⚠️ " : ""}${new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : "—"
                        }
                      </div>
                    )}
                  </td>

                  {/* Progress - Editable */}
                  <td className="px-4 py-3">
                    {editingCell === `${task._id}-progress` ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCellUpdate(task._id, "progress", parseInt(editValue) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCellUpdate(task._id, "progress", parseInt(editValue) || 0);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full px-2 py-1 bg-neutral-800 border border-blue-500 rounded text-sm text-white"
                      />
                    ) : (
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(task._id, "progress", task.progress?.toString() || "0"); }}
                      >
                        <div className="flex-1 bg-neutral-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              task.progress === 100 ? "bg-green-500" :
                              task.progress >= 75 ? "bg-blue-500" :
                              task.progress >= 50 ? "bg-yellow-500" :
                              "bg-gray-500"
                            }`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-medium min-w-[35px]">
                          {task.progress || 0}%
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Task Type */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400 uppercase">
                      {task.taskType || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">📊</div>
            <p>No tasks to display</p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 flex items-center gap-4 px-2">
        <span>💡 Tip: Double-click cells to edit</span>
        <span>•</span>
        <span>Use dropdowns for quick updates</span>
        <span>•</span>
        <span>Press Enter to save, Escape to cancel</span>
      </div>
    </div>
  );
}
