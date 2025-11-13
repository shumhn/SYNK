"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

export default function HRScorecards({ scope = "company", refId = null }) {
  const [range, setRange] = useState("90d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [wOnTime, setWOnTime] = useState(30);
  const [wThroughput, setWThroughput] = useState(20);
  const [wCompletion, setWCompletion] = useState(50);
  const [wPenalty, setWPenalty] = useState(0);
  const sseTimer = useRef(null);
  const [startingId, setStartingId] = useState(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    let fromDate = new Date(now);
    if (range === "30d") fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (range === "60d") fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (range === "90d") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    if (range === "180d") fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    return {
      from: fromDate.toISOString().split("T")[0],
      to: now.toISOString().split("T")[0],
    };
  }, [range]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("wOnTime", String(wOnTime));
      params.set("wThroughput", String(wThroughput));
      params.set("wCompletion", String(wCompletion));
      params.set("wPenalty", String(wPenalty));
      if (scope === "department" && refId) params.set("department", refId);
      const res = await fetch(`/api/analytics/hr/scorecards/employees?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load scorecards");
      setItems(json.data?.items || []);
      setSummary(json.data?.summary || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [scope, refId, from, to, wOnTime, wThroughput, wCompletion, wPenalty]);

  useEffect(() => {
    const es = new EventSource("/api/events/subscribe");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && (data.type === "task-created" || data.type === "task-updated" || data.type === "task-deleted")) {
          if (sseTimer.current) clearTimeout(sseTimer.current);
          sseTimer.current = setTimeout(() => { load(); }, 300);
        }
      } catch {}
    };
    return () => {
      es.close();
      if (sseTimer.current) clearTimeout(sseTimer.current);
    };
  }, []);

  function resetWeights() {
    setWOnTime(30); setWThroughput(20); setWCompletion(50); setWPenalty(0);
  }

  async function startAppraisal(userId) {
    try {
      setStartingId(userId);
      let res = await fetch(`/api/hr/appraisals/cycles?status=open&limit=1&sort=-periodEnd`, { cache: "no-store" });
      let json = await res.json();
      let cycle = (json.data || [])[0] || null;
      if (!cycle) {
        res = await fetch(`/api/hr/appraisals/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        json = await res.json();
        if (!res.ok || json.error) throw new Error(json.message || "Failed to create cycle");
        cycle = json.data;
      }

      const createRes = await fetch(`/api/hr/appraisals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId: cycle._id, employeeId: userId })
      });
      const createJson = await createRes.json();
      if (!createRes.ok || createJson.error) throw new Error(createJson.message || "Failed to create appraisal");
    } catch (e) {
      console.error(e);
    } finally {
      setStartingId(null);
    }
  }

  function exportCsv() {
    if (!items || items.length === 0) return;
    const headers = [
      "username","email","department","score","onTimeRate","throughput","completionRate","pending","overdueRate"
    ];
    const rows = items.map(r => [
      safe(r.username), safe(r.email), safe(r.department), r.score,
      r.metrics?.onTimeRate ?? "", (r.metrics?.throughput ?? 0).toFixed(2), r.metrics?.completionRate ?? "",
      r.metrics?.pending ?? "", r.metrics?.overdueRate ?? ""
    ]);
    const csv = [headers.join(","), ...rows.map(cols => cols.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hr-scorecards-${scope}${refId ? '-' + refId : ''}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function safe(v) {
    if (v == null) return "";
    const s = String(v).replaceAll('"', '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }

  return (
    <div className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">HR Scorecards</h3>
          <p className="text-sm text-gray-400">Auto-calculated performance index per employee</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="px-3 py-1.5 bg-neutral-900/80 border border-neutral-800 rounded-lg text-sm font-medium text-white"
          >
            <option value="30d">Last 30 days</option>
            <option value="60d">Last 60 days</option>
            <option value="90d">Last 90 days</option>
            <option value="180d">Last 180 days</option>
          </select>
          <button onClick={() => setWeightsOpen(v => !v)} className="px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-sm border border-neutral-700">Weights</button>
          <button onClick={exportCsv} disabled={loading || items.length === 0} className="px-3 py-1.5 bg-neutral-100 text-black rounded-lg text-sm font-medium disabled:opacity-50">Export CSV</button>
          <button onClick={load} disabled={loading} className="px-4 py-1.5 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">Refresh</button>
        </div>
      </div>

      {weightsOpen && (
        <div className="px-6 pt-3 pb-2 border-b border-neutral-800/50 bg-neutral-950/40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <WeightInput label="On-time" value={wOnTime} setValue={setWOnTime} color="text-blue-400" />
            <WeightInput label="Throughput" value={wThroughput} setValue={setWThroughput} color="text-emerald-400" />
            <WeightInput label="Completion" value={wCompletion} setValue={setWCompletion} color="text-purple-400" />
            <WeightInput label="Penalty" value={wPenalty} setValue={setWPenalty} color="text-red-400" />
          </div>
          <div className="flex justify-end mt-2">
            <button onClick={resetWeights} className="px-3 py-1 text-xs border border-neutral-700 rounded text-gray-300">Reset to defaults</button>
          </div>
        </div>
      )}

      {loading && (
        <div className="px-6 py-10 text-sm text-gray-400">Loading scorecards...</div>
      )}
      {error && !loading && (
        <div className="px-6 py-4 text-sm text-red-400">{error}</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="px-6 py-10 text-sm text-gray-400">No employees found in this range.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="px-6 py-6 space-y-4">
          {summary && (
            <div className="grid grid-cols-3 gap-4 pb-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{summary.count}</div>
                <div className="text-xs text-gray-400">Employees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{summary.avgScore}</div>
                <div className="text-xs text-gray-400">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{summary.topPerformer || "-"}</div>
                <div className="text-xs text-gray-400">Top Performer</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {items.map((row, idx) => (
              <div key={row.userId} className="p-4 rounded-xl border border-neutral-800/60 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-white font-semibold">
                      {row.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        <Link href={`/admin/users/${row.userId}`} className="underline decoration-dotted hover:decoration-solid">
                          {row.username}
                        </Link>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">🏆 Top</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {row.email} • {row.department || "No department"}
                        <Link href={`/admin/users/${row.userId}`} className="ml-2 text-blue-400 hover:text-blue-300">View</Link>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[120px] text-right">
                    <div className={`text-3xl font-bold ${row.score >= 80 ? "text-emerald-400" : row.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{row.score}</div>
                    <div className="text-[10px] text-gray-400">Performance Index</div>
                    <div className="mt-2">
                      <button
                        onClick={() => startAppraisal(row.userId)}
                        disabled={startingId === row.userId}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/60 text-white rounded-lg text-xs font-medium"
                      >
                        {startingId === row.userId ? "Starting..." : "Start Appraisal"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <Metric label="On-time" value={`${row.metrics.onTimeRate}%`} barColor="bg-blue-500" percent={row.metrics.onTimeRate} />
                  <Metric label="Throughput" value={`${(row.metrics.throughput || 0).toFixed(1)}/wk`} barColor="bg-emerald-500" percent={normalize(row.metrics.throughput)} />
                  <Metric label="Completion" value={`${row.metrics.completionRate}%`} barColor="bg-purple-500" percent={row.metrics.completionRate} />
                  <Metric label="Pending" value={row.metrics.pending} barColor="bg-orange-500" percent={capScale(row.metrics.pending)} />
                  <Metric label="Overdue" value={row.metrics.overdueRate + "%"} barColor="bg-red-500" percent={row.metrics.overdueRate} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, barColor, percent }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="text-white/80 font-medium">{value}</span>
      </div>
      <div className="w-full bg-neutral-800 rounded-full h-2 mt-1">
        <div className={`${barColor} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function normalize(v) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  const capped = Math.min(10, v);
  return (capped / 10) * 100;
}

function capScale(v) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  const capped = Math.min(20, v);
  return (capped / 20) * 100;
}
