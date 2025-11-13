"use client";

import { useEffect, useRef, useState } from "react";

export default function AppraisalsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCycle, setOpenCycle] = useState(null);
  const [reviews, setReviews] = useState([]);
  const sseTimer = useRef(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/events/subscribe");
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && (data.type === "appraisal-created" || data.type === "appraisal-updated" || data.type === "appraisal-cycle-created" || data.type === "appraisal-cycle-updated")) {
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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const cycleRes = await fetch("/api/hr/appraisals/cycles?status=open&limit=1&sort=-periodEnd", { cache: "no-store" });
      const cycleJson = await cycleRes.json();
      if (!cycleRes.ok || cycleJson.error) throw new Error(cycleJson.message || "Failed to load appraisal cycles");
      const cycle = (cycleJson.data || [])[0] || null;
      setOpenCycle(cycle);

      if (cycle) {
        const reviewsRes = await fetch(`/api/hr/appraisals?cycle=${cycle._id}`);
        const reviewsJson = await reviewsRes.json();
        if (!reviewsRes.ok || reviewsJson.error) throw new Error(reviewsJson.message || "Failed to load reviews");
        setReviews(reviewsJson.data || []);
      } else {
        setReviews([]);
      }
    } catch (e) {
      setError(e.message || "Failed to load appraisals");
    } finally {
      setLoading(false);
    }
  }

  async function createDefaultCycle() {
    try {
      const res = await fetch("/api/hr/appraisals/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.message || "Failed to create cycle");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const submitted = reviews.filter(r => r.status === "submitted" || r.status === "approved").length;
  const total = reviews.length || 0;
  const progress = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div id="appraisals" className="bg-gradient-to-br from-neutral-900/50 to-neutral-950/30 backdrop-blur-xl border border-neutral-800/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-800/50 bg-neutral-900/30 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><span className="text-2xl">📝</span> Appraisals</h3>
          <p className="text-sm text-gray-400">Cycles, progress, and review status</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="px-3 py-1.5 bg-white text-black rounded-lg text-sm font-medium disabled:opacity-50">Refresh</button>
          {!openCycle && (
            <button onClick={createDefaultCycle} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Create Cycle</button>
          )}
        </div>
      </div>

      {loading && <div className="px-6 py-10 text-sm text-gray-400">Loading appraisals...</div>}
      {error && !loading && <div className="px-6 py-4 text-sm text-red-400">{error}</div>}

      {!loading && !error && (
        <div className="px-6 py-6 space-y-4">
          {openCycle ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{openCycle.name}</div>
                  <div className="text-xs text-gray-400">{new Date(openCycle.periodStart).toLocaleDateString()} - {new Date(openCycle.periodEnd).toLocaleDateString()}</div>
                </div>
                <div className="text-xs px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">{openCycle.status}</div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Submission Progress</span>
                  <span>{submitted} / {total} submitted</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {total > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Total Reviews" value={total} />
                  <Stat label="Submitted" value={submitted} />
                  <Stat label="Pending" value={total - submitted} />
                  <Stat label="Avg Score" value={avgOverall(reviews)} />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400">No open appraisal cycle. Create one to begin.</div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40">
      <div className="text-gray-400 text-xs">{label}</div>
      <div className="text-white text-xl font-semibold">{value}</div>
    </div>
  );
}

function avgOverall(reviews) {
  const list = reviews.filter(r => typeof r.overall === "number" && !Number.isNaN(r.overall));
  if (list.length === 0) return "-";
  const avg = list.reduce((s, r) => s + r.overall, 0) / list.length;
  return Math.round(avg * 10) / 10;
}
