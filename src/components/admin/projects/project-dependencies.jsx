"use client";

import { useEffect, useState } from "react";

export default function ProjectDependencies({ projectId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [critical, setCritical] = useState(null);
  const [blockedCount, setBlockedCount] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/critical-path`),
        fetch(`/api/projects/${projectId}/tasks`),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      if (!cData.error) setCritical(cData.data);
      if (!tData.error) {
        const tasks = tData.data || [];
        const blocked = tasks.filter((t)=> t.status === "blocked").length;
        setBlockedCount(blocked);
      }
    } catch (e) {
      setError("Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dependencies</h3>
        <button onClick={load} className="text-xs underline">Refresh</button>
      </div>
      {loading && <div className="text-sm text-gray-400">Loading...</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="p-4 rounded border border-neutral-800">
        <div className="text-sm text-gray-400">Blocked tasks</div>
        <div className="text-2xl font-semibold">{blockedCount}</div>
      </div>

      <div className="p-4 rounded border border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Critical Path</h4>
          {critical?.hasCycle && <span className="text-xs text-red-400">Cycle detected</span>}
        </div>
        {!critical && !loading && (
          <div className="text-sm text-gray-400">No data</div>
        )}
        {critical && !critical.hasCycle && (
          <div className="space-y-3">
            <div className="text-sm text-gray-400">Total Estimated Hours: {critical.totalHours}</div>
            <ol className="list-decimal ml-5 space-y-2">
              {critical.path.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="text-sm">{p.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-800">{p.estimatedHours}h</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-neutral-800">{p.status}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
