"use client";

import { useEffect, useMemo, useState } from "react";

function b64UrlToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(null);
  const [pushState, setPushState] = useState({
    supported: true,
    permission: "default",
    subscribed: false,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const channelKeys = useMemo(() => ["email", "push", "inApp"], []);

  useEffect(() => {
    setError("");
    setMessage("");
    (async () => {
      try {
        const res = await fetch("/api/notifications/preferences");
        const data = await res.json();
        if (!res.ok || data.error)
          throw new Error(data.message || "Failed to load preferences");
        setPrefs(data.data);
      } catch (e) {
        setError(e.message || "Failed to load preferences");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator;
    const permission = supported ? Notification.permission : "denied";
    setPushState((s) => ({ ...s, supported, permission }));
    if (!supported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPushState((s) => ({ ...s, subscribed: !!sub }));
      } catch {}
    })();
  }, []);

  const toggleChannelEnabled = (channel) => {
    setPrefs((p) => ({
      ...p,
      [channel]: { ...p[channel], enabled: !p[channel]?.enabled },
    }));
  };

  const toggleType = (channel, type) => {
    setPrefs((p) => ({
      ...p,
      [channel]: {
        ...p[channel],
        types: { ...p[channel]?.types, [type]: !p[channel]?.types?.[type] },
      },
    }));
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: prefs.email,
          push: prefs.push,
          inApp: prefs.inApp,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.message || "Failed to save preferences");
      setPrefs(data.data);
      setMessage("Preferences saved");
    } catch (e) {
      setError(e.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const subscribePush = async () => {
    setError("");
    setMessage("");
    try {
      if (!pushState.supported)
        throw new Error("Push not supported by this browser");
      if (Notification.permission === "denied")
        throw new Error("Browser notifications are blocked");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      setPushState((s) => ({ ...s, permission: perm }));
      if (perm !== "granted") throw new Error("Permission was not granted");

      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyData = await keyRes.json();
      if (!keyRes.ok || keyData.error)
        throw new Error(keyData.message || "Failed to load VAPID key");
      const appServerKey = b64UrlToUint8Array(keyData.data.publicKey);

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
      const body = { endpoint: sub.endpoint, keys: sub.toJSON().keys };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error)
        throw new Error(data.message || "Subscription failed");
      setPushState((s) => ({ ...s, subscribed: true }));
      setMessage("Browser notifications enabled");
    } catch (e) {
      setError(e.message || "Failed to enable push");
    }
  };

  const unsubscribePush = async () => {
    setError("");
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushState((s) => ({ ...s, subscribed: false }));
      setMessage("Browser notifications disabled");
    } catch (e) {
      setError(e.message || "Failed to disable push");
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!prefs)
    return (
      <div className="p-6 text-red-500">
        {error || "Unable to load preferences"}
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notification Settings</h1>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <section className="rounded border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Browser Notifications</div>
            <div className="text-sm text-gray-500">
              Enable push notifications for critical events
            </div>
          </div>
          {pushState.subscribed ? (
            <button
              onClick={unsubscribePush}
              className="px-3 py-1.5 rounded bg-gray-200"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={subscribePush}
              className="px-3 py-1.5 rounded bg-blue-600 text-white"
            >
              Enable
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Status: {pushState.supported ? pushState.permission : "unsupported"}
        </div>
      </section>

      {channelKeys.map((channel) => (
        <section key={channel} className="rounded border p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium capitalize">
              {channel} notifications
            </div>
            <button
              onClick={() => toggleChannelEnabled(channel)}
              className={`px-3 py-1.5 rounded ${
                prefs[channel]?.enabled
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {prefs[channel]?.enabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.keys(prefs[channel]?.types || {}).map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={!!prefs[channel]?.types?.[type]}
                  onChange={() => toggleType(channel, type)}
                />
                <span className="capitalize">{type.replaceAll("_", " ")}</span>
              </label>
            ))}
          </div>
        </section>
      ))}

      {(error || message) && (
        <div
          className={`p-3 rounded ${
            error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </div>
      )}
    </div>
  );
}
