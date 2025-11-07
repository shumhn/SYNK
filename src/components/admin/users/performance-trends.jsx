"use client";

import { useEffect, useState } from "react";

function Bar({ value, max, label, color = "bg-green-600" }) {
  const width = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="w-full bg-neutral-900 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function PerformanceTrends({ userId }) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/trends?weeks=12`);
      const data = await res.json();
      if (!data.error) setSeries(data.data.series || []);
    } catch (e) {
      // no-op
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  const maxCompleted = series.reduce((m, s) => Math.max(m, s.completed), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Performance Trends (12 weeks)</h3>
        <button onClick={load} className="text-xs underline">Refresh</button>
      </div>
      {loading && <div className="text-sm text-gray-400">Loading...</div>}
      {series.length === 0 && !loading && (
        <div className="text-sm text-gray-400">No data yet.</div>
      )}
      {series.length > 0 && (
        <div className="space-y-3">
          {series.map((w) => (
            <div key={w.week} className="p-2 rounded border border-neutral-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Bar value={w.completed} max={maxCompleted} label={`Week ${w.week}: Completed`} color="bg-blue-600" />
                <Bar value={w.onTimeRate} max={100} label={`On-time: ${w.onTimeRate}%`} color="bg-green-600" />
                <Bar value={w.velocity} max={maxCompleted} label={`Velocity`} color="bg-purple-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
