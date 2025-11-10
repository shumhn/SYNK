"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ListView({ tasks, onTaskClick }) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState(new Set(["high", "urgent", "critical"]));

  // Group tasks by priority
  const groupedTasks = {
    critical: tasks.filter(t => t.priority === "critical"),
    urgent: tasks.filter(t => t.priority === "urgent"),
    high: tasks.filter(t => t.priority === "high"),
    medium: tasks.filter(t => t.priority === "medium"),
    low: tasks.filter(t => t.priority === "low"),
  };

  const priorityConfig = {
    critical: { label: "Critical", icon: "🔴", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/30" },
    urgent: { label: "Urgent", icon: "🟠", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
    high: { label: "High", icon: "🟡", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
    medium: { label: "Medium", icon: "🔵", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    low: { label: "Low", icon: "⚪", color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
  };

  function toggleGroup(priority) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(priority)) {
        next.delete(priority);
      } else {
        next.add(priority);
      }
      return next;
    });
  }

  async function quickUpdateStatus(taskId, newStatus) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      console.error("Failed to update task", e);
    }
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

  const isOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
  const incompleteDeps = (task) => task.dependencies?.filter(d => d?.status !== "completed").length || 0;

  return (
    <div className="space-y-4">
      {/* List Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white">📝 List View</h2>
          <p className="text-sm text-gray-400">Organized by priority for quick management</p>
        </div>
        <div className="text-sm text-gray-500">
          {tasks.length} tasks
        </div>
      </div>

      {/* Priority Groups */}
      {Object.entries(groupedTasks).map(([priority, priorityTasks]) => {
        if (priorityTasks.length === 0) return null;
        const config = priorityConfig[priority];
        const isExpanded = expandedGroups.has(priority);

        return (
          <div key={priority} className={`border rounded-lg overflow-hidden ${config.borderColor}`}>
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(priority)}
              className={`w-full px-4 py-3 flex items-center justify-between ${config.bgColor} hover:brightness-110 transition-all`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{config.icon}</span>
                <span className={`font-semibold ${config.color}`}>{config.label}</span>
                <span className="text-xs text-gray-500">({priorityTasks.length})</span>
              </div>
              <span className="text-gray-400 text-sm">{isExpanded ? "▼" : "▶"}</span>
            </button>

            {/* Tasks List */}
            {isExpanded && (
              <div className="divide-y divide-neutral-800">
                {priorityTasks.map((task) => {
                  const overdue = isOverdue(task);
                  const deps = incompleteDeps(task);

                  return (
                    <div
                      key={task._id}
                      onClick={() => onTaskClick(task)}
                      className="px-4 py-3 hover:bg-neutral-900/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Indicator */}
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          task.status === "completed" ? "bg-green-500" :
                          task.status === "in_progress" ? "bg-blue-500" :
                          task.status === "blocked" ? "bg-red-500" :
                          "bg-gray-500"
                        }`} />

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                              {task.title}
                            </h4>
                            
                            {/* Quick Status Toggle */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <select
                                value={task.status}
                                onChange={(e) => { e.stopPropagation(); quickUpdateStatus(task._id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)} border-0 cursor-pointer`}
                              >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="completed">Completed</option>
                                <option value="blocked">Blocked</option>
                              </select>
                            </div>
                          </div>

                          {/* Task Metadata */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Project */}
                            {task.project?.title && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800 text-gray-300">
                                📁 {task.project.title}
                              </span>
                            )}

                            {/* Assignee */}
                            {task.assignee?.username && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                👤 {task.assignee.username}
                              </span>
                            )}

                            {/* Due Date */}
                            {task.dueDate && (
                              <span className={`px-2 py-0.5 rounded ${
                                overdue 
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30 font-medium" 
                                  : "bg-neutral-800 text-gray-400"
                              }`}>
                                {overdue ? "⚠️" : "📅"} {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}

                            {/* Dependencies */}
                            {deps > 0 && (
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                                ⏳ {deps}
                              </span>
                            )}

                            {/* Task Type */}
                            {task.taskType && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800/60 text-gray-400 uppercase text-[10px] tracking-wide">
                                {task.taskType}
                              </span>
                            )}

                            {/* Progress */}
                            {task.progress > 0 && task.progress < 100 && (
                              <span className="px-2 py-0.5 rounded bg-neutral-800 text-gray-300">
                                {task.progress}%
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {task.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {task.tags.slice(0, 4).map((tag) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-800/60 text-gray-400">
                                  #{tag}
                                </span>
                              ))}
                              {task.tags.length > 4 && (
                                <span className="text-[10px] px-1.5 py-0.5 text-gray-500">
                                  +{task.tags.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-3">📝</div>
          <p>No tasks to display</p>
        </div>
      )}
    </div>
  );
}
