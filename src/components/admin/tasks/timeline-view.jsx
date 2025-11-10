"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TimelineView({ tasks, onTaskClick }) {
  const router = useRouter();
  const [zoom, setZoom] = useState("week"); // 'day', 'week', 'month'
  const [groupBy, setGroupBy] = useState("project"); // 'project', 'assignee', 'none'
  const [showDependencies, setShowDependencies] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragType, setDragType] = useState(null); // 'move', 'resize-start', 'resize-end'
  const timelineRef = useRef(null);

  // Filter tasks with dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter(t => t.dueDate || t.createdAt).map(t => ({
      ...t,
      startDate: t.createdAt ? new Date(t.createdAt) : new Date(t.dueDate),
      endDate: t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt),
    }));
  }, [tasks]);

  // Calculate timeline range
  const { minDate, maxDate, today } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const now = new Date();
      return {
        minDate: new Date(now.getFullYear(), now.getMonth(), 1),
        maxDate: new Date(now.getFullYear(), now.getMonth() + 3, 0),
        today: now,
      };
    }

    const allDates = tasksWithDates.flatMap(t => [t.startDate, t.endDate]);
    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    
    // Add padding
    const padding = 7 * 24 * 60 * 60 * 1000; // 7 days
    return {
      minDate: new Date(min.getTime() - padding),
      maxDate: new Date(max.getTime() + padding),
      today: new Date(),
    };
  }, [tasksWithDates]);

  // Generate timeline columns
  const columns = useMemo(() => {
    const cols = [];
    const current = new Date(minDate);
    
    while (current <= maxDate) {
      cols.push(new Date(current));
      
      if (zoom === "day") {
        current.setDate(current.getDate() + 1);
      } else if (zoom === "week") {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    
    return cols;
  }, [minDate, maxDate, zoom]);

  const columnWidth = zoom === "day" ? 60 : zoom === "week" ? 120 : 180;
  const totalWidth = columns.length * columnWidth;

  // Group tasks
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return { "All Tasks": tasksWithDates };
    }
    
    const groups = {};
    tasksWithDates.forEach(task => {
      let key;
      if (groupBy === "project") {
        key = task.project?.title || "No Project";
      } else if (groupBy === "assignee") {
        key = task.assignee?.username || "Unassigned";
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [tasksWithDates, groupBy]);

  // Calculate task position
  function getTaskPosition(task) {
    const start = task.startDate.getTime();
    const end = task.endDate.getTime();
    const rangeStart = minDate.getTime();
    const rangeEnd = maxDate.getTime();
    const range = rangeEnd - rangeStart;
    
    const left = ((start - rangeStart) / range) * totalWidth;
    const width = Math.max(((end - start) / range) * totalWidth, 40); // Min 40px
    
    return { left, width };
  }

  // Format date for column headers
  function formatColumnHeader(date) {
    if (zoom === "day") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (zoom === "week") {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.getDate()}`;
    } else {
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      todo: "bg-gray-600 border-gray-500",
      in_progress: "bg-blue-600 border-blue-500",
      review: "bg-purple-600 border-purple-500",
      completed: "bg-green-600 border-green-500",
      blocked: "bg-red-600 border-red-500",
    };
    return colors[status] || colors.todo;
  };

  // Check if task is overdue
  const isOverdue = (task) => {
    return task.endDate < today && task.status !== "completed";
  };

  // Get today position
  const todayPosition = useMemo(() => {
    const todayTime = today.getTime();
    const rangeStart = minDate.getTime();
    const rangeEnd = maxDate.getTime();
    const range = rangeEnd - rangeStart;
    return ((todayTime - rangeStart) / range) * totalWidth;
  }, [today, minDate, maxDate, totalWidth]);

  // Handle drag to reschedule
  async function handleTaskDragEnd(task) {
    if (!draggedTask || !dragType) return;
    
    // Calculate new dates based on drag
    // This is simplified - in production you'd calculate based on mouse position
    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dueDate: task.endDate,
        }),
      });
      router.refresh();
    } catch (e) {
      console.error("Failed to update task", e);
    }
    
    setDraggedTask(null);
    setDragType(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white">📈 Timeline View (Gantt)</h2>
          <p className="text-sm text-gray-400">Horizontal progress bar representation with dependencies</p>
        </div>
        <div className="text-sm text-gray-500">
          {tasksWithDates.length} tasks
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Zoom:</span>
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button
              onClick={() => setZoom("day")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                zoom === "day" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setZoom("week")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                zoom === "week" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setZoom("month")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                zoom === "month" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Group Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Group by:</span>
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
            <button
              onClick={() => setGroupBy("none")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                groupBy === "none" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              None
            </button>
            <button
              onClick={() => setGroupBy("project")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                groupBy === "project" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Project
            </button>
            <button
              onClick={() => setGroupBy("assignee")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                groupBy === "assignee" ? "bg-white text-black" : "text-gray-400 hover:text-white"
              }`}
            >
              Assignee
            </button>
          </div>
        </div>

        {/* Options */}
        <button
          onClick={() => setShowDependencies(!showDependencies)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
            showDependencies
              ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
              : "bg-neutral-900 text-gray-400 border-neutral-800"
          }`}
        >
          {showDependencies ? "🔗" : "○"} Dependencies
        </button>
      </div>

      {/* Timeline Container */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950/50">
        {/* Timeline Header */}
        <div className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-800">
          <div className="flex">
            {/* Task Names Column */}
            <div className="w-64 flex-shrink-0 border-r border-neutral-800 px-4 py-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Tasks</span>
            </div>
            
            {/* Date Columns */}
            <div className="flex-1 overflow-x-auto" ref={timelineRef}>
              <div className="flex" style={{ width: totalWidth }}>
                {columns.map((date, index) => (
                  <div
                    key={index}
                    className="border-r border-neutral-800/50 px-2 py-3 text-center"
                    style={{ width: columnWidth, minWidth: columnWidth }}
                  >
                    <div className="text-xs text-gray-400">{formatColumnHeader(date)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="relative">
          {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
            <div key={groupName} className="border-b border-neutral-800/50">
              {/* Group Header */}
              {groupBy !== "none" && (
                <div className="bg-neutral-900/50 px-4 py-2 border-b border-neutral-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{groupName}</span>
                    <span className="text-xs text-gray-500">({groupTasks.length})</span>
                  </div>
                </div>
              )}

              {/* Tasks */}
              {groupTasks.map((task, taskIndex) => {
                const { left, width } = getTaskPosition(task);
                const overdue = isOverdue(task);

                return (
                  <div key={task._id} className="flex hover:bg-neutral-900/30 transition-colors group">
                    {/* Task Name */}
                    <div className="w-64 flex-shrink-0 border-r border-neutral-800/50 px-4 py-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.status === "completed" ? "bg-green-500" :
                        task.status === "in_progress" ? "bg-blue-500" :
                        task.status === "blocked" ? "bg-red-500" :
                        "bg-gray-500"
                      }`} />
                      <button
                        onClick={() => onTaskClick(task)}
                        className="text-sm text-white hover:text-blue-400 transition-colors text-left truncate flex-1"
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative" style={{ width: totalWidth, minWidth: totalWidth }}>
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex">
                        {columns.map((_, index) => (
                          <div
                            key={index}
                            className="border-r border-neutral-800/30"
                            style={{ width: columnWidth }}
                          />
                        ))}
                      </div>

                      {/* Task Bar */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg border-2 cursor-pointer transition-all ${getStatusColor(task.status)} ${
                          overdue ? "animate-pulse border-red-400" : ""
                        } hover:brightness-110 hover:scale-105 group-hover:shadow-lg`}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                        }}
                        onClick={() => onTaskClick(task)}
                        title={`${task.title} (${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()})`}
                      >
                        {/* Progress Fill */}
                        <div
                          className="h-full bg-white/20 rounded-md transition-all"
                          style={{ width: `${task.progress || 0}%` }}
                        />

                        {/* Task Info */}
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                          <span className="text-xs font-medium text-white truncate">
                            {task.title}
                          </span>
                          {overdue && <span className="text-xs">⚠️</span>}
                        </div>

                        {/* Resize Handles */}
                        <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Dependencies Lines */}
                      {showDependencies && task.dependencies?.length > 0 && (
                        <svg className="absolute inset-0 pointer-events-none" style={{ width: totalWidth, height: "100%" }}>
                          {task.dependencies.map((depId) => {
                            const depTask = groupTasks.find(t => t._id.toString() === depId.toString());
                            if (!depTask) return null;

                            const depPos = getTaskPosition(depTask);
                            const taskPos = getTaskPosition(task);
                            
                            // Simple arrow from dependency end to task start
                            return (
                              <line
                                key={depId}
                                x1={depPos.left + depPos.width}
                                y1="50%"
                                x2={taskPos.left}
                                y2="50%"
                                stroke="#60a5fa"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                                markerEnd="url(#arrowhead)"
                              />
                            );
                          })}
                          <defs>
                            <marker
                              id="arrowhead"
                              markerWidth="10"
                              markerHeight="10"
                              refX="9"
                              refY="3"
                              orient="auto"
                            >
                              <polygon points="0 0, 10 3, 0 6" fill="#60a5fa" />
                            </marker>
                          </defs>
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Today Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
            style={{ left: `${264 + todayPosition}px` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
              Today
            </div>
          </div>
        </div>

        {tasksWithDates.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3">📈</div>
            <p>No tasks with dates to display</p>
            <p className="text-xs mt-1">Add due dates to tasks to see them on the timeline</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-600"></div>
            <span className="text-gray-400">To Do</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600"></div>
            <span className="text-gray-400">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-600"></div>
            <span className="text-gray-400">Review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-600"></div>
            <span className="text-gray-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-600"></div>
            <span className="text-gray-400">Blocked</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
          <span>⚠️ = Overdue</span>
          <span>🔗 = Dependencies</span>
          <span className="text-blue-500">| = Today</span>
        </div>
      </div>
    </div>
  );
}
