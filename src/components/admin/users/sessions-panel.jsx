"use client";

import { useEffect, useState } from "react";

function fmt(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default function SessionsPanel({ userId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastLoginAt, setLastLoginAt] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/sessions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.message || "Failed to load sessions");
        setSessions([]);
      } else {
        setSessions(data.data.activeSessions || []);
        setIsOnline(!!data.data.isOnline);
        setLastLoginAt(data.data.lastLoginAt || null);
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function revoke(sessionId) {
    const ok = confirm("Revoke this session?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${userId}/sessions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.message || "Failed to revoke session");
      } else {
        await load();
      }
    } catch (e) {
      alert("Unexpected error");
    }
  }

  if (loading) return <div className="text-sm text-gray-400">Loading sessions...</div>;
  if (error) return <div className="text-sm text-red-400">{String(error)}</div>;

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-300">Status: {isOnline ? <span className="text-green-400">Online</span> : <span className="text-gray-400">Offline</span>} · Last login: {fmt(lastLoginAt)}</div>
      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Session ID</th>
              <th className="text-left p-3">User Agent</th>
              <th className="text-left p-3">IP</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Last Seen</th>
              <th className="text-left p-3">Revoked</th>
              <th className="text-left p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.sessionId} className="border-t border-neutral-800">
                <td className="p-3 font-mono text-xs">{s.sessionId}</td>
                <td className="p-3 text-gray-300 max-w-xs truncate" title={s.userAgent || ''}>{s.userAgent || '-'}</td>
                <td className="p-3 text-gray-300">{s.ip || '-'}</td>
                <td className="p-3">{fmt(s.createdAt)}</td>
                <td className="p-3">{fmt(s.lastSeenAt)}</td>
                <td className="p-3">{s.revokedAt ? fmt(s.revokedAt) : '-'}</td>
                <td className="p-3">
                  {!s.revokedAt ? (
                    <button className="text-red-400 underline" onClick={() => revoke(s.sessionId)}>Revoke</button>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={7}>No sessions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
