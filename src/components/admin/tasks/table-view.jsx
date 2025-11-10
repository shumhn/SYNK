"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TableView({ tasks, onTaskClick, projects, users }) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");

  async function handleCellUpdate(taskId, field, value) {
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

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white">📊 Table View</h2>
          <p className="text-sm text-gray-400">Spreadsheet-like grid with editable cells</p>
        </div>
        <div className="text-sm text-gray-500">
          {tasks.length} tasks
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-neutral-800 rounded-lg">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-8">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[250px]">
                Task
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[150px]">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[150px]">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px]">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px]">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px]">
                Type
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800 bg-neutral-950/50">
            {tasks.map((task, index) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
              
              return (
                <tr key={task._id} className="hover:bg-neutral-900/50 transition-colors group">
                  {/* Row Number */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {index + 1}
                  </td>

                  {/* Task Title - Editable */}
                  <td 
                    className="px-4 py-3 cursor-pointer"
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
                      <div 
                        className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(task._id, "title", task.title); }}
                      >
                        {task.title}
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
