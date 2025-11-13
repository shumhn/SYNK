"use client";

import { useEffect, useMemo, useState } from "react";

export default function RetentionAnalytics({ scope = "company", refId = null }) {
  const [period, setPeriod] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ summary: {}, trend: [], tenure: {} });

  const endpoint = useMemo(() => {
    if (scope === "company") return "/api/analytics/hr/company/retention";
    if (scope === "department" && refId) return `/api/analytics/hr/department/${refId}/retention`;
    return "/api/analytics/hr/company/retention";
  }, [scope, refId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load retention analytics");
      setData(json.data || { summary: {}, trend: [], tenure: {} });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [endpoint, period]);

  const summary = data.summary || {};
  const tenure = data.tenure || {};
  const trend = data.trend || [];

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Employee Retention Analytics</h3>
          <p className="text-sm text-gray-400">Headcount trend, joiners/leavers, and tenure distribution</p>
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
          <button onClick={load} disabled={loading} className="px-4 py-1.5 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">Refresh</button>
        </div>
      </div>

      {loading && <div className="px-6 py-10 text-sm text-gray-400">Loading retention analytics...</div>}
      {error && !loading && <div className="px-6 py-4 text-sm text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="px-6 py-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <SummaryCard label="Start HC" value={summary.startingHeadcount ?? 0} color="text-gray-300" />
            <SummaryCard label="End HC" value={summary.endingHeadcount ?? 0} color="text-blue-400" />
            <SummaryCard label="New Hires" value={summary.newHires ?? 0} color="text-emerald-400" />
            <SummaryCard label="Leavers" value={summary.leavers ?? 0} color="text-red-400" />
            <SummaryCard label="Retention" value={`${summary.retentionRate ?? 0}%`} color="text-purple-400" />
          </div>

          {/* Headcount and flows */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">👥</span> Headcount over time</div>
              </div>
              <SingleLineChart
                data={trend.map((p, i) => ({ x: i, y: p.headcount || 0, label: p._id }))}
                color="#22c55e"
              />
            </div>

            <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">➕➖</span> Joiners vs. Leavers</div>
              </div>
              <DualBarChart
                dataA={trend.map((p, i) => ({ x: i, y: p.newHires || 0, label: p._id }))}
                dataB={trend.map((p, i) => ({ x: i, y: p.leavers || 0, label: p._id }))}
                colorA="#3b82f6"
                colorB="#ef4444"
                labelA="New Hires"
                labelB="Leavers"
              />
            </div>
          </div>

          {/* Tenure distribution */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">⏳</span> Tenure distribution (active)</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { key: "under90", label: "< 90 days" },
                { key: "d90_180", label: "90–180 days" },
                { key: "d180_365", label: "180–365 days" },
                { key: "over365", label: "> 365 days" },
              ].map((b) => (
                <TenureBar key={b.key} label={b.label} value={tenure[b.key] || 0} total={Object.values(tenure).reduce((s, v) => s + (v || 0), 0)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function SingleLineChart({ data, color = "#22c55e" }) {
  const maxY = Math.max(1, ...data.map(d => d.y || 0));
  const chartHeight = 170;
  const chartWidth = 100;
  const padding = { top: 12, right: 8, bottom: 28, left: 28 };
  const xStep = data.length > 1 ? (chartWidth - padding.left - padding.right) / (data.length - 1) : 0;
  const yScale = (chartHeight - padding.top - padding.bottom) / maxY;
  const path = data.map((p, i) => {
    const x = padding.left + i * xStep;
    const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");
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
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((p, i) => {
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
          return <circle key={i} cx={x} cy={y} r="1.8" fill={color} />;
        })}
        {data.map((p, i) => {
          const show = data.length <= 12 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          if (!show) return null;
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom + 14;
          return <text key={i} x={x} y={y} textAnchor="middle" fontSize="7" fill="#6b7280">{p.label}</text>;
        })}
      </svg>
    </div>
  );
}

function DualBarChart({ dataA, dataB, colorA = "#3b82f6", colorB = "#ef4444", labelA = "A", labelB = "B" }) {
  const maxY = Math.max(1, ...dataA.map(d => d.y || 0), ...dataB.map(d => d.y || 0));
  const chartHeight = 170;
  const chartWidth = 100;
  const padding = { top: 12, right: 8, bottom: 28, left: 28 };
  const points = Math.max(dataA.length, dataB.length);
  const xStep = points > 1 ? (chartWidth - padding.left - padding.right) / (points - 1) : 0;
  const yScale = (chartHeight - padding.top - padding.bottom) / maxY;
  const barWidth = Math.max(1, xStep * 0.35);

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
        {dataA.map((p, i) => {
          const x = padding.left + i * xStep - barWidth * 0.55;
          const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
          const h = (p.y || 0) * yScale;
          return <rect key={`a-${i}`} x={x} y={y} width={barWidth} height={h} fill={colorA} rx="1" ry="1" />;
        })}
        {dataB.map((p, i) => {
          const x = padding.left + i * xStep + barWidth * 0.55 - barWidth;
          const y = chartHeight - padding.bottom - (p.y || 0) * yScale;
          const h = (p.y || 0) * yScale;
          return <rect key={`b-${i}`} x={x} y={y} width={barWidth} height={h} fill={colorB} rx="1" ry="1" />;
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

function TenureBar({ label, value, total }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="text-white/80">{label}</span>
        <span>{value} • {percent}%</span>
      </div>
      <div className="w-full bg-neutral-800 rounded-full h-2 mt-1">
        <div className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
