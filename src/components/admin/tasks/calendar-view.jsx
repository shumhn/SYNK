"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CalendarView({ tasks, onTaskClick }) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // 'month' or 'week'
  const [draggedTask, setDraggedTask] = useState(null);

  // Get tasks for a specific date
  function getTasksForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDateStr = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDateStr === dateStr;
    });
  }

  // Calendar navigation
  function previousPeriod() {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  }

  function nextPeriod() {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  // Get month view days
  function getMonthDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  // Get week view days
  function getWeekDays() {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    
    return days;
  }

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const days = view === "month" ? getMonthDays() : getWeekDays();

  const getStatusColor = (status) => {
    const colors = {
      todo: "bg-gray-600",
      in_progress: "bg-blue-600",
      review: "bg-purple-600",
      completed: "bg-green-600",
      blocked: "bg-red-600",
    };
    return colors[status] || colors.todo;
  };

  const tasksWithDates = tasks.filter(t => t.dueDate);
  const overdueTasks = tasksWithDates.filter(t => new Date(t.dueDate) < new Date() && t.status !== "completed");

  // Drag handlers for rescheduling
  function handleTaskDragStart(e, task) {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDayDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDayDrop(e, targetDate) {
    e.preventDefault();
    if (!draggedTask) return;

    const newDueDate = new Date(targetDate);
    newDueDate.setHours(23, 59, 59, 999);

    try {
      await fetch(`/api/tasks/${draggedTask._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dueDate: newDueDate.toISOString(),
        }),
      });
      router.refresh();
    } catch (e) {
      console.error("Failed to reschedule task", e);
    } finally {
      setDraggedTask(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-white">📅 Calendar View</h2>
          <p className="text-sm text-gray-400">Due date visualization</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{tasksWithDates.length} tasks with due dates</span>
          {overdueTasks.length > 0 && (
            <>
              <span>•</span>
              <span className="text-red-400 font-medium">{overdueTasks.length} overdue</span>
            </>
          )}
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={previousPeriod}
            className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextPeriod}
            className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
          >
            →
          </button>
          <h3 className="text-lg font-semibold text-white ml-2">{monthName}</h3>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-1 border border-neutral-800">
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              view === "month"
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              view === "week"
                ? "bg-white text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-neutral-900/50 border-b border-neutral-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className={`grid grid-cols-7 ${view === "month" ? "auto-rows-[120px]" : "auto-rows-[180px]"}`}>
          {days.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const isCurrentDay = isToday(date);
            const isInCurrentMonth = view === "month" ? isCurrentMonth(date) : true;

            return (
              <div
                key={index}
                className={`
                  border-r border-b border-neutral-800 p-2
                  ${isInCurrentMonth ? "bg-neutral-950/50" : "bg-neutral-900/20"}
                  ${isCurrentDay ? "bg-blue-500/5 border-blue-500/30" : ""}
                  hover:bg-neutral-900/30 transition-colors
                `}
                onDragOver={handleDayDragOver}
                onDrop={(e) => handleDayDrop(e, date)}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`
                    text-sm font-medium
                    ${isCurrentDay ? "bg-blue-600 text-white px-2 py-0.5 rounded-full" : ""}
                    ${isInCurrentMonth ? "text-gray-300" : "text-gray-600"}
                  `}>
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1 overflow-y-auto" style={{ maxHeight: view === "month" ? "80px" : "140px" }}>
                  {dayTasks.slice(0, view === "month" ? 3 : 6).map((task) => {
                    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "completed";
                    
                    return (
                      <button
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, task)}
                        onClick={() => onTaskClick(task)}
                        className={`
                          w-full text-left px-2 py-1 rounded text-xs cursor-move
                          ${getStatusColor(task.status)} text-white
                          hover:brightness-110 transition-all
                          ${isOverdue ? "border border-red-400 animate-pulse" : ""}
                          ${draggedTask?._id === task._id ? "opacity-50" : ""}
                          truncate
                        `}
                        title={task.title}
                      >
                        <div className="flex items-center gap-1">
                          {isOverdue && <span>⚠️</span>}
                          {task.status === "completed" && <span>✓</span>}
                          <span className="truncate flex-1">{task.title}</span>
                        </div>
                      </button>
                    );
                  })}
                  {dayTasks.length > (view === "month" ? 3 : 6) && (
                    <div className="text-xs text-gray-500 px-2">
                      +{dayTasks.length - (view === "month" ? 3 : 6)} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs">
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
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-gray-500">⚠️ = Overdue</span>
        </div>
      </div>
    </div>
  );
}
