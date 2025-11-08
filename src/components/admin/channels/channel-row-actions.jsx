"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChannelRowActions({ id, archived }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggleArchive() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: !archived }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Failed");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggleArchive}
        disabled={loading}
        className="text-sm underline"
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
