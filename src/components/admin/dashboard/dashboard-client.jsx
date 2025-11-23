"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProductivityTrends from "./productivity-trends";

export default function DashboardClient({ 
  metrics, 
  statusDistribution, 
  priorityDistribution, 
  teamWorkload, 
  upcomingDeadlines,
  currentUser 
}) {
  const [timeRange, setTimeRange] = useState("week"); // 'week', 'month', 'all'
  const [overview, setOverview] = useState({ employees: metrics.totalEmployees ?? 0, teams: metrics.totalTeams ?? 0, projects: metrics.totalProjects ?? 0, tasks: metrics.totalTasks ?? 0 });
  const refreshTimer = useRef(null);
  const sseTimer = useRef(null);
  const [activity, setActivity] = useState([]);
  const [roleDist, setRoleDist] = useState({});
  const [deptDist, setDeptDist] = useState({});
  const distTimer = useRef(null);
  const [heatmapMetric, setHeatmapMetric] = useState("created");
  const [heatmapDays, setHeatmapDays] = useState(180);
  const [heatmapSeries, setHeatmapSeries] = useState([]);
  const [heatmapMax, setHeatmapMax] = useState(0);
  const [overdue, setOverdue] = useState(null);

  async function loadOverview() {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && !json.error && json.data) setOverview(json.data);
    } catch {}
  }

  async function loadOverdue() {
    try {
      const res = await fetch("/api/admin/tasks/overdue", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && !json.error && json.data) setOverdue(json.data);
    } catch {}
  }

  // Activity + Distribution helpers
  function iconForAction(action) {
    if (!action) return "•";
    return "•";
  }

  function roleBarColors(obj) {
    const map = {};
    Object.keys(obj || {}).forEach((k) => {
      map[k] = k === 'admin' ? 'bg-red-600' : k === 'hr' ? 'bg-pink-600' : k === 'manager' ? 'bg-blue-600' : k === 'employee' ? 'bg-emerald-600' : 'bg-gray-600';
    });
    return map;
  }

  function deptBarColors(obj) {
    const map = {};
    Object.keys(obj || {}).forEach((k) => { map[k] = 'bg-indigo-600'; });
    return map;
  }

  // Heatmap helpers
  function buildHeatmapGrid(series) {
    if (!Array.isArray(series) || series.length === 0) return [];
    const map = new Map(series.map((d) => [d.date, d.count]));
    const first = new Date(series[0].date);
    const last = new Date(series[series.length - 1].date);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(last);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const weeks = [];
    let week = [];
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().split("T")[0];
      const inRange = d >= first && d <= last;
      week.push({ date: key, count: inRange ? (map.get(key) || 0) : null });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  }

  function heatColor(count, max) {
    if (count === null) return "rgba(31,41,55,0.2)";
    if (!max || count <= 0) return "#1f2937";
    const alpha = 0.2 + 0.8 * (count / max);
    return `rgba(16,185,129,${alpha.toFixed(3)})`;
  }

  function daysOverdue(due) {
    if (!due) return null;
    const diff = Math.ceil((new Date() - new Date(due)) / (1000*60*60*24));
    return diff;
  }

  async function loadHeatmap() {
    try {
      const params = new URLSearchParams();
      params.set("metric", heatmapMetric);
      params.set("days", String(heatmapDays));
      const res = await fetch(`/api/admin/tasks/heatmap?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && !json.error && json.data) {
        setHeatmapSeries(json.data.series || []);
        setHeatmapMax(json.data.max || 0);
      }
    } catch {}
  }

  async function loadActivity() {
    try {
      const res = await fetch("/api/admin/activity?limit=25", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && !json.error && Array.isArray(json.data)) setActivity(json.data);
    } catch {}
  }

  async function loadDistribution() {
    try {
      const res = await fetch("/api/admin/users/distribution", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && !json.error && json.data) {
        const rolesObj = {};
        (json.data.roles || []).forEach(r => { const key = r._id || "none"; rolesObj[key] = r.count || 0; });
        const deptsObj = {};
        (json.data.departments || []).forEach(d => { const name = d.department || "No department"; deptsObj[name] = d.count || 0; });
        setRoleDist(rolesObj);
        setDeptDist(deptsObj);
      }
    } catch {}
  }

  useEffect(() => {
    loadOverview();
    loadActivity();
    loadDistribution();
    loadHeatmap();
    loadOverdue();
    // periodic refresh every 30s
    refreshTimer.current = setInterval(loadOverview, 30000);
    distTimer.current = setInterval(() => { loadActivity(); loadDistribution(); loadOverdue(); }, 30000);
    // SSE-triggered refresh on task changes
    const es = new EventSource("/api/events/subscribe");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && (data.type === "task-created" || data.type === "task-updated" || data.type === "task-deleted")) {
          if (sseTimer.current) clearTimeout(sseTimer.current);
          sseTimer.current = setTimeout(() => { loadOverview(); loadActivity(); loadHeatmap(); loadOverdue(); }, 300);
        }
        if (data && (data.type === "user-created" || data.type === "user-deleted" || data.type === "team-created" || data.type === "team-deleted" || data.type === "project-created" || data.type === "project-deleted")) {
          if (sseTimer.current) clearTimeout(sseTimer.current);
          sseTimer.current = setTimeout(() => { loadOverview(); }, 200);
        }
        if (data && data.type === "activity") {
          if (sseTimer.current) clearTimeout(sseTimer.current);
          sseTimer.current = setTimeout(loadActivity, 200);
        }
      } catch {}
    };
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      if (distTimer.current) clearInterval(distTimer.current);
      if (sseTimer.current) clearTimeout(sseTimer.current);
      es.close();
    };
  }, []);

  useEffect(() => { loadHeatmap(); }, [heatmapMetric, heatmapDays]);

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
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Overall team and task health overview</p>
        </div>
        <div className="text-sm text-gray-500">
          Welcome back, <span className="text-white font-medium">{currentUser.username}</span>
        </div>
      </div>

      {/* Organization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/20 to-indigo-950/10 border border-indigo-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Employees</span>

          </div>
          <div className="text-3xl font-bold text-white">{overview.employees ?? metrics.totalEmployees ?? 0}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-950/10 border border-purple-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Teams</span>

          </div>
          <div className="text-3xl font-bold text-white">{overview.teams ?? metrics.totalTeams ?? 0}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/10 border border-emerald-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Projects</span>

          </div>
          <div className="text-3xl font-bold text-white">{overview.projects ?? metrics.totalProjects ?? 0}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/10 border border-blue-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Tasks</span>

          </div>
          <div className="text-3xl font-bold text-white">{overview.tasks ?? metrics.totalTasks ?? 0}</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-950/10 border border-blue-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Tasks</span>

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

          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {metrics.blockedTasks + metrics.overdueTasks}
          </div>
          <div className="text-xs text-gray-500">
            {metrics.blockedTasks} blocked • {metrics.overdueTasks} overdue
          </div>
        </div>
      </div>

      {/* Company KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Company Completion Rate */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Company Completion Rate</span>

          </div>
          <div className="text-3xl font-bold text-white">{metrics.completionRateCompany ?? 0}%</div>
          <div className="text-xs text-gray-500">Overall across all tasks</div>
        </div>
        {/* Average Productivity */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Average Productivity</span>

          </div>
          <div className="text-3xl font-bold text-white">{metrics.avgProductivityPerUserWeek ?? 0}</div>
          <div className="text-xs text-gray-500">Tasks per person per week (90d)</div>
        </div>
        {/* Efficiency Index */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Efficiency Index</span>

          </div>
          <div className="text-3xl font-bold text-white">{metrics.efficiencyIndex ?? 0}</div>
          <div className="text-xs text-gray-500">Composite of completion, on-time, productivity</div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly Velocity */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Weekly Velocity</h3>

          </div>
          <div className="text-2xl font-bold text-blue-400 mb-2">{weeklyVelocity}</div>
          <div className="text-xs text-gray-400">Tasks completed this week</div>
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Target: 20/week</span>
              <span className={weeklyVelocity >= 20 ? "text-green-400" : "text-orange-400"}>
                {weeklyVelocity >= 20 ? "On track" : "Below target"}
              </span>
            </div>
          </div>
        </div>

        {/* Project Health */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Project Health</h3>

          </div>
          <div className="text-2xl font-bold text-green-400 mb-2">{projectHealth}%</div>
          <div className="text-xs text-gray-400">{metrics.activeProjects} active projects</div>
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">At risk: {metrics.atRiskProjects}</span>
              <span className={metrics.atRiskProjects === 0 ? "text-green-400" : "text-red-400"}>
                {metrics.atRiskProjects === 0 ? "All healthy" : "Needs attention"}
              </span>
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Team Members</h3>

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

      {/* Productivity Trends */}
      <ProductivityTrends scope="company" refId={null} />

      {/* Task Distribution Heatmap */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2"><span>🗓</span> Task Distribution Heatmap</h3>
          <div className="flex items-center gap-2 text-xs">
            <select value={heatmapMetric} onChange={(e)=>setHeatmapMetric(e.target.value)} className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-gray-200">
              <option value="created">Created</option>
              <option value="completed">Completed</option>
            </select>
            <select value={heatmapDays} onChange={(e)=>setHeatmapDays(Number(e.target.value))} className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-gray-200">
              <option value={90}>90d</option>
              <option value={180}>180d</option>
              <option value={365}>365d</option>
            </select>
          </div>
        </div>
        <div className="flex items-start gap-3 overflow-x-auto">
          <div className="flex flex-col gap-1 pt-5">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(
              <div key={d} className="h-3 text-[10px] leading-3 text-gray-500">{d.slice(0,1)}</div>
            ))}
          </div>
          <div className="flex gap-1">
            {buildHeatmapGrid(heatmapSeries).map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell, di) => (
                  <div key={di} title={`${cell.date}: ${cell.count || 0}`} className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(cell.count, heatmapMax) }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 mt-3 text-[10px] text-gray-400">
          <span>Less</span>
          {[0,0.25,0.5,0.75,1].map((p,i)=> (
            <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(Math.round(heatmapMax*p), heatmapMax) }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span></span> Task Status Distribution
          </h3>
          <DonutChart data={statusDistribution} colors={statusColors} label="Tasks" />
        </div>

        {/* Priority Distribution */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span></span> Priority Breakdown
          </h3>
          <SimpleBarChart data={priorityDistribution} colors={priorityColors} />
        </div>
      </div>

      {/* Activity & Users Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><span></span> Real-time System Activity</h3>
          <div className="space-y-2 max-h-80 overflow-auto">
            {activity.length === 0 && <div className="text-sm text-gray-500">No recent activity</div>}
            {activity.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs">{iconForAction(e.action)}</div>
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{e.action.replaceAll('_',' ')}</div>
                    <div className="text-[11px] text-gray-500 truncate">{e.user?.username || 'System'} • {new Date(e.ts).toLocaleString()}</div>
                  </div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded border ${e.status === 'success' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'}`}>{e.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><span></span> Users Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-400 mb-2">By Role</div>
              <SimpleBarChart data={roleDist} colors={roleBarColors(roleDist)} />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-2">By Department</div>
              <SimpleBarChart data={deptDist} colors={deptBarColors(deptDist)} />
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Tracker & Escalations */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2"><span></span> Overdue Tracker & Escalations</h3>
          {overdue?.summary && (
            <div className="flex items-center gap-3 text-xs">
              <div className="px-2 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-400">Total: {overdue.summary.totalOverdue}</div>
              <div className="px-2 py-1 rounded border border-orange-500/30 bg-orange-500/10 text-orange-400">Urgent: {overdue.summary.urgentOverdue}</div>
              <div className="px-2 py-1 rounded border border-pink-500/30 bg-pink-500/10 text-pink-400">Critical: {overdue.summary.criticalOverdue}</div>
              <div className="px-2 py-1 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">15d+: {overdue.summary.severeOverdue}</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-gray-400 mb-2">By Priority</div>
            {overdue?.priority ? (
              <SimpleBarChart data={overdue.priority} colors={priorityColors} />
            ) : (
              <div className="text-sm text-gray-500">Loading…</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-2">By Age</div>
            {overdue?.ageBuckets ? (
              <SimpleBarChart data={overdue.ageBuckets} colors={{ d1_3: "bg-yellow-600", d4_7: "bg-orange-600", d8_14: "bg-red-600", d15_plus: "bg-pink-600" }} />
            ) : (
              <div className="text-sm text-gray-500">Loading…</div>
            )}
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-2">Top Assignees (by overdue)</div>
            <div className="space-y-2">
              {(overdue?.topAssignees || []).map((u) => (
                <div key={u.id || u.username} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-xs text-white">{(u.username || "?").charAt(0).toUpperCase()}</div>
                    <div className="truncate text-white">{u.username}</div>
                  </div>
                  <div className="text-xs text-gray-400">{u.count}</div>
                </div>
              ))}
              {(overdue?.topAssignees || []).length === 0 && (
                <div className="text-sm text-gray-500">No data</div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-xs text-gray-400 mb-2">Oldest Overdue (escalate)</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {(overdue?.oldest || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded bg-neutral-900/40 border border-neutral-800">
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{t.title}</div>
                  <div className="text-[11px] text-gray-500 truncate">{t.assignee?.username || "Unassigned"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${t.priority === 'critical' ? 'text-pink-400 border-pink-500/30 bg-pink-500/10' : t.priority === 'urgent' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'}`}>{t.priority}</span>
                  <span className="text-[10px] text-gray-400">{daysOverdue(t.dueDate)}d overdue</span>
                </div>
              </div>
            ))}
            {(overdue?.oldest || []).length === 0 && (
              <div className="text-sm text-gray-500">No overdue tasks</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span></span> Team Workload
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
            <span></span> Upcoming Deadlines
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

            <span className="text-sm text-gray-300 group-hover:text-white">View All Tasks</span>
          </Link>
          <Link
            href="/admin/projects"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >

            <span className="text-sm text-gray-300 group-hover:text-white">View Projects</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >

            <span className="text-sm text-gray-300 group-hover:text-white">Team Members</span>
          </Link>
          <Link
            href="/admin/templates"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition-all group"
          >

            <span className="text-sm text-gray-300 group-hover:text-white">Templates</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
