"use client";

import { useEffect, useMemo, useState } from "react";

export default function EmployeeRankings({ scope = "company", refId = null }) {
  const [range, setRange] = useState("90d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [top, setTop] = useState([]);
  const [low, setLow] = useState([]);
  const [summary, setSummary] = useState(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [wOnTime, setWOnTime] = useState(45);
  const [wThroughput, setWThroughput] = useState(40);
  const [wCompletion, setWCompletion] = useState(15);
  const [wPenalty, setWPenalty] = useState(30);

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
      params.set("top", "10");
      params.set("low", "10");
      params.set("wOnTime", String(wOnTime));
      params.set("wThroughput", String(wThroughput));
      params.set("wCompletion", String(wCompletion));
      params.set("wPenalty", String(wPenalty));
      if (scope === "department" && refId) params.set("department", refId);
      const res = await fetch(`/api/analytics/hr/scorecards/rankings?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to load rankings");
      setTop(json.data?.top || []);
      setLow(json.data?.low || []);
      setSummary(json.data?.summary || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [scope, refId, from, to, wOnTime, wThroughput, wCompletion, wPenalty]);

  function resetWeights() {
    setWOnTime(45); setWThroughput(40); setWCompletion(15); setWPenalty(30);
  }

  function exportCsv() {
    const headers = [
      "rankType","rank","username","email","department","score","onTimeRate","throughput","completionRate","overdueRate"
    ];
    const rows = [
      ...top.map((u, i) => ["top", i + 1, safe(u.username), safe(u.email), safe(u.department), u.score, u.onTimeRate, (u.throughput||0).toFixed(2), u.completionRate, u.overdueRate]),
      ...low.map((u, i) => ["low", i + 1, safe(u.username), safe(u.email), safe(u.department), u.score, u.onTimeRate, (u.throughput||0).toFixed(2), u.completionRate, u.overdueRate])
    ];
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-rankings-${scope}${refId ? '-' + refId : ''}-${from}-to-${to}.csv`;
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
          <h3 className="text-lg font-semibold text-white">Employee Rankings</h3>
          <p className="text-sm text-gray-400">Top 10 performers and Low 10 performers</p>
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
          <button onClick={exportCsv} disabled={loading || (top.length===0 && low.length===0)} className="px-3 py-1.5 bg-neutral-100 text-black rounded-lg text-sm font-medium disabled:opacity-50">Export CSV</button>
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
        <div className="px-6 py-10 text-sm text-gray-400">Loading rankings...</div>
      )}
      {error && !loading && (
        <div className="px-6 py-4 text-sm text-red-400">{error}</div>
      )}
      {!loading && !error && top.length === 0 && low.length === 0 && (
        <div className="px-6 py-10 text-sm text-gray-400">No employees found in this range.</div>
      )}

      {!loading && !error && (top.length > 0 || low.length > 0) && (
        <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top performers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-2xl">🏅</span> Top 10 Performers
              </div>
              {summary?.topCutoff != null && (
                <div className="text-xs text-gray-400">Cutoff: {summary.topCutoff}</div>
              )}
            </div>
            <div className="space-y-2">
              {top.map((u, i) => (
                <RankRow key={u.userId} user={u} index={i} highlight="top" />
              ))}
            </div>
          </div>

          {/* Low performers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold flex items-center gap-2">
                <span className="text-2xl">📉</span> Low 10 Performers
              </div>
              {summary?.lowCutoff != null && (
                <div className="text-xs text-gray-400">Cutoff: {summary.lowCutoff}</div>
              )}
            </div>
            <div className="space-y-2">
              {low.map((u, i) => (
                <RankRow key={u.userId} user={u} index={i} highlight="low" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RankRow({ user, index, highlight }) {
  return (
    <div className="p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ${highlight === 'top' ? 'bg-emerald-600/30 border border-emerald-500/40' : 'bg-red-600/20 border border-red-500/30'}`}>{index + 1}</div>
          <div>
            <div className="text-white font-medium flex items-center gap-2">
              {user.username}
              {highlight === 'top' && index === 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded-full border border-yellow-500/30">🏆</span>
              )}
            </div>
            <div className="text-[11px] text-gray-400">{user.email} • {user.department || 'No department'}</div>
          </div>
        </div>
        <div className="min-w-[80px] text-right">
          <div className={`text-2xl font-bold bg-clip-text text-transparent ${highlight === 'top' ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-orange-400'}`}>{user.score}</div>
          <div className="text-[10px] text-gray-400">Score</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
        <MiniMetric label="On-time" value={`${user.onTimeRate}%`} />
        <MiniMetric label="Throughput" value={`${(user.throughput || 0).toFixed(1)}/wk`} />
        <MiniMetric label="Completion" value={`${user.completionRate}%`} />
        <MiniMetric label="Overdue" value={`${user.overdueRate}%`} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-gray-400">
      <span>{label}</span>
      <span className="text-white/80 font-medium">{value}</span>
    </div>
  );
}
