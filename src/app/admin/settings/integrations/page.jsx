"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarSettings from "@/components/settings/calendar-settings";

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({ 
    slackWebhookUrl: "", 
    discordWebhookUrl: "",
    telegramBotToken: "",
    telegramChatId: ""
  });
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
            telegramBotToken: data.data.telegramBotToken || "",
            telegramChatId: data.data.telegramChatId || "",
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
        <p className="text-sm text-neutral-400">Configure outgoing webhooks for Slack, Discord, and Telegram.</p>
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

        <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-200 mb-3">Telegram Bot Token</label>
          <input
            value={form.telegramBotToken}
            onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })}
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            className="w-full px-4 py-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
          />
          <p className="text-xs text-neutral-500 mt-2">Create a bot via @BotFather on Telegram and copy the token.</p>
        </div>

        <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
          <label className="block text-sm font-medium text-neutral-200 mb-3">Telegram Chat ID</label>
          <input
            value={form.telegramChatId}
            onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
            placeholder="-1001234567890"
            className="w-full px-4 py-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition"
          />
          <p className="text-xs text-neutral-500 mt-2">Get your chat ID by messaging @userinfobot on Telegram.</p>
        </div>

        {/* Email Configuration Info */}
        <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <h3 className="font-semibold text-blue-400 mb-2">📧 Email Automation (SendGrid)</h3>
          <p className="text-sm text-gray-300 mb-3">
            Email integration is configured via environment variables. SendGrid is ready and will send:
          </p>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Welcome emails for new users</li>
            <li>Password reset emails</li>
            <li>Task assignment notifications</li>
            <li>Project invitation emails</li>
          </ul>
          <div className="mt-4">
            <TestEmailButton />
          </div>
        </div>

        {/* Calendar Sync */}
        <CalendarSettings />

        <div className="flex items-center gap-3">
          <button disabled={saving} className="px-6 py-3 rounded-lg bg-white text-[#151515] font-semibold hover:bg-neutral-100 transition disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
          {saved && <span className="text-green-400 text-sm font-medium">Saved successfully!</span>}
        </div>
      </form>
    </div>
  );
}

function TestEmailButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState("");

  async function testEmail() {
    if (!email) {
      alert("Please enter an email address");
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch("/api/integrations/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email })
      });
      const data = await res.json();
      
      if (data.error) {
        setResult({ success: false, message: data.message });
      } else {
        setResult({ success: true, message: data.message });
      }
    } catch (e) {
      setResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email to test"
          className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <button
          onClick={testEmail}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
        >
          {testing ? "Sending..." : "Test Email"}
        </button>
      </div>
      {result && (
        <div className={`p-3 rounded-lg text-sm ${
          result.success 
            ? "bg-green-500/10 border border-green-500/30 text-green-400" 
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}

