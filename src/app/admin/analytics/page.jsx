"use client";

import { useEffect, useMemo, useState } from "react";
import { utils as XLSXUtils, writeFileXLSX } from "xlsx";
import ProductivityTrends from "@/components/admin/dashboard/productivity-trends";
import DepartmentComparisonChart from "@/components/admin/dashboard/department-comparison-chart";
import HRScorecards from "@/components/admin/dashboard/hr-scorecards";
import EmployeeRankings from "@/components/admin/dashboard/employee-rankings";
import EngagementWorkload from "@/components/admin/dashboard/engagement-workload";
import RetentionAnalytics from "@/components/admin/dashboard/retention-analytics";
import AppraisalsPanel from "@/components/admin/dashboard/appraisals-panel";

export default function AnalyticsDashboard() {
  const [scope, setScope] = useState("company");
  const [refId, setRefId] = useState("");
  const [dateRange, setDateRange] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    totalEmployees: 0,
    activeProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState(null);
  const [reportsError, setReportsError] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const endpoint = useMemo(() => {
    if (scope === "company") return "/api/analytics/hr/company/kpis";
    if (scope === "department" && refId)
      return `/api/analytics/hr/department/${refId}/kpis`;
    if (scope === "employee" && refId)
      return `/api/analytics/hr/employee/${refId}/kpis`;
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
    return ranges[dateRange]
      ? `?from=${ranges[dateRange].toISOString().split("T")[0]}`
      : "";
  }, [dateRange]);

  async function fetchData() {
    if (!endpoint) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint + dateRangeParams, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.message || "Failed to load KPIs");
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

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects?archived=false");
      const json = await res.json();
      if (res.ok && !json.error) setProjects(json.data || []);
    } catch (e) {
      // Silent fail for dropdowns
    }
  }

  async function fetchReports() {
    if (scope !== "company") {
      setReports(null);
      setReportsError("");
      return;
    }
    try {
      setReportsError("");
      const params = new URLSearchParams();
      if (customFrom && customTo) {
        params.set("from", customFrom);
        params.set("to", customTo);
      }
      if (selectedUserId) params.set("userId", selectedUserId);
      if (selectedDeptId) params.set("departmentId", selectedDeptId);
      if (selectedProjectId) params.set("projectId", selectedProjectId);
      const url =
        "/api/analytics/hr/company/reports" +
        (params.toString() ? `?${params.toString()}` : "");
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.message || "Failed to load reports");
      setReports(json.data || null);
    } catch (e) {
      setReportsError(e.message || "Failed to load reports");
    }
  }

  useEffect(() => {
    fetchData();
  }, [endpoint, dateRangeParams]);
  useEffect(() => {
    fetchDepartments();
    fetchUsers();
    fetchProjects();
  }, []);
  useEffect(() => {
    fetchReports();
  }, [
    scope,
    customFrom,
    customTo,
    selectedUserId,
    selectedDeptId,
    selectedProjectId,
  ]);

  const completionRate = useMemo(() => {
    const total = data.completedTasks + data.pendingTasks;
    return total > 0 ? Math.round((data.completedTasks / total) * 100) : 0;
  }, [data]);

  const scopeTitle = useMemo(() => {
    if (scope === "company") return "Organization Overview";
    if (scope === "department") {
      const dept = departments.find((d) => d._id === refId);
      return dept ? `${dept.name} Department` : "Department Analytics";
    }
    if (scope === "employee") {
      const user = users.find((u) => u._id === refId);
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

              {/* Custom date range (company scope) */}
              {scope === "company" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm text-white"
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm text-white"
                  />
                </div>
              )}

              {/* Scope Selector */}
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value);
                  setRefId("");
                }}
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
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
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
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              )}

              {/* Report Filters (company scope) */}
              {scope === "company" && (
                <div className="flex items-center gap-2">
                  {/* Filter by Department */}
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm text-white min-w-[180px]"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  {/* Filter by User */}
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm text-white min-w-[200px]"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.username}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Project */}
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 rounded-lg text-sm text-white min-w-[200px]"
                  >
                    <option value="">All Projects</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => {
                  fetchData();
                  fetchReports();
                }}
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
        {/* Productivity Trends */}
        <ProductivityTrends
          scope={scope}
          refId={scope === "company" ? null : refId}
        />

        {/* 2.13: Productivity Reports (company scope) */}
        {scope === "company" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {reportsError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-sm text-red-300">
                Failed to load productivity reports: {reportsError}
              </div>
            )}
            {reports?.weekly && (
              <ReportCard
                title="Weekly Productivity"
                icon="📅"
                accent="from-blue-500 to-cyan-500"
                report={reports.weekly}
              />
            )}
            {reports?.monthly && (
              <ReportCard
                title="Monthly Productivity"
                icon="🗓️"
                accent="from-purple-500 to-pink-500"
                report={reports.monthly}
              />
            )}
            {reports?.custom && (
              <ReportCard
                title="Custom Range Productivity"
                icon="📈"
                accent="from-emerald-500 to-green-500"
                report={reports.custom}
              />
            )}
          </div>
        )}

        {/* HR Scorecards - Company and Department scopes */}
        {(scope === "company" || scope === "department") && (
          <HRScorecards
            scope={scope}
            refId={scope === "department" ? refId : null}
          />
        )}

        {/* Employee Rankings - Company and Department scopes */}
        {(scope === "company" || scope === "department") && (
          <EmployeeRankings
            scope={scope}
            refId={scope === "department" ? refId : null}
          />
        )}

        {/* Appraisals Panel - All scopes (shows open cycle progress) */}
        <AppraisalsPanel />

        {/* Engagement & Workload - All scopes */}
        <EngagementWorkload
          scope={scope}
          refId={scope === "company" ? null : refId}
        />

        {/* Retention Analytics - Company and Department scopes */}
        {(scope === "company" || scope === "department") && (
          <RetentionAnalytics
            scope={scope}
            refId={scope === "department" ? refId : null}
          />
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Completion Rate */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Task Completion Rate
              </h3>
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
                {data.completedTasks} completed out of{" "}
                {data.completedTasks + data.pendingTasks} total tasks
              </p>
            </div>
          </div>

          {/* Workload Distribution */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Workload Distribution
              </h3>
              <span className="text-2xl">⚖️</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Tasks per Employee
                </span>
                <span className="text-xl font-bold text-white">
                  {data.totalEmployees > 0
                    ? Math.round(
                        (data.completedTasks + data.pendingTasks) /
                          data.totalEmployees
                      )
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Projects per Employee
                </span>
                <span className="text-xl font-bold text-white">
                  {data.totalEmployees > 0
                    ? Math.round(
                        (data.activeProjects / data.totalEmployees) * 10
                      ) / 10
                    : 0}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-400">
                    Balanced workload distribution
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Performance Insights
              </h3>
              <span className="text-2xl">🎯</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-300">
                  {completionRate >= 80
                    ? "Excellent"
                    : completionRate >= 60
                    ? "Good"
                    : "Needs Improvement"}{" "}
                  completion rate
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

function ReportCard({ title, icon, accent, report }) {
  const dirColor =
    report?.deltas?.direction === "up"
      ? "text-emerald-400"
      : report?.deltas?.direction === "down"
      ? "text-red-400"
      : "text-gray-300";
  const rateDir =
    report?.deltas?.completionRate > 0
      ? "up"
      : report?.deltas?.completionRate < 0
      ? "down"
      : "stable";
  const rateColor =
    rateDir === "up"
      ? "text-emerald-400"
      : rateDir === "down"
      ? "text-red-400"
      : "text-gray-300";

  function reportToRows(r) {
    return [
      { metric: "label", value: r?.label || "" },
      { metric: "range.from", value: r?.range?.from || "" },
      { metric: "range.to", value: r?.range?.to || "" },
      { metric: "metrics.completed", value: r?.metrics?.completed ?? 0 },
      { metric: "metrics.created", value: r?.metrics?.created ?? 0 },
      {
        metric: "metrics.completionRate",
        value: r?.metrics?.completionRate ?? 0,
      },
      {
        metric: "metrics.avgCompletedPerDay",
        value: r?.metrics?.avgCompletedPerDay ?? 0,
      },
      { metric: "comparison.completed", value: r?.comparison?.completed ?? 0 },
      { metric: "comparison.created", value: r?.comparison?.created ?? 0 },
      {
        metric: "comparison.completionRate",
        value: r?.comparison?.completionRate ?? 0,
      },
      { metric: "deltas.completed", value: r?.deltas?.completed ?? 0 },
      { metric: "deltas.completedPct", value: r?.deltas?.completedPct ?? 0 },
      {
        metric: "deltas.completionRate",
        value: r?.deltas?.completionRate ?? 0,
      },
      { metric: "deltas.direction", value: r?.deltas?.direction || "stable" },
    ];
  }

  function exportReportCSV(r, name) {
    const rows = reportToRows(r);
    const header = "metric,value\n";
    const body = rows
      .map((x) => `${x.metric},${String(x.value).replaceAll(",", ";")}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replaceAll(" ", "_").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportReportExcel(r, name) {
    const rows = reportToRows(r);
    const ws = XLSXUtils.json_to_sheet(rows);
    const wb = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(wb, ws, "Report");
    writeFileXLSX(wb, `${name.replaceAll(" ", "_").toLowerCase()}.xlsx`);
  }

  function exportReportPDF(r, name, ttl) {
    const rows = reportToRows(r);
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const style =
      "body{font-family:sans-serif;color:#111} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f3f4f6}";
    const table = `
      <h2>${ttl}</h2>
      <p><small>${new Date(r?.range?.from).toLocaleString()} – ${new Date(
      r?.range?.to
    ).toLocaleString()}</small></p>
      <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
      ${rows
        .map((x) => `<tr><td>${x.metric}</td><td>${x.value}</td></tr>`)
        .join("")}
      </tbody></table>`;
    win.document.write(
      `<html><head><title>${name}</title><style>${style}</style></head><body>${table}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function fetchAiSummary() {
    try {
      setAiError("");
      setAiLoading(true);
      const res = await fetch("/api/analytics/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: report?.label || title,
          range: report?.range,
          metrics: report?.metrics,
          comparison: report?.comparison,
          deltas: report?.deltas,
          filters: {},
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error)
        throw new Error(json.message || "Failed to get AI summary");
      setAiSummary(json.data?.summary || "");
    } catch (e) {
      setAiError(e.message || "Failed to get AI summary");
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    // Auto-refresh AI summary when the underlying report changes
    setAiSummary("");
    setAiError("");
    if (!report) return;
    fetchAiSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    report?.label,
    report?.range?.from,
    report?.range?.to,
    report?.metrics?.completed,
    report?.metrics?.created,
    report?.metrics?.completionRate,
  ]);

  const completionDelta = report?.deltas?.completionRate ?? 0; // change in completion rate (percentage points)
  const completedDeltaPct = report?.deltas?.completedPct ?? 0;
  const completedDelta = report?.deltas?.completed ?? 0;

  function buildSummary() {
    if (!report) return "No data available for this period.";

    const parts = [];
    const lbl = (report?.label || "").toLowerCase();
    const period = lbl.includes("week")
      ? "this week"
      : lbl.includes("month")
      ? "this month"
      : lbl.includes("custom")
      ? "this range"
      : "this period";
    const prevText =
      period === "this week"
        ? "last week"
        : period === "this month"
        ? "last month"
        : period === "this range"
        ? "the previous range"
        : "the previous period";

    // Treat completion delta as percentage change in productivity for user-facing copy
    const pctChange = completionDelta; // already percentage points; present as % for simplicity
    if (pctChange > 0.5) {
      parts.push(
        `Productivity improved ${pctChange.toFixed(
          1
        )}% ${period} vs ${prevText}.`
      );
    } else if (pctChange < -0.5) {
      parts.push(
        `Productivity dropped ${Math.abs(pctChange).toFixed(
          1
        )}% ${period} vs ${prevText}.`
      );
    } else {
      parts.push(`Productivity was stable ${period} vs ${prevText}.`);
    }

    // Completed tasks context
    if (Math.abs(completedDeltaPct) >= 5) {
      const dir = completedDeltaPct > 0 ? "up" : "down";
      const pct = Math.round(Math.abs(completedDeltaPct));
      const signed =
        completedDelta >= 0 ? `+${completedDelta}` : `${completedDelta}`;
      parts.push(`Completed tasks are ${dir} ${pct}% (${signed}).`);
    }

    // Task intake (created) context
    const createdNow = report?.metrics?.created ?? 0;
    const createdPrev = report?.comparison?.created ?? 0;
    const createdDelta = createdNow - createdPrev;
    if (createdPrev > 0) {
      const createdPct = (createdDelta / createdPrev) * 100;
      if (Math.abs(createdPct) >= 5) {
        const dir = createdPct > 0 ? "increased" : "decreased";
        parts.push(
          `Task intake ${dir} by ${Math.round(Math.abs(createdPct))}%.`
        );
      }
    }

    if (!parts.length)
      return `No significant change detected ${period} vs ${prevText}.`;
    return parts.join(" ");
  }

  return (
    <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-xl`}
        >
          {icon}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-xs text-gray-500">
            {new Date(report?.range?.from).toLocaleDateString()} –{" "}
            {new Date(report?.range?.to).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-700/50 rounded text-xs text-white"
            onClick={() => exportReportCSV(report, title)}
          >
            CSV
          </button>
          <button
            className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-700/50 rounded text-xs text-white"
            onClick={() => exportReportExcel(report, title)}
          >
            Excel
          </button>
          <button
            className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-700/50 rounded text-xs text-white"
            onClick={() => exportReportPDF(report, title, title)}
          >
            PDF
          </button>
          <button
            className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-700/50 rounded text-xs text-white"
            onClick={fetchAiSummary}
            disabled={aiLoading}
          >
            {aiLoading ? "AI…" : "AI Summary"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-400">Completed</div>
          <div className="text-2xl font-bold text-white">
            {report?.metrics?.completed ?? 0}
          </div>
          <div className={`text-xs ${dirColor}`}>
            {report?.deltas?.completed > 0 ? "+" : ""}
            {report?.deltas?.completed ?? 0} (
            {report?.deltas?.completedPct ?? 0}%)
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Created</div>
          <div className="text-2xl font-bold text-white">
            {report?.metrics?.created ?? 0}
          </div>
          <div className="text-xs text-gray-400">
            Prev: {report?.comparison?.created ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Completion Rate</div>
          <div className="text-2xl font-bold text-white">
            {report?.metrics?.completionRate ?? 0}%
          </div>
          <div className={`text-xs ${rateColor}`}>
            {rateDir === "up" ? "+" : ""}
            {report?.deltas?.completionRate ?? 0} pts
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Avg Completed / Day</div>
          <div className="text-2xl font-bold text-white">
            {report?.metrics?.avgCompletedPerDay ?? 0}
          </div>
          <div className="text-xs text-gray-400">
            Prev CR: {report?.comparison?.completionRate ?? 0}%
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-neutral-950/40 border border-neutral-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Completed vs Created</div>
          {(() => {
            const completed = Number(report?.metrics?.completed ?? 0);
            const created = Number(report?.metrics?.created ?? 0);
            const max = Math.max(1, completed, created);
            const cW = Math.max(2, Math.round((completed / max) * 100));
            const crW = Math.max(2, Math.round((created / max) * 100));
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <div className="flex-1 h-2 bg-emerald-600/30 rounded">
                    <div
                      className="h-2 bg-emerald-500 rounded"
                      style={{ width: `${cW}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1 h-2 bg-blue-600/30 rounded">
                    <div
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${crW}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="bg-neutral-950/40 border border-neutral-800/50 rounded-lg p-3 flex items-center justify-center">
          {(() => {
            const rate = Math.max(
              0,
              Math.min(100, Number(report?.metrics?.completionRate ?? 0))
            );
            const size = 64;
            const stroke = 8;
            const r = (size - stroke) / 2;
            const c = 2 * Math.PI * r;
            const offset = c - (rate / 100) * c;
            return (
              <svg width={size} height={size} className="rotate-[-90deg]">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="#2b2b2b"
                  strokeWidth={stroke}
                  fill="none"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="#10b981"
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${c} ${c}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
                <g transform={`rotate(90 ${size / 2} ${size / 2})`}>
                  <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize="12"
                    fill="#e5e7eb"
                  >
                    {rate}%
                  </text>
                </g>
              </svg>
            );
          })()}
        </div>
        <div className="bg-neutral-950/40 border border-neutral-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Prev vs Current</div>
          {(() => {
            const prevVal = Number(report?.comparison?.completed ?? 0);
            const currVal = Number(report?.metrics?.completed ?? 0);
            const max = Math.max(1, prevVal, currVal);
            const w = 120,
              h = 40,
              pad = 4;
            const yPrev = h - pad - (prevVal / max) * (h - 2 * pad);
            const yCurr = h - pad - (currVal / max) * (h - 2 * pad);
            const path = `M ${pad},${yPrev} L ${w - pad},${yCurr}`;
            const area = `M ${pad},${h - pad} L ${pad},${yPrev} L ${
              w - pad
            },${yCurr} L ${w - pad},${h - pad} Z`;
            return (
              <svg width={w} height={h}>
                <path d={area} fill="rgba(59,130,246,0.15)" />
                <path d={path} stroke="#60a5fa" strokeWidth="2" fill="none" />
                <circle cx={pad} cy={yPrev} r="2" fill="#93c5fd" />
                <circle cx={w - pad} cy={yCurr} r="2" fill="#93c5fd" />
              </svg>
            );
          })()}
        </div>
      </div>
      {aiError && <div className="mt-3 text-xs text-red-400">{aiError}</div>}
      <div className="mt-4 border-t border-neutral-800 pt-3 text-xs leading-relaxed">
        {aiSummary ? (
          <div className="text-emerald-300">{aiSummary}</div>
        ) : (
          <div className="text-gray-300">{buildSummary()}</div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, bgColor, borderColor }) {
  return (
    <div
      className={`${bgColor} backdrop-blur-xl border ${borderColor} rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 group`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg`}
        >
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {label}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div
          className={`text-4xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}
        >
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
