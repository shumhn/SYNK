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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-white mb-2">Integrations</h1>
        <p className="text-sm text-neutral-400">Configure outgoing webhooks for Slack and Discord.</p>
      </div>

      <form onSubmit={onSave} className="space-y-6 max-w-2xl">
        <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-200 mb-3">Slack Incoming Webhook URL</label>
          <input
            value={form.slackWebhookUrl}
            onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-4 py-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
          />
          <p className="text-xs text-neutral-500 mt-2">Create at Slack → Apps → Incoming Webhooks → Add New Webhook to Workspace.</p>
        </div>

        <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-200 mb-3">Discord Webhook URL</label>
          <input
            value={form.discordWebhookUrl}
            onChange={(e) => setForm({ ...form, discordWebhookUrl: e.target.value })}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full px-4 py-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
          />
          <p className="text-xs text-neutral-500 mt-2">Create at Discord → Server Settings → Integrations → Webhooks → New Webhook.</p>
        </div>

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-3 rounded-lg bg-white text-[#151515] font-semibold hover:bg-neutral-100 transition disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
          {saved && <span className="text-green-400 text-sm font-medium">Saved successfully!</span>}
        </div>
      </form>
    </div>
  );
}
