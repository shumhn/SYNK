"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ slackWebhookUrl: "", discordWebhookUrl: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/integrations/webhooks");
        const data = await res.json();
        if (!data.error && data.data) {
          setForm({
            slackWebhookUrl: data.data.slackWebhookUrl || "",
            discordWebhookUrl: data.data.discordWebhookUrl || "",
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/integrations/webhooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.error) setSaved(true);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-gray-400 mt-1">Configure outgoing webhooks for Slack and Discord.</p>
      </div>

      <form onSubmit={onSave} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Slack Incoming Webhook URL</label>
          <input
            value={form.slackWebhookUrl}
            onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          />
          <p className="text-xs text-gray-500 mt-1">Create at Slack → Apps → Incoming Webhooks → Add New Webhook to Workspace.</p>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Discord Webhook URL</label>
          <input
            value={form.discordWebhookUrl}
            onChange={(e) => setForm({ ...form, discordWebhookUrl: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          />
          <p className="text-xs text-gray-500 mt-1">Create at Discord → Server Settings → Integrations → Webhooks → New Webhook.</p>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-4 py-2 bg-white text-black rounded">{saving ? "Saving..." : "Save"}</button>
          {saved && <span className="text-green-400 text-sm">Saved!</span>}
        </div>
      </form>
    </div>
  );
}
