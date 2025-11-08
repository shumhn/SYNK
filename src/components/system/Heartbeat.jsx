"use client";
import { useEffect } from "react";

export default function Heartbeat({ intervalMs = 30000 }) {
  useEffect(() => {
    let timer;
    async function ping() {
      try {
        await fetch("/api/auth/heartbeat", { method: "POST", cache: "no-store" });
      } catch {}
    }
    // initial ping and then interval
    ping();
    timer = setInterval(ping, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return null;
}
