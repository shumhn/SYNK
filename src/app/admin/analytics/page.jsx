"use client";

import { useEffect, useMemo, useState } from "react";

export default function AnalyticsDashboard() {
  const [scope, setScope] = useState("company");
  const [refId, setRefId] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ totalEmployees: 0, activeProjects: 0, completedTasks: 0, pendingTasks: 0 });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);

  const endpoint = useMemo(() => {
    if (scope === "company") return "/api/analytics/hr/company/kpis";
    if (scope === "department" && refId) return `/api/analytics/hr/department/${refId}/kpis`;
    if (scope === "employee" && refId) return `/api/analytics/hr/employee/${refId}/kpis`;
    return "";
  }, [scope, refId]);

  const dateRangeParams = useMemo(() => {
    const now = new Date();
    const ranges = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "1y": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    return ranges[dateRange] ? `?from=${ranges[dateRange].toISOString().split('T')[0]}` : "";
  }, [dateRange]);

  async function fetchData() {
    if (!endpoint) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint + dateRangeParams, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load KPIs");
      setData(json.data || {});
    } catch (e) {
      setError(e.message || "Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (res.ok && !json.error) setDepartments(json.data || []);
    } catch (e) {
      // Silent fail for dropdowns
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users?limit=100");
      const json = await res.json();
      if (res.ok && !json.error) setUsers(json.data || []);
    } catch (e) {
      // Silent fail for dropdowns
    }
  }

  useEffect(() => { fetchData(); }, [endpoint, dateRangeParams]);
  useEffect(() => { fetchDepartments(); fetchUsers(); }, []);

  const completionRate = useMemo(() => {
    const total = data.completedTasks + data.pendingTasks;
    return total > 0 ? Math.round((data.completedTasks / total) * 100) : 0;
  }, [data]);

  const scopeTitle = useMemo(() => {
    if (scope === "company") return "Organization Overview";
    if (scope === "department") {
      const dept = departments.find(d => d._id === refId);
      return dept ? `${dept.name} Department` : "Department Analytics";
    }
    if (scope === "employee") {
      const user = users.find(u => u._id === refId);
      return user ? `${user.username} Performance` : "Employee Analytics";
    }
    return "Analytics Dashboard";
  }, [scope, refId, departments, users]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800/50 bg-neutral-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                HR & Performance Analytics
              </h1>
              <p className="text-gray-400 text-sm font-medium">{scopeTitle}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2.5 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>

              {/* Scope Selector */}
              <select 
                value={scope} 
                onChange={(e) => { setScope(e.target.value); setRefId(""); }} 
                className="px-4 py-2.5 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              >
                <option value="company">🏢 Company</option>
                <option value="department">🏬 Department</option>
                <option value="employee">👤 Employee</option>
              </select>

              {/* Dynamic ID Selector */}
              {scope === "department" && (
                <select 
                  value={refId} 
                  onChange={(e) => setRefId(e.target.value)}
                  className="px-4 py-2.5 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-w-[200px]"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              )}

              {scope === "employee" && (
                <select 
                  value={refId} 
                  onChange={(e) => setRefId(e.target.value)}
                  className="px-4 py-2.5 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-w-[200px]"
                >
                  <option value="">Select Employee</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.username} ({user.email})</option>
                  ))}
                </select>
              )}

              <button 
                onClick={fetchData} 
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loading
                  </div>
                ) : (
                  "🔄 Refresh"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8 space-y-8">
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-xs">⚠️</span>
            </div>
            {error}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <KpiCard 
            label="Total Employees" 
            value={data.totalEmployees} 
            icon="👥" 
            color="from-blue-500 to-cyan-500"
            bgColor="bg-blue-500/10"
            borderColor="border-blue-500/20"
          />
          <KpiCard 
            label="Active Projects" 
            value={data.activeProjects} 
            icon="📁" 
            color="from-purple-500 to-pink-500"
            bgColor="bg-purple-500/10"
            borderColor="border-purple-500/20"
          />
          <KpiCard 
            label="Completed Tasks" 
            value={data.completedTasks} 
            icon="✅" 
            color="from-green-500 to-emerald-500"
            bgColor="bg-green-500/10"
            borderColor="border-green-500/20"
          />
          <KpiCard 
            label="Pending Tasks" 
            value={data.pendingTasks} 
            icon="⏳" 
            color="from-orange-500 to-yellow-500"
            bgColor="bg-orange-500/10"
            borderColor="border-orange-500/20"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Completion Rate */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Task Completion Rate</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="space-y-4">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {completionRate}%
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">
                {data.completedTasks} completed out of {data.completedTasks + data.pendingTasks} total tasks
              </p>
            </div>
          </div>

          {/* Workload Distribution */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Workload Distribution</h3>
              <span className="text-2xl">⚖️</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Tasks per Employee</span>
                <span className="text-xl font-bold text-white">
                  {data.totalEmployees > 0 ? Math.round((data.completedTasks + data.pendingTasks) / data.totalEmployees) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Projects per Employee</span>
                <span className="text-xl font-bold text-white">
                  {data.totalEmployees > 0 ? Math.round(data.activeProjects / data.totalEmployees * 10) / 10 : 0}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-400">Balanced workload distribution</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Performance Insights</h3>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-300">
                  {completionRate >= 80 ? "Excellent" : completionRate >= 60 ? "Good" : "Needs Improvement"} completion rate
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-300">
                  {data.activeProjects} active projects in progress
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-300">
                  {data.totalEmployees} team members contributing
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
              <span className="font-medium">Loading analytics data...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, bgColor, borderColor }) {
  return (
    <div className={`${bgColor} backdrop-blur-xl border ${borderColor} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className={`text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {Number(value || 0).toLocaleString()}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span>Live data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
