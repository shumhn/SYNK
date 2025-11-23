"use client";

import { useState, useEffect, useMemo } from "react";

export default function ComparativeTrends() {
  const [departments, setDepartments] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [metric, setMetric] = useState("completionRate"); // completionRate, productivity, completed
  const [period, setPeriod] = useState("daily");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  // Load available departments
  useEffect(() => {
    fetch("/api/departments")
      .then(res => res.json())
      .then(json => {
        if (json.data) {
          setDepartments(json.data);
          // Select top 3 by default
          setSelectedDepts(json.data.slice(0, 3).map(d => d._id));
        }
      })
      .catch(() => {});
  }, []);

  // Load chart data
  useEffect(() => {
    if (selectedDepts.length === 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      metric,
      period,
      days: String(days),
      departmentIds: selectedDepts.join(",")
    });

    fetch(`/api/analytics/compare/trends?${params.toString()}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) throw new Error(json.message);
        setData(json.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

  }, [selectedDepts, metric, period, days]);

  const toggleDept = (id) => {
    setSelectedDepts(prev => {
      if (prev.includes(id)) return prev.filter(d => d !== id);
      if (prev.length >= 5) return prev; // Max 5 for readability
      return [...prev, id];
    });
  };

  const metricConfig = {
    completionRate: { label: "Completion Rate", unit: "%" },
    productivity: { label: "Productivity", unit: " tasks/emp" },
    completed: { label: "Completed Tasks", unit: "" }
  };

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">📉</span>
              Comparative Trends
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Compare performance across departments over time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Selector */}
            <select 
              value={metric} 
              onChange={(e) => setMetric(e.target.value)}
              className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm text-white"
            >
              <option value="completionRate">Completion Rate</option>
              <option value="productivity">Productivity</option>
              <option value="completed">Total Completed</option>
            </select>

            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-neutral-900/80 rounded-lg p-1 border border-neutral-800">
              {["daily", "weekly", "monthly"].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-medium capitalize transition-all ${
                    period === p ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Range Selector */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm text-white"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>6 Months</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </div>

        {/* Department Selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {departments.map(dept => {
            const isSelected = selectedDepts.includes(dept._id);
            return (
              <button
                key={dept._id}
                onClick={() => toggleDept(dept._id)}
                className={`px-2 py-1 rounded-full text-xs border transition-all flex items-center gap-2 ${
                  isSelected 
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                    : "bg-neutral-800 border-neutral-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: isSelected ? (dept.color || "#3b82f6") : "#6b7280" }} 
                />
                {dept.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Area */}
      <div className="px-6 py-6 min-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
            Loading comparison...
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-red-400 bg-red-500/5 rounded-xl border border-red-500/10">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <MultiLineChart 
            data={data} 
            unit={metricConfig[metric].unit} 
          />
        )}

        {!loading && !error && !data && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Select departments to compare
          </div>
        )}
      </div>
    </div>
  );
}

function MultiLineChart({ data, unit }) {
  const { buckets, series } = data;
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  
  // Find max value for scaling
  const allValues = series.flatMap(s => s.data);
  const maxValue = Math.max(...allValues, 1); // Ensure at least 1 to avoid div by zero

  // Scales
  const xScale = (index) => {
    const width = 100; // percent
    return (index / (buckets.length - 1 || 1)) * width;
  };

  const yScale = (value) => {
    return chartHeight - padding.bottom - (value / maxValue) * (chartHeight - padding.top - padding.bottom);
  };

  // Generate paths
  const paths = series.map(s => {
    const d = s.data.map((val, i) => {
      const x = xScale(i); // percent
      const y = yScale(val); // px
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(" ");
    return { ...s, d };
  });

  // Y-axis ticks (5 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxValue * p));

  return (
    <div className="relative w-full h-[300px]">
      {/* SVG Chart */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 100 ${chartHeight}`} 
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        {/* Grid Lines */}
        {yTicks.map((tick, i) => (
          <line 
            key={i}
            x1="0" 
            y1={yScale(tick)} 
            x2="100" 
            y2={yScale(tick)} 
            stroke="#262626" 
            strokeWidth="1" 
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Y-Axis Labels */}
        {yTicks.map((tick, i) => (
          <text 
            key={i} 
            x="-10" 
            y={yScale(tick) + 4} 
            textAnchor="end" 
            className="text-[10px] fill-gray-500"
          >
            {tick}{unit}
          </text>
        ))}

        {/* Series Lines */}
        {paths.map(s => (
          <g key={s.id} className="group">
            <path 
              d={s.d} 
              fill="none" 
              stroke={s.color} 
              strokeWidth="2" 
              vectorEffect="non-scaling-stroke"
              className="transition-all duration-300 group-hover:stroke-[3px] group-hover:opacity-100 opacity-80"
            />
            {/* Hover dots (only visible on group hover could be tricky in pure SVG, simplified here) */}
          </g>
        ))}

        {/* X-Axis Labels (Show ~6 labels max) */}
        {buckets.map((label, i) => {
          const step = Math.ceil(buckets.length / 6);
          if (i % step !== 0 && i !== buckets.length - 1) return null;
          
          return (
            <text 
              key={i} 
              x={xScale(i)} 
              y={chartHeight - 5} 
              textAnchor="middle" 
              className="text-[10px] fill-gray-500"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend / Tooltip Hint */}
      <div className="absolute top-0 right-0 bg-neutral-900/80 p-2 rounded text-xs text-gray-400 border border-neutral-800">
        {series.map(s => (
          <div key={s.id} className="flex items-center gap-2 mb-1 last:mb-0">
            <div className="w-3 h-1 rounded-full" style={{ backgroundColor: s.color }} />
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
