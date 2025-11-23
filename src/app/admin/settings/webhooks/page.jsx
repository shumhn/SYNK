"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      const data = await res.json();
      if (!data.error) setWebhooks(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function deleteWebhook(id) {
    if (!confirm("Delete this webhook?")) return;

    try {
      const res = await fetch(`/api/webhooks?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.error) {
        await fetchWebhooks();
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert("Failed to delete webhook");
    }
  }

  function openEditForm(webhook) {
    setEditingWebhook(webhook);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingWebhook(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">Webhooks</h1>
          <p className="text-sm text-neutral-400">
            Connect with Zapier, n8n, or any webhook service
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 rounded-lg bg-white text-[#151515] font-semibold hover:bg-neutral-100 transition"
        >
          + Add Webhook
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl">
          <div className="text-4xl mb-3">🔗</div>
          <p className="text-gray-400 mb-4">No webhooks configured</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
          >
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook._id}
              webhook={webhook}
              onEdit={() => openEditForm(webhook)}
              onDelete={() => deleteWebhook(webhook._id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <WebhookForm
          webhook={editingWebhook}
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            fetchWebhooks();
          }}
        />
      )}

      {/* Zapier Guide */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30">
        <h3 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
          <span className="text-2xl">⚡</span> How to use with Zapier
        </h3>
        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
          <li>Go to Zapier and create a new Zap</li>
          <li>Choose "Webhooks by Zapier" as the trigger</li>
          <li>Select "Catch Hook" and copy the webhook URL</li>
          <li>Paste it here and select which events to trigger</li>
          <li>Test the webhook, then finish your Zap in Zapier!</li>
        </ol>
      </div>
    </div>
  );
}

function WebhookCard({ webhook, onEdit, onDelete }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function testWebhook() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhook.url, secret: webhook.secret })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: true, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 rounded-xl bg-neutral-900/50 border border-neutral-800/50">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-white">{webhook.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs ${
              webhook.active 
                ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}>
              {webhook.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-gray-400 font-mono break-all">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-sm transition"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {webhook.events.map((event) => (
          <span
            key={event}
            className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30"
          >
            {event}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        <button
          onClick={testWebhook}
          disabled={testing}
          className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200 disabled:opacity-50 text-sm transition"
        >
          {testing ? "Testing..." : "Test Webhook"}
        </button>

        {testResult && (
          <div className={`p-3 rounded text-sm ${
            testResult.error
              ? "bg-red-500/10 border border-red-500/30 text-red-400"
              : "bg-green-500/10 border border-green-500/30 text-green-400"
          }`}>
            {testResult.message}
          </div>
        )}
      </div>

      {webhook.lastTriggered && (
        <p className="text-xs text-gray-500 mt-4">
          Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function WebhookForm({ webhook, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: webhook?.name || "",
    url: webhook?.url || "",
    events: webhook?.events || [],
    secret: webhook?.secret || "",
    active: webhook?.active ?? true
  });
  const [saving, setSaving] = useState(false);

  const availableEvents = [
    "task.created",
    "task.updated",
    "task.completed",
    "task.deleted",
    "project.created",
    "project.updated",
    "project.completed",
    "project.deleted",
    "user.created",
    "user.updated",
    "report.generated"
  ];

  function toggleEvent(event) {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!form.name || !form.url || form.events.length === 0) {
      alert("Name, URL, and at least one event are required");
      return;
    }

    setSaving(true);

    try {
      const method = webhook ? "PUT" : "POST";
      const body = webhook ? { ...form, id: webhook._id } : form;

      const res = await fetch("/api/webhooks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.error) {
        alert(data.message);
      } else {
        onSuccess();
      }
    } catch (e) {
      alert("Failed to save webhook");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">
            {webhook ? "Edit Webhook" : "Add Webhook"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="My Zapier Webhook"
              className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">Webhook URL</label>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-3">Events</label>
            <div className="grid grid-cols-2 gap-2">
              {availableEvents.map((event) => (
                <label
                  key={event}
                  className="flex items-center gap-2 p-3 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={form.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded"
                  />
                  <span className="text-sm text-neutral-200">{event}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-200 mb-2">
              Secret (Optional)
            </label>
            <input
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder="For HMAC signature verification"
              className="w-full px-4 py-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-neutral-200">Active</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-white text-[#151515] font-semibold hover:bg-neutral-100 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Webhook"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
