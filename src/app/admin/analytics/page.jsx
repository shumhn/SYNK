"use client";

import { useEffect, useMemo, useState } from "react";

export default function AnalyticsDashboard() {
  const [scope, setScope] = useState("company");
  const [refId, setRefId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ totalEmployees: 0, activeProjects: 0, completedTasks: 0, pendingTasks: 0 });

  const endpoint = useMemo(() => {
    if (scope === "company") return "/api/analytics/hr/company/kpis";
    if (scope === "department" && refId) return `/api/analytics/hr/department/${refId}/kpis`;
    if (scope === "employee" && refId) return `/api/analytics/hr/employee/${refId}/kpis`;
    return "";
  }, [scope, refId]);

  async function fetchData() {
    if (!endpoint) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load KPIs");
      setData(json.data || {});
    } catch (e) {
      setError(e.message || "Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [endpoint]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">📊 HR & Performance Analytics</h1>
        <div className="flex items-center gap-2">
          <select value={scope} onChange={(e) => { setScope(e.target.value); setRefId(""); }} className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm">
            <option value="company">Company</option>
            <option value="department">Department</option>
            <option value="employee">Employee</option>
          </select>
          {scope !== "company" && (
            <input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder={`${scope} id`} className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded text-sm w-64" />
          )}
          <button onClick={fetchData} className="px-4 py-2 bg-white text-black rounded font-medium">Refresh</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-600 text-white rounded text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Employees" value={data.totalEmployees} emoji="👥" />
        <KpiCard label="Active Projects" value={data.activeProjects} emoji="📁" />
        <KpiCard label="Completed Tasks" value={data.completedTasks} emoji="✅" />
        <KpiCard label="Pending Tasks" value={data.pendingTasks} emoji="⏳" />
      </div>

      {loading && <div className="text-gray-400">Loading...</div>}
    </div>
  );
}

function KpiCard({ label, value, emoji }) {
  return (
    <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-3xl font-bold text-white mt-1">{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}
