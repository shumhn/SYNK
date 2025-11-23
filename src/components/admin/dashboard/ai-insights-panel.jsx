"use client";

import { useState } from "react";

export default function AIInsightsPanel({ scope = "company", refId = null }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function runAnalysis() {
    setAnalyzing(true);
    setError(null);
    setData(null);

    try {
      // 1. Detect Anomalies
      const anomalyRes = await fetch("/api/analytics/ai/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, refId, days: 30 })
      });
      const anomalyJson = await anomalyRes.json();
      
      if (anomalyJson.error) throw new Error(anomalyJson.message);
      
      const { anomalies, stats } = anomalyJson.data;

      // 2. Get Recommendations (only if anomalies exist)
      let recommendations = [];
      if (anomalies.length > 0) {
        const optRes = await fetch("/api/analytics/ai/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anomalies, stats, scope })
        });
        const optJson = await optRes.json();
        if (!optJson.error) {
          recommendations = optJson.data.recommendations;
        }
      } else {
        recommendations = ["Operations are stable. No immediate actions required."];
      }

      setData({ anomalies, stats, recommendations });

    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="bg-gradient-to-r from-slate-900/40 to-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden relative backdrop-blur-sm">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-2xl">✨</span>
              AI Insights & Optimization
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Machine learning-based pattern recognition for task flow optimization
            </p>
          </div>
          
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Analyzing...
              </>
            ) : (
              <>
                <span>⚡</span> Analyze Now
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {!data && !analyzing && !error && (
          <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-700/50 rounded-xl bg-slate-900/20">
            <div className="text-4xl mb-2">🧠</div>
            <p>Click "Analyze Now" to detect anomalies and generate recommendations</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anomalies Column */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                Detected Anomalies ({data.anomalies.length})
              </h4>
              
              {data.anomalies.length === 0 ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm flex items-center gap-3">
                  <span>✅</span> No significant anomalies detected in the last 30 days.
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {data.anomalies.map((anomaly, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded-xl border ${
                        anomaly.severity === "high" 
                          ? "bg-red-500/10 border-red-500/30" 
                          : "bg-yellow-500/10 border-yellow-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          anomaly.severity === "high" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"
                        }`}>
                          {anomaly.type === "spike" ? "📈 Spike" : "📉 Drop"}
                        </span>
                        <span className="text-xs text-gray-400">{anomaly.date}</span>
                      </div>
                      <div className="text-sm text-gray-200">
                        Value: <span className="font-mono font-bold">{anomaly.value}</span> (Expected: {anomaly.expected})
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Deviation: {anomaly.zScore}σ
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommendations Column */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
                AI Recommendations
              </h4>
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 mt-2 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Based on {data.stats.totalDays} days of data</span>
                  <span>Avg Output: {data.stats.mean}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
