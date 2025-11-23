"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/activity?limit=${limit}`);
      const json = await res.json();
      if (res.ok && !json.error) {
        setLogs(json.data || []);
      } else {
        setError(json.message || "Failed to load audit logs");
      }
    } catch (e) {
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  function getActionColor(action) {
    if (action.includes("delete") || action.includes("fail") || action.includes("revok")) return "text-red-400";
    if (action.includes("create") || action.includes("assign") || action.includes("grant")) return "text-green-400";
    if (action.includes("update") || action.includes("edit")) return "text-blue-400";
    return "text-gray-300";
  }

  function getStatusColor(status) {
    return status === "success" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🛡️ Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-1">Track system activity and security events</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="25">Last 25</option>
            <option value="50">Last 50</option>
            <option value="100">Last 100</option>
          </select>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-gray-400 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Resource</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                      {format(new Date(log.ts), "MMM d, yyyy HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-gray-300">
                            {log.user.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="text-white">{log.user.username}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">System / Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {log.resource ? (
                        <span className="flex items-center gap-1">
                          <span className="text-gray-500 text-xs uppercase">{log.resource}:</span>
                          <span className="font-mono text-xs">{log.resourceId?.substring(0, 8)}...</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                      {log.ip || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
