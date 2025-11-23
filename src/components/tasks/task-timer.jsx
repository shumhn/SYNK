"use client";

import { useState, useEffect } from "react";

export default function TaskTimer({ taskId, projectId }) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [taskId]);

  useEffect(() => {
    let interval;
    if (active && startTime) {
      interval = setInterval(() => {
        const start = new Date(startTime).getTime();
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
    }
    return () => clearInterval(interval);
  }, [active, startTime]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/time-tracking?taskId=${taskId}`);
      const data = await res.json();
      if (!data.error && data.activeTask && data.activeTask.task === taskId) {
        setActive(true);
        setStartTime(data.activeTask.startTime);
      } else {
        setActive(false);
        setStartTime(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleTimer() {
    setLoading(true);
    try {
      const action = active ? "stop" : "start";
      const res = await fetch("/api/time-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, taskId, projectId }),
      });
      
      const data = await res.json();
      if (!data.error) {
        if (action === "start") {
          setActive(true);
          setStartTime(new Date());
        } else {
          setActive(false);
          setStartTime(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {active && (
        <span className="font-mono text-sm text-green-400 font-medium animate-pulse">
          {elapsed}
        </span>
      )}
      <button
        onClick={toggleTimer}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          active
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700"
        }`}
      >
        {active ? (
          <>
            <span className="w-2 h-2 rounded-sm bg-current" />
            Stop Timer
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Timer
          </>
        )}
      </button>
    </div>
  );
}
