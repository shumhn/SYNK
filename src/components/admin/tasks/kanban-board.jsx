"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  { 
    id: "todo", 
    label: "To Do", 
    color: "bg-slate-500",
    lightColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    icon: "📋"
  },
  { 
    id: "in_progress", 
    label: "In Progress", 
    color: "bg-blue-500",
    lightColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    icon: "🚀"
  },
  { 
    id: "review", 
    label: "Review", 
    color: "bg-purple-500",
    lightColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    icon: "👁️"
  },
  { 
    id: "completed", 
    label: "Completed", 
    color: "bg-green-500",
    lightColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    icon: "✓"
  },
  { 
    id: "blocked", 
    label: "Blocked", 
    color: "bg-red-500",
    lightColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    icon: "⛔"
  },
];

function TaskCard({ task, onDragStart, onTaskClick, isDragging }) {
  const incompleteDeps = task.dependencies?.filter(d => d?.status !== "completed").length || 0;
  const [isHovered, setIsHovered] = useState(false);
  
  const getPriorityColor = (priority) => {
    const colors = {
      critical: "text-red-400 bg-red-500/10 border-red-500/30",
      urgent: "text-orange-400 bg-orange-500/10 border-orange-500/30",
      high: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
      low: "text-gray-400 bg-gray-500/10 border-gray-500/30",
    };
    return colors[priority] || colors.medium;
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed";
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={() => {}}
      onClick={() => onTaskClick(task)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-neutral-900/50 backdrop-blur
        border rounded-lg p-3 mb-3 cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-lg hover:shadow-black/20
        ${isDragging ? "opacity-50 scale-95 rotate-2" : "opacity-100"}
        ${isHovered ? "border-neutral-600 shadow-md" : "border-neutral-800"}
      `}
      style={{ 
        transformOrigin: "center",
      }}
    >
      {/* Priority Indicator Bar */}
      {task.priority && task.priority !== "medium" && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
          task.priority === "critical" || task.priority === "urgent" ? "bg-gradient-to-b from-red-500 to-orange-500" :
          task.priority === "high" ? "bg-gradient-to-b from-orange-500 to-yellow-500" :
          "bg-gray-500"
        }`} />
      )}

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-white leading-snug line-clamp-2 group-hover:text-blue-400 transition-colors">
            {task.title}
          </h4>
        </div>
        {task.taskType && (
          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-neutral-800/80 text-gray-400 uppercase tracking-wide">
            {task.taskType}
          </span>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}
      
      {/* Tags & Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {task.tags?.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-neutral-800/60 text-gray-300 hover:bg-neutral-700 transition-colors">
            #{tag}
          </span>
        ))}
        {incompleteDeps > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 font-medium">
            ⏳ {incompleteDeps}
          </span>
        )}
      </div>

      {/* Card Footer - Metadata */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Assignee Avatar */}
          {task.assignee?.username ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/50 border border-neutral-700/50 hover:border-neutral-600 transition-colors">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                {task.assignee.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-300 font-medium truncate max-w-[80px]">
                {task.assignee.username}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-600 px-2 py-1">Unassigned</span>
          )}

          {/* Priority Badge */}
          {task.priority && task.priority !== "medium" && (
            <span className={`text-[10px] px-2 py-1 rounded-md border font-semibold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
            isOverdue 
              ? "bg-red-500/10 text-red-400 border border-red-500/30 font-medium" 
              : "text-gray-400"
          }`}>
            <span>{isOverdue ? "⚠️" : "📅"}</span>
            <span>{new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {task.progress > 0 && (
        <div className="mt-3 pt-2 border-t border-neutral-800/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 font-medium">Progress</span>
            <span className="text-gray-400 font-semibold">{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                task.progress === 100 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                task.progress >= 75 ? "bg-gradient-to-r from-blue-500 to-cyan-500" :
                task.progress >= 50 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                "bg-gradient-to-r from-gray-500 to-gray-400"
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Hover Quick Actions */}
      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <button 
          onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
          className="p-1 rounded bg-neutral-800/90 hover:bg-neutral-700 text-gray-400 hover:text-white transition-colors"
          title="View details"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({ status, tasks, onDrop, onDragOver, onTaskClick, isDragOver, draggedTask }) {
  const count = tasks.length;
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div
      className={`
        flex-1 min-w-[320px] max-w-[380px] flex flex-col
        bg-neutral-900/30 backdrop-blur rounded-xl border transition-all duration-200
        ${isDragOver ? `${status.borderColor} border-2 shadow-lg` : "border-neutral-800"}
      `}
      onDrop={(e) => onDrop(e, status.id)}
      onDragOver={onDragOver}
    >
      {/* Column Header */}
      <div className={`sticky top-0 z-10 rounded-t-xl p-4 border-b ${status.lightColor} ${status.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isCollapsed ? "▶" : "▼"}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">{status.icon}</span>
              <h3 className="font-semibold text-white">{status.label}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${status.color} text-white`}>
              {count}
            </span>
          </div>
        </div>
        
        {/* Column Stats */}
        {!isCollapsed && count > 0 && (
          <div className="mt-3 pt-3 border-t border-neutral-800/50">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>
                {tasks.filter(t => t.assignee).length} assigned
              </span>
              {tasks.some(t => t.priority === "urgent" || t.priority === "critical") && (
                <span className="text-red-400 font-medium">
                  {tasks.filter(t => t.priority === "urgent" || t.priority === "critical").length} urgent
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Column Body */}
      {!isCollapsed && (
        <div className={`
          flex-1 p-3 overflow-y-auto
          ${isDragOver ? "bg-neutral-800/20" : ""}
        `}
        style={{ maxHeight: "calc(100vh - 300px)", minHeight: "400px" }}
        >
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onDragStart={(e, t) => e.dataTransfer.setData("taskId", t._id)}
                  onTaskClick={onTaskClick}
                  isDragging={draggedTask?._id === task._id}
                />
              ))}
            </div>
          ) : (
            <div className={`
              flex flex-col items-center justify-center
              h-full min-h-[200px] rounded-lg border-2 border-dashed
              ${isDragOver ? status.borderColor : "border-neutral-800"}
              transition-all duration-200
            `}>
              <div className="text-4xl mb-3 opacity-20">{status.icon}</div>
              <p className="text-sm text-gray-600 font-medium">
                {isDragOver ? "Drop task here" : "No tasks"}
              </p>
              <p className="text-xs text-gray-700 mt-1">
                Drag tasks to this column
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onTaskUpdate }) {
  const router = useRouter();
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  function handleDragStart(e, task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, columnId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  }

  function handleDragLeave() {
    setDragOverColumn(null);
  }

  async function handleDrop(e, newStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Check if task is blocked and trying to move forward
    if (["in_progress", "review", "completed"].includes(newStatus)) {
      const incompleteDeps = draggedTask.dependencies?.filter(d => d?.status !== "completed").length || 0;
      if (incompleteDeps > 0) {
        alert(`❌ Cannot move to ${newStatus.replace("_", " ")}.\n\nTask has ${incompleteDeps} incomplete dependency(ies).\nComplete those tasks first.`);
        setDraggedTask(null);
        return;
      }
    }

    try {
      const res = await fetch(`/api/tasks/${draggedTask._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (data.error) {
        alert(`❌ ${data.message || "Failed to update task"}`);
      } else {
        onTaskUpdate?.();
        router.refresh();
      }
    } catch (e) {
      alert("❌ Failed to update task");
    } finally {
      setDraggedTask(null);
    }
  }

  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.id] = tasks.filter((t) => t.status === status.id);
    return acc;
  }, {});

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const blockedTasks = tasks.filter(t => t.status === "blocked").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">📊 Kanban Board</h2>
          <p className="text-sm text-gray-400">Drag and drop tasks to update their status</p>
        </div>
        
        {/* Board Stats */}
        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800">
            <div className="text-2xl font-bold text-white">{totalTasks}</div>
            <div className="text-xs text-gray-400">Total Tasks</div>
          </div>
          <div className="text-center px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">{completionRate}%</div>
            <div className="text-xs text-gray-400">Complete</div>
          </div>
          {blockedTasks > 0 && (
            <div className="text-center px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">{blockedTasks}</div>
              <div className="text-xs text-gray-400">Blocked</div>
            </div>
          )}
        </div>
      </div>

      {/* Board Columns */}
      <div 
        className="flex gap-4 overflow-x-auto pb-6 px-1"
        style={{ scrollbarWidth: "thin" }}
        onDragLeave={handleDragLeave}
      >
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.id] || []}
            onDrop={handleDrop}
            onDragOver={(e) => handleDragOver(e, status.id)}
            onTaskClick={onTaskClick}
            isDragOver={dragOverColumn === status.id}
            draggedTask={draggedTask}
          />
        ))}
      </div>
    </div>
  );
}
