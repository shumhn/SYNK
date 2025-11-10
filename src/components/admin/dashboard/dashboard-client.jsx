"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardClient({ 
  metrics, 
  statusDistribution, 
  priorityDistribution, 
  teamWorkload, 
  upcomingDeadlines,
  currentUser 
}) {
  const [timeRange, setTimeRange] = useState("week"); // 'week', 'month', 'all'

  const completionRate = metrics.totalTasks > 0 
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) 
    : 0;

  const weeklyVelocity = metrics.tasksCompletedThisWeek;
  const projectHealth = metrics.totalProjects > 0
    ? Math.round(((metrics.totalProjects - metrics.atRiskProjects) / metrics.totalProjects) * 100)
    : 100;

  // Chart helper - simple bar chart
  function SimpleBarChart({ data, colors }) {
    const max = Math.max(...Object.values(data));
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="w-24 text-xs text-gray-400 capitalize">{key.replace("_", " ")}</div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-neutral-800 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full ${colors[key]} transition-all duration-500 flex items-center justify-end px-2`}
                  style={{ width: max > 0 ? `${(value / max) * 100}%` : "0%" }}
                >
                  {value > 0 && <span className="text-xs font-semibold text-white">{value}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Donut chart helper
  function DonutChart({ data, colors, label }) {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    if (total === 0) return <div className="text-center text-gray-500">No data</div>;

    let accumulated = 0;
    const segments = Object.entries(data).map(([key, value]) => {
      const percentage = (value / total) * 100;
      const start = accumulated;
      accumulated += percentage;
      return { key, value, percentage, start };
    });

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {segments.map((segment, index) => {
              const circumference = 2 * Math.PI * 40;
              const offset = (segment.start / 100) * circumference;
              const length = (segment.percentage / 100) * circumference;
              return (
                <circle
                  key={segment.key}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={colors[segment.key]}
                  strokeWidth="12"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${colors[key]}`} />
              <span className="text-gray-300 capitalize">{key.replace("_", " ")}: {value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statusColors = {
    todo: "bg-gray-600",
    in_progress: "bg-blue-600",
    review: "bg-purple-600",
    completed: "bg-green-600",
    blocked: "bg-red-600",
  };

  const priorityColors = {
    low: "bg-gray-600",
    medium: "bg-blue-600",
    high: "bg-yellow-600",
    urgent: "bg-orange-600",
    critical: "bg-red-600",
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Overall team and task health overview</p>
        </div>
        <div className="text-sm text-gray-500">
          Welcome back, <span className="text-white font-medium">{currentUser.username}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/10 border border-blue-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Tasks</span>
            <span className="text-2xl">📋</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.totalTasks}</div>
          <div className="text-xs text-gray-500">
            <span className="text-green-400">+{metrics.tasksCreatedThisWeek}</span> this week
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-green-900/20 to-green-950/10 border border-green-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Completion Rate</span>
            <span className="text-2xl">✓</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{completionRate}%</div>
          <div className="text-xs text-gray-500">
            {metrics.completedTasks} of {metrics.totalTasks} completed
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-950/10 border border-purple-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">In Progress</span>
            <span className="text-2xl">🚀</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{metrics.inProgressTasks}</div>
          <div className="text-xs text-gray-500">
            Active tasks being worked on
          </div>
        </div>

        {/* Blocked/Overdue */}
        <div className="bg-gradient-to-br from-red-900/20 to-red-950/10 border border-red-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Issues</span>
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {metrics.blockedTasks + metrics.overdueTasks}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.blockedTasks} blocked • {metrics.overdueTasks} overdue
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly Velocity */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Weekly Velocity</h3>
            <span className="text-lg">📈</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 mb-2">{weeklyVelocity}</div>
          <div className="text-xs text-gray-400">Tasks completed this week</div>
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Target: 20/week</span>
              <span className={weeklyVelocity >= 20 ? "text-green-400" : "text-orange-400"}>
                {weeklyVelocity >= 20 ? "✓ On track" : "⚠ Below target"}
              </span>
            </div>
          </div>
        </div>

        {/* Project Health */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Project Health</h3>
            <span className="text-lg">🎯</span>
          </div>
          <div className="text-2xl font-bold text-green-400 mb-2">{projectHealth}%</div>
          <div className="text-xs text-gray-400">{metrics.activeProjects} active projects</div>
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">At risk: {metrics.atRiskProjects}</span>
              <span className={metrics.atRiskProjects === 0 ? "text-green-400" : "text-red-400"}>
                {metrics.atRiskProjects === 0 ? "✓ All healthy" : "⚠ Needs attention"}
              </span>
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Team Members</h3>
            <span className="text-lg">👥</span>
          </div>
          <div className="text-2xl font-bold text-purple-400 mb-2">{metrics.totalUsers}</div>
          <div className="text-xs text-gray-400">Active team members</div>
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Avg load: {Math.round(metrics.totalTasks / metrics.totalUsers)} tasks/person</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Task Status Distribution
          </h3>
          <DonutChart data={statusDistribution} colors={statusColors} label="Tasks" />
        </div>

        {/* Priority Distribution */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎯</span> Priority Breakdown
          </h3>
          <SimpleBarChart data={priorityDistribution} colors={priorityColors} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>👥</span> Team Workload
          </h3>
          <div className="space-y-3">
            {teamWorkload.slice(0, 8).map((member) => (
              <div key={member.user} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white">
                  {member.user.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate">{member.user}</span>
                    <span className="text-xs text-gray-400">{member.total} tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-neutral-800 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${member.total > 0 ? (member.active / member.total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16">{member.active} active</span>
                  </div>
                </div>
              </div>
            ))}
            {teamWorkload.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No assigned tasks yet
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>📅</span> Upcoming Deadlines
          </h3>
          <div className="space-y-2">
            {upcomingDeadlines.map((task) => {
              const daysUntil = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
              const isUrgent = daysUntil <= 3;
              
              return (
                <Link
                  key={task._id}
                  href={`/admin/tasks?taskId=${task._id}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-neutral-800 transition-colors group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-blue-500" :
                    isUrgent ? "bg-red-500 animate-pulse" :
                    "bg-gray-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white group-hover:text-blue-400 truncate transition-colors">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.project?.title || "No project"}
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    isUrgent ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                    daysUntil <= 7 ? "bg-orange-500/10 text-orange-400 border border-orange-500/30" :
                    "text-gray-400"
                  }`}>
                    {daysUntil === 0 ? "Today" :
                     daysUntil === 1 ? "Tomorrow" :
                     daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` :
                     `${daysUntil}d`}
                  </div>
                </Link>
              );
            })}
            {upcomingDeadlines.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-neutral-900/80 to-neutral-950/50 border border-neutral-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/admin/tasks"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
            <span className="text-sm text-gray-300 group-hover:text-white">View All Tasks</span>
          </Link>
          <Link
            href="/admin/projects"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
            <span className="text-sm text-gray-300 group-hover:text-white">View Projects</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
            <span className="text-sm text-gray-300 group-hover:text-white">Team Members</span>
          </Link>
          <Link
            href="/admin/templates"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
            <span className="text-sm text-gray-300 group-hover:text-white">Templates</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
