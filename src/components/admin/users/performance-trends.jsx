"use client";

import { useEffect, useMemo, useState } from "react";

export default function PerformanceTrends({ userId }) {
  const [weeks, setWeeks] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [series, setSeries] = useState([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/trends?weeks=${weeks}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load");
      setSeries(json.data?.series || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId, weeks]);

  const stats = useMemo(() => {
    const totalCompleted = series.reduce((s, p) => s + (p.completed || 0), 0);
    const avgOnTime = series.length ? Math.round(series.reduce((s, p) => s + (p.onTimeRate || 0), 0) / series.length) : 0;
    const maxCompleted = series.reduce((m, p) => Math.max(m, p.completed || 0), 0);
    return { totalCompleted, avgOnTime, maxCompleted };
  }, [series]);

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-800/50 bg-neutral-900/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Employee Productivity History</h3>
          <p className="text-xs text-gray-400">Weekly trends across {weeks} weeks</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded text-xs font-medium text-white"
          >
            <option value={6}>Last 6 weeks</option>
            <option value={12}>Last 12 weeks</option>
            <option value={24}>Last 24 weeks</option>
            <option value={52}>Last 52 weeks</option>
          </select>
          <button onClick={load} disabled={loading} className="px-3 py-1.5 bg-white text-black rounded text-xs font-medium disabled:opacity-50">Refresh</button>
        </div>
      </div>

      {loading && (
        <div className="px-6 py-8 text-sm text-gray-400">Loading productivity history...</div>
      )}
      {error && !loading && (
        <div className="px-6 py-4 text-sm text-red-400">{error}</div>
      )}
      {!loading && !error && series.length === 0 && (
        <div className="px-6 py-8 text-sm text-gray-400">No data yet.</div>
      )}

      {!loading && !error && series.length > 0 && (
        <div className="px-4 py-4 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{stats.totalCompleted}</div>
              <div className="text-xs text-gray-400">Total Completed</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">{stats.avgOnTime}%</div>
              <div className="text-xs text-gray-400">Avg On-time</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">{stats.maxCompleted}</div>
              <div className="text-xs text-gray-400">Best Week</div>
            </div>
          </div>

          {/* Completed Chart */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">✅</span> Completed per week</div>
              <div className="text-xs text-gray-500">Max {stats.maxCompleted}</div>
            </div>
            <LineChart data={series.map((p, i) => ({ x: i, label: `W${p.week}`, y: p.completed }))} maxValue={stats.maxCompleted} color="#22c55e" gradientId="completedGrad" />
          </div>

          {/* On-time Rate Chart */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-300 flex items-center gap-2"><span className="text-lg">⏱️</span> On-time rate</div>
              <div className="text-xs text-gray-500">Average {stats.avgOnTime}%</div>
            </div>
            <LineChart data={series.map((p, i) => ({ x: i, label: `W${p.week}`, y: p.onTimeRate }))} maxValue={100} color="#3b82f6" gradientId="ontimeGrad" showArea={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function LineChart({ data, maxValue, color = "#22c55e", gradientId = "gradient", showArea = true }) {
  const chartHeight = 160;
  const chartWidth = 100;
  const padding = { top: 12, right: 8, bottom: 28, left: 28 };

  const xStep = data.length > 1 ? (chartWidth - padding.left - padding.right) / (data.length - 1) : 0;
  const yScale = maxValue > 0 ? (chartHeight - padding.top - padding.bottom) / maxValue : 1;

  const linePath = data.map((p, i) => {
    const x = padding.left + i * xStep;
    const y = chartHeight - padding.bottom - p.y * yScale;
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");

  const areaPath = showArea
    ? data.map((p, i) => {
        const x = padding.left + i * xStep;
        const y = chartHeight - padding.bottom - p.y * yScale;
        if (i === 0) return `M ${x} ${chartHeight - padding.bottom} L ${x} ${y}`;
        return `L ${x} ${y}`;
      }).join(" ") + ` L ${padding.left + (data.length - 1) * xStep} ${chartHeight - padding.bottom} Z`
    : null;

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((maxValue * i) / 4);
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

        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showArea && <path d={areaPath || ""} fill={`url(#${gradientId})`} />}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((p, i) => {
          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom - p.y * yScale;
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
