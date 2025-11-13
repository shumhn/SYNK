"use client";

import { useState, useEffect } from "react";

export default function ProductivityTrends({ scope = "company", refId = null }) {
  const [period, setPeriod] = useState("daily");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchTrends();
  }, [period, days, scope, refId]);

  async function fetchTrends() {
    setLoading(true);
    setError(null);

    try {
      let endpoint = `/api/analytics/hr/company/trends?period=${period}&days=${days}`;
      if (scope === "department" && refId) {
        endpoint = `/api/analytics/hr/department/${refId}/trends?period=${period}&days=${days}`;
      } else if (scope === "employee" && refId) {
        endpoint = `/api/analytics/hr/employee/${refId}/trends?period=${period}&days=${days}`;
      }

      const res = await fetch(endpoint);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.message || "Failed to load trends");
      }

      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin"></div>
            <span className="font-medium">Loading productivity trends...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { trend, summary } = data;
  const maxValue = Math.max(...trend.map(t => Math.max(t.completed, t.created, t.inProgress)));

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Productivity Trends
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {summary.period === "daily" && `Daily breakdown over ${summary.days} days`}
              {summary.period === "weekly" && `Weekly breakdown over ${Math.ceil(summary.days / 7)} weeks`}
              {summary.period === "monthly" && `Monthly breakdown over ${Math.ceil(summary.days / 30)} months`}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-neutral-900/80 rounded-lg p-1 border border-neutral-800">
              <button
                onClick={() => setPeriod("daily")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  period === "daily"
                    ? "bg-white text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPeriod("weekly")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  period === "weekly"
                    ? "bg-white text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setPeriod("monthly")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  period === "monthly"
                    ? "bg-white text-black shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Range Selector */}
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-neutral-950/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{summary.totalCompleted}</div>
          <div className="text-xs text-gray-400 mt-1">Total Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.avgCompleted}</div>
          <div className="text-xs text-gray-400 mt-1">Avg / {summary.period === "daily" ? "Day" : summary.period === "weekly" ? "Week" : "Month"}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{summary.totalCreated}</div>
          <div className="text-xs text-gray-400 mt-1">Total Created</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
            summary.velocityDirection === "up" ? "text-green-400" :
            summary.velocityDirection === "down" ? "text-red-400" :
            "text-gray-400"
          }`}>
            {summary.velocityDirection === "up" && "↗"}
            {summary.velocityDirection === "down" && "↘"}
            {summary.velocityDirection === "stable" && "→"}
            <span>{Math.abs(summary.velocityChange)}%</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">Velocity Trend</div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-6">
        <LineChart data={trend} maxValue={maxValue} />
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className="text-gray-400">In Progress</span>
        </div>
      </div>
    </div>
  );
}

function LineChart({ data, maxValue }) {
  const chartHeight = 300;
  const chartWidth = 100; // percentage
  const padding = { top: 20, right: 10, bottom: 40, left: 40 };

  // Calculate scales
  const xStep = (chartWidth - padding.left - padding.right) / (data.length - 1 || 1);
  const yScale = maxValue > 0 ? (chartHeight - padding.top - padding.bottom) / maxValue : 1;

  // Generate path for completed line
  const completedPath = data
    .map((point, i) => {
      const x = padding.left + i * xStep;
      const y = chartHeight - padding.bottom - point.completed * yScale;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Generate path for created line
  const createdPath = data
    .map((point, i) => {
      const x = padding.left + i * xStep;
      const y = chartHeight - padding.bottom - point.created * yScale;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Generate path for in-progress line
  const inProgressPath = data
    .map((point, i) => {
      const x = padding.left + i * xStep;
      const y = chartHeight - padding.bottom - point.inProgress * yScale;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(" ");

  // Generate area fill for completed
  const completedArea = data
    .map((point, i) => {
      const x = padding.left + i * xStep;
      const y = chartHeight - padding.bottom - point.completed * yScale;
      if (i === 0) return `M ${x} ${chartHeight - padding.bottom} L ${x} ${y}`;
      return `L ${x} ${y}`;
    })
    .join(" ") + ` L ${padding.left + (data.length - 1) * xStep} ${chartHeight - padding.bottom} Z`;

  // Calculate Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = Math.round((maxValue * i) / 4);
    const y = chartHeight - padding.bottom - value * yScale;
    return { value, y };
  });

  return (
    <div className="relative w-full" style={{ height: chartHeight }}>
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={chartWidth - padding.right}
            y2={tick.y}
            stroke="#262626"
            strokeWidth="0.2"
            strokeDasharray="2,2"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={padding.left - 5}
            y={tick.y + 3}
            textAnchor="end"
            fontSize="8"
            fill="#6b7280"
          >
            {tick.value}
          </text>
        ))}

        {/* Area fill (gradient) */}
        <defs>
          <linearGradient id="completedGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={completedArea} fill="url(#completedGradient)" />

        {/* Lines */}
        <path
          d={inProgressPath}
          fill="none"
          stroke="#a855f7"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={createdPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={completedPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, i) => {
          const x = padding.left + i * xStep;
          const yCompleted = chartHeight - padding.bottom - point.completed * yScale;
          const yCreated = chartHeight - padding.bottom - point.created * yScale;
          const yInProgress = chartHeight - padding.bottom - point.inProgress * yScale;

          return (
            <g key={i}>
              <circle cx={x} cy={yCompleted} r="2" fill="#22c55e" className="hover:r-3 transition-all" />
              <circle cx={x} cy={yCreated} r="1.5" fill="#3b82f6" className="hover:r-2.5 transition-all" />
              <circle cx={x} cy={yInProgress} r="1.5" fill="#a855f7" className="hover:r-2.5 transition-all" />
            </g>
          );
        })}

        {/* X-axis labels (show every nth label to avoid crowding) */}
        {data.map((point, i) => {
          const showLabel = data.length <= 15 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          if (!showLabel) return null;

          const x = padding.left + i * xStep;
          const y = chartHeight - padding.bottom + 15;

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="7"
              fill="#6b7280"
              className="select-none"
            >
              {point.period.length > 10 ? point.period.substring(0, 8) + "..." : point.period}
            </text>
          );
        })}
      </svg>

      {/* Hover tooltip (could be enhanced with state management) */}
      <div className="absolute top-2 right-2 text-xs text-gray-500">
        Hover over data points for details
      </div>
    </div>
  );
}
