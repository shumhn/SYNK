"use client";

import { useEffect, useMemo, useState } from "react";

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

export default function MyPerformancePage() {
  const [range, setRange] = useState("90d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, to] = useMemo(() => {
    const now = new Date();
    let fromDate = new Date(now);
    if (range === "30d")
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (range === "60d")
      fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (range === "90d")
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (range === "180d")
      fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    return [formatDateInput(fromDate), formatDateInput(now)];
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("from", from);
        params.set("to", to);
        const res = await fetch(
          `/api/analytics/hr/scorecards/me?${params.toString()}`
        );
        const json = await res.json();
        if (!res.ok || json.error)
          throw new Error(json.message || "Failed to load performance");
        if (!cancelled) setData(json.data || null);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load performance");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const metrics = data?.metrics;
  const user = data?.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Performance</h1>
            <p className="text-sm text-gray-400 mt-1">
              Personal productivity and delivery metrics based on your real
              tasks.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div>
              <div className="text-xs text-gray-500">Range</div>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="mt-0.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-gray-200"
              >
                <option value="30d">Last 30 days</option>
                <option value="60d">Last 60 days</option>
                <option value="90d">Last 90 days</option>
                <option value="180d">Last 180 days</option>
              </select>
            </div>
          </div>
        </header>

        {loading && (
          <div className="text-gray-400 text-sm">Loading your performance…</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Top summary */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-emerald-900/30 to-emerald-950/40 border border-emerald-700/40 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-emerald-300/80">
                      Performance Index
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-white">
                        {data.score}
                      </span>
                      <span className="text-xs text-gray-400">/ 100</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <div>
                      {from} → {to}
                    </div>
                    <div>{data.range?.weeks || 0} week window</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-gray-300">
                  <div>
                    <div className="text-gray-400 mb-1">On-time delivery</div>
                    <div className="text-lg font-semibold text-emerald-300">
                      {metrics.onTimeRate}%
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Completed by due date
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Throughput</div>
                    <div className="text-lg font-semibold text-blue-300">
                      {metrics.throughput}/wk
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Avg completed per week
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Overdue rate</div>
                    <div className="text-lg font-semibold text-red-300">
                      {metrics.overdueRate}%
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Share of open work overdue
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-gray-400 mb-1">You</div>
                  <div className="text-sm font-semibold text-white">
                    {user?.username}
                  </div>
                  <div className="text-xs text-gray-500 break-all">
                    {user?.email}
                  </div>
                  {user?.department && (
                    <div className="mt-1 text-xs text-gray-400">
                      Department:{" "}
                      <span className="text-gray-200">{user.department}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-[11px] text-gray-500">
                  This summary is computed from your real tasks (completed,
                  pending, and overdue) over the selected period.
                </div>
              </div>
            </section>

            {/* Workload + quality breakdown */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>📋</span> Workload
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs text-gray-300">
                  <div>
                    <div className="text-gray-400 mb-1">Completed</div>
                    <div className="text-xl font-semibold text-emerald-300">
                      {metrics.completed}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      In this period
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Active</div>
                    <div className="text-xl font-semibold text-blue-300">
                      {metrics.pending}
                    </div>
                    <div className="text-[11px] text-gray-500">Open tasks</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Overdue</div>
                    <div className="text-xl font-semibold text-red-300">
                      {metrics.overdueOpen}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Open & past due
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">Completion rate</span>
                    <span className="text-gray-200">
                      {metrics.completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                      style={{ width: `${metrics.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>✅</span> Delivery Quality
                  </h2>
                </div>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li>
                    <span className="text-gray-400">On-time tasks: </span>
                    <span className="text-emerald-300 font-semibold">
                      {metrics.onTimeRate}%
                    </span>
                  </li>
                  <li>
                    <span className="text-gray-400">Average throughput: </span>
                    <span className="text-blue-300 font-semibold">
                      {metrics.throughput} tasks/week
                    </span>
                  </li>
                  <li>
                    <span className="text-gray-400">
                      Overdue share of open work:{" "}
                    </span>
                    <span className="text-red-300 font-semibold">
                      {metrics.overdueRate}%
                    </span>
                  </li>
                  <li className="text-[11px] text-gray-500 mt-2">
                    Overdue and open tasks reduce your performance index.
                    Clearing open overdue items will improve this score.
                  </li>
                </ul>
              </div>
            </section>
          </div>
        )}

        {!loading && !error && !data && (
          <div className="text-gray-400 text-sm">
            No performance data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
