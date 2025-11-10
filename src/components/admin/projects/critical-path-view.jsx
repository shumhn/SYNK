"use client";

import { useState, useEffect } from "react";

export default function CriticalPathView({ projectId }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCriticalPath();
  }, [projectId]);

  async function loadCriticalPath() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/critical-path`);
      const json = await res.json();
      if (json.error) {
        setError(json.message || "Failed to load critical path");
      } else {
        setData(json.data);
      }
    } catch (e) {
      setError("Unexpected error loading critical path");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">
        Loading critical path...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-400 border border-red-800 rounded">
        {error}
      </div>
    );
  }

  if (data?.hasCycle) {
    return (
      <div className="p-8 text-center border border-yellow-800 bg-yellow-900/20 rounded">
        <div className="text-yellow-400 font-semibold mb-2">⚠️ Dependency Cycle Detected</div>
        <div className="text-sm text-gray-300">
          Cannot compute critical path because tasks have circular dependencies.
          <br />
          Check Dependencies tab on each task and remove cycles.
        </div>
      </div>
    );
  }

  if (!data || !data.path || data.path.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 border border-neutral-800 rounded">
        No critical path found. Add tasks with dependencies and estimated hours to compute.
      </div>
    );
  }

  const { path, totalHours } = data;
  const totalDays = (totalHours / 8).toFixed(1);
  const completedTasks = path.filter((t) => t.status === "completed").length;
  const progressPercent = path.length > 0 ? Math.round((completedTasks / path.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="p-4 rounded bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">🎯 Critical Path Analysis</h3>
          <button onClick={loadCriticalPath} className="text-xs px-2 py-1 rounded border border-neutral-700 hover:bg-neutral-900">
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Total Duration</div>
            <div className="text-2xl font-bold">{totalHours}h</div>
            <div className="text-xs text-gray-500">≈ {totalDays} days</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Critical Tasks</div>
            <div className="text-2xl font-bold">{path.length}</div>
            <div className="text-xs text-gray-500">{completedTasks} completed</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Path Progress</div>
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <div className="flex-1 bg-neutral-800 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          ℹ️ The critical path shows the longest sequence of dependent tasks. Delays on these tasks will delay the entire project.
        </div>
      </div>

      {/* Critical Path Visualization */}
      <div className="p-4 rounded border border-neutral-800">
        <h4 className="font-semibold mb-3">Task Sequence (Critical Path)</h4>
        <div className="space-y-3">
          {path.map((task, index) => (
            <div key={task.id} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900 text-purple-200 flex items-center justify-center text-sm font-semibold border-2 border-purple-700">
                {index + 1}
              </div>
              <div className="flex-1 p-3 rounded border-2 border-purple-700 bg-purple-900/20 hover:bg-purple-900/30 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{task.title}</span>
                  <div className="flex items-center gap-2">
                    {task.status === "completed" && <span className="text-green-500 text-sm">✓</span>}
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === "completed"
                        ? "bg-green-900 text-green-200"
                        : task.status === "in_progress"
                        ? "bg-blue-900 text-blue-200"
                        : task.status === "blocked"
                        ? "bg-red-900 text-red-200"
                        : "bg-neutral-800 text-gray-300"
                    }`}>
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  ⏱ Estimated: {task.estimatedHours}h
                </div>
              </div>
              {index < path.length - 1 && (
                <div className="flex-shrink-0 text-purple-600 text-xl">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Impact Warning */}
      {path.some((t) => t.status === "blocked") && (
        <div className="p-3 rounded bg-red-900/20 border border-red-800 text-sm">
          <span className="font-semibold text-red-400">⚠️ Critical Path Blocked</span>
          <div className="text-gray-300 mt-1">
            One or more tasks on the critical path are blocked. This will delay the entire project delivery.
          </div>
        </div>
      )}
    </div>
  );
}
