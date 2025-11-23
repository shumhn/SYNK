"use client";

import { useState, useEffect } from "react";

export default function CalendarSettings() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/calendar/connections");
      const data = await res.json();
      if (!data.error) setConnections(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function disconnectCalendar(provider) {
    if (!confirm(`Disconnect ${provider === "google" ? "Google Calendar" : "Outlook Calendar"}?`)) return;

    try {
      const res = await fetch(`/api/calendar/connections?provider=${provider}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.error) {
        await fetchConnections();
      }
    } catch (e) {
      alert("Failed to disconnect calendar");
    }
  }

  const googleConnection = connections.find(c => c.provider === "google");

  return (
    <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
      <h3 className="font-semibold text-white mb-4">📅 Calendar Sync</h3>
      <p className="text-sm text-gray-400 mb-6">
        Automatically sync tasks with due dates to your calendar
      </p>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Google Calendar */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-neutral-950">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📆</div>
              <div>
                <div className="font-medium text-white">Google Calendar</div>
                {googleConnection ? (
                  <div className="text-xs text-green-400">✓ Connected</div>
                ) : (
                  <div className="text-xs text-gray-500">Not connected</div>
                )}
              </div>
            </div>
            {googleConnection ? (
              <button
                onClick={() => disconnectCalendar("google")}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition"
              >
                Disconnect
              </button>
            ) : (
              <a
                href="/api/calendar/google/auth"
                className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200 text-sm transition"
              >
                Connect
              </a>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-200">
            <p className="font-semibold mb-2">How it works:</p>
            <ul className="space-y-1 text-xs text-blue-300">
              <li>• Tasks with due dates are automatically added to your calendar</li>
              <li>• Calendar events update when you change task details</li>
              <li>• Events are removed when tasks are completed or deleted</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
