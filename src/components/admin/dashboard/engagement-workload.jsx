"use client";

import { useEffect, useMemo, useState } from "react";

export default function EngagementWorkload({ scope = "company", refId = null }) {
  const [period, setPeriod] = useState("daily");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [engagement, setEngagement] = useState({ trend: [] });
  const [workload, setWorkload] = useState({ statusBreakdown: [], priorityBreakdown: [], topAssignees: [] });

  const endpointBase = useMemo(() => {
    if (scope === "company") return "/api/analytics/hr/company";
    if (scope === "department" && refId) return `/api/analytics/hr/department/${refId}`;
    if (scope === "employee" && refId) return `/api/analytics/hr/employee/${refId}`;
    return "/api/analytics/hr/company";
  }, [scope, refId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      params.set("days", String(days));

      const [engRes, wlRes] = await Promise.all([
        fetch(`${endpointBase}/engagement?${params.toString()}`),
        fetch(`${endpointBase}/workload`),
      ]);

      const engJson = await engRes.json();
      const wlJson = await wlRes.json();
      if (!engRes.ok || engJson.error) throw new Error(engJson.message || "Failed to load engagement");
      if (!wlRes.ok || wlJson.error) throw new Error(wlJson.message || "Failed to load workload");

      setEngagement(engJson.data || { trend: [] });
      setWorkload(wlJson.data || { statusBreakdown: [], priorityBreakdown: [], topAssignees: [] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [endpointBase, period, days]);

  const stats = useMemo(() => {
    const comments = engagement.trend?.reduce((s, p) => s + (p.comments || 0), 0) || 0;
    const reactions = engagement.trend?.reduce((s, p) => s + (p.reactions || 0), 0) || 0;
    return { comments, reactions };
  }, [engagement]);

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Engagement & Workload</h3>
          <p className="text-sm text-gray-400">Comments, reactions, and open-task distribution</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-900/80 border border-neutral-800 rounded-lg p-1">
            {[
              { key: "daily", label: "Daily" },
              { key: "weekly", label: "Weekly" },
              { key: "monthly", label: "Monthly" },
            ].map((opt) => (
              <button key={opt.key} onClick={() => setPeriod(opt.key)} className={`px-3 py-1.5 rounded text-sm ${period===opt.key? "bg-white text-black" : "text-gray-400 hover:text-white"}`}>{opt.label}</button>
            ))}
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm font-medium text-white">
            <option value={14}>Last 14</option>
            <option value={30}>Last 30</option>
            <option value={60}>Last 60</option>
            <option value={90}>Last 90</option>
          </select>
          <button onClick={load} disabled={loading} className="px-4 py-1.5 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">Refresh</button>
        </div>
      </div>

      {loading && <div className="px-6 py-10 text-sm text-gray-400">Loading engagement & workload...</div>}
      {error && !loading && <div className="px-6 py-4 text-sm text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Engagement trend */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">💬</span> Engagement trend</div>
              <div className="text-xs text-gray-500">{stats.comments} comments • {stats.reactions} reactions</div>
            </div>
            <DualLineChart
              dataA={(engagement.trend || []).map((p, i) => ({ x: i, y: p.comments || 0, label: p._id }))}
              dataB={(engagement.trend || []).map((p, i) => ({ x: i, y: p.reactions || 0, label: p._id }))}
              colorA="#22c55e"
              colorB="#3b82f6"
              labelA="Comments"
              labelB="Reactions"
            />
          </div>

          {/* Workload breakdown */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">📦</span> Workload distribution</div>
              <div className="text-xs text-gray-500">Open tasks breakdown</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Breakdown title="By Status" items={workload.statusBreakdown} />
              <Breakdown title="By Priority" items={workload.priorityBreakdown || []} />
            </div>

            {scope !== "employee" && (workload.topAssignees?.length > 0) && (
              <div className="mt-4">
                <div className="text-xs text-gray-400 mb-2">Top Assignees (open tasks)</div>
                <div className="space-y-2">
                  {workload.topAssignees.map((u, i) => (
                    <div key={u.userId || i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 text-white text-xs font-semibold flex items-center justify-center">{(u.username||"U").slice(0,1).toUpperCase()}</div>
                        <div className="text-sm text-white/90">{u.username}</div>
                        <div className="text-[11px] text-gray-500">{u.email}</div>
                      </div>
                      <div className="text-sm text-gray-300">{u.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DualLineChart({ dataA, dataB, colorA, colorB, labelA, labelB }) {
  const maxY = Math.max(
    1,
    ...dataA.map(d => d.y || 0),
    ...dataB.map(d => d.y || 0)
  );
  const chartHeight = 170;
  const chartWidth = 100;
  const padding = { top: 12, right: 8, bottom: 28, left: 28 };
  const points = Math.max(dataA.length, dataB.length);
  const xStep = points > 1 ? (chartWidth - padding.left - padding.right) / (points - 1) : 0;
  const yScale = (chartHeight - padding.top - padding.bottom) / maxY;

  function buildPath(data) {
    return data.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((maxY * i) / 4);
    const y = chartHeight - padding.bottom - value * yScale;
    return { value, y };
  });

  return (
    <div className="relative w-full" style={{ height: chartHeight }}>
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
        {yTicks.map((t, i) => (
          <line key={i} x1={padding.left} y1={t.y} x2={chartWidth - padding.right} y2={t.y} stroke="#262626" strokeWidth="0.2" strokeDasharray="2,2" />
        ))}
        {yTicks.map((t, i) => (
          <text key={i} x={padding.left - 5} y={t.y + 3} textAnchor="end" fontSize="8" fill="#6b7280">{t.value}</text>
        ))}
        <path d={buildPath(dataA)} fill="none" stroke={colorA} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={buildPath(dataB)} fill="none" stroke={colorB} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {dataA.map((p, i) => {
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
          return <circle key={`a-${i}`} cx={x} cy={y} r="1.8" fill={colorA} />;
        })}
        {dataB.map((p, i) => {
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
          return <circle key={`b-${i}`} cx={x} cy={y} r="1.8" fill={colorB} />;
        })}
        {dataA.map((p, i) => {
          const show = points <= 12 || i % Math.ceil(points / 10) === 0 || i === points - 1;
          if (!show) return null;
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom + 14;
          return <text key={`l-${i}`} x={x} y={y} textAnchor="middle" fontSize="7" fill="#6b7280">{p.label}</text>;
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
        <Legend color={colorA} label={labelA} />
        <Legend color={colorB} label={labelB} />
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function Breakdown({ title, items }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 0;
  return (
    <div>
      <div className="text-xs text-gray-400 mb-2">{title}</div>
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="text-xs text-gray-500">No data</div>
        )}
        {items.map((i, idx) => {
          const name = (i._id || "unknown").toString().replace(/_/g, " ");
          const percent = total > 0 ? Math.round((i.count / total) * 100) : 0;
          return (
            <div key={idx}>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="text-white/80">{name}</span>
                <span>{i.count} • {percent}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 mt-1">
                <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
