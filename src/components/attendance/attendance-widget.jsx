"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceWidget() {
  const [status, setStatus] = useState(null); // { isClockedIn, startTime }
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00:00");
  const router = useRouter();

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (status?.isClockedIn && status?.startTime) {
      interval = setInterval(() => {
        const start = new Date(status.startTime).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsed(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      }, 1000);
    } else {
      setElapsed("00:00:00");
    }
    return () => clearInterval(interval);
  }, [status]);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/attendance/clock");
      const data = await res.json();
      if (!data.error) {
        setStatus(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleClock(action) {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!data.error) {
        await fetchStatus();
        router.refresh();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !status) return <div className="h-10 w-full bg-white/5 rounded animate-pulse" />;

  return (
    <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/50 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
          Attendance
        </span>
        {status?.isClockedIn && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
      </div>
      
      <div className="text-2xl font-mono font-bold text-white mb-3 text-center">
        {elapsed}
      </div>

      {status?.isClockedIn ? (
        <button
          onClick={() => handleClock("out")}
          disabled={loading}
          className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Clock Out
        </button>
      ) : (
        <button
          onClick={() => handleClock("in")}
          disabled={loading}
          className="w-full py-2 bg-green-500 hover:bg-green-600 text-black rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Clock In
        </button>
      )}
    </div>
  );
}
