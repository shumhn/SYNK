"use client";

import { useState, useEffect } from "react";

export default function DepartmentComparisonChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState("completionRate"); // completionRate, productivity, completedTasks

  useEffect(() => {
    fetchComparisonData();
  }, []);

  async function fetchComparisonData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analytics/hr/departments/comparison");
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.message || "Failed to load department comparison");
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
            <span className="font-medium">Loading department comparison...</span>
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

  if (!data || data.departments.length === 0) {
    return (
      <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-6">
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-3">🏢</div>
          <p>No departments found for comparison</p>
        </div>
      </div>
    );
  }

  const { departments, organizationAverage, summary } = data;
  const maxValue = Math.max(...departments.map(d => d[metric]));

  const metricConfig = {
    completionRate: {
      label: "Completion Rate",
      unit: "%",
      color: "from-green-500 to-emerald-500",
      icon: "📊"
    },
    productivity: {
      label: "Productivity",
      unit: " tasks/employee",
      color: "from-blue-500 to-cyan-500",
      icon: "⚡"
    },
    completedTasks: {
      label: "Completed Tasks",
      unit: " tasks",
      color: "from-purple-500 to-pink-500",
      icon: "✅"
    }
  };

  const currentMetric = metricConfig[metric];

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              Department Performance Comparison
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Comparing {departments.length} departments by {currentMetric.label.toLowerCase()}
            </p>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-1 bg-neutral-900/80 rounded-lg p-1 border border-neutral-800">
            <button
              onClick={() => setMetric("completionRate")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                metric === "completionRate"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              📊 Completion
            </button>
            <button
              onClick={() => setMetric("productivity")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                metric === "productivity"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ⚡ Productivity
            </button>
            <button
              onClick={() => setMetric("completedTasks")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                metric === "completedTasks"
                  ? "bg-white text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              ✅ Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-neutral-950/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{summary.totalDepartments}</div>
          <div className="text-xs text-gray-400 mt-1">Total Departments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{summary.topPerformer}</div>
          <div className="text-xs text-gray-400 mt-1">Top Performer</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {metric === "completionRate" ? `${summary.avgCompletionRate}%` :
             metric === "productivity" ? `${summary.avgProductivity}` :
             Math.round(departments.reduce((sum, d) => sum + d.completedTasks, 0) / departments.length)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Average {currentMetric.label}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">
            {organizationAverage[metric] || "N/A"}
            {metric === "completionRate" ? "%" : metric === "productivity" ? "" : ""}
          </div>
          <div className="text-xs text-gray-400 mt-1">Org Average</div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 py-6">
        <div className="space-y-4">
          {departments.map((dept, index) => {
            const value = dept[metric];
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
            const isTopPerformer = index === 0;

            return (
              <div key={dept.departmentId} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {dept.departmentName}
                    </span>
                    {isTopPerformer && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                        🏆 Top
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">{dept.totalEmployees} employees</span>
                    <span className={`font-bold bg-gradient-to-r ${currentMetric.color} bg-clip-text text-transparent`}>
                      {value}{currentMetric.unit}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${currentMetric.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {/* Org average line */}
                  {organizationAverage[metric] && maxValue > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/60 rounded"
                      style={{ 
                        left: `${(organizationAverage[metric] / maxValue) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                      title={`Org Average: ${organizationAverage[metric]}${metric === "completionRate" ? "%" : ""}`}
                    />
                  )}
                </div>

                {/* Additional metrics */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📁 {dept.activeProjects} projects</span>
                  <span>✅ {dept.completedTasks} completed</span>
                  <span>⏳ {dept.pendingTasks} pending</span>
                  <span>📊 {dept.completionRate}% completion</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 flex items-center justify-center gap-6 text-sm border-t border-neutral-800/50 pt-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded bg-gradient-to-r ${currentMetric.color}`}></div>
          <span className="text-gray-400">{currentMetric.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-white/60"></div>
          <span className="text-gray-400">Organization Average</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">🏆</span>
          <span className="text-gray-400">Top Performer</span>
        </div>
      </div>
    </div>
  );
}
