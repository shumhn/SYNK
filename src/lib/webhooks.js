import IntegrationSettings from "@/models/IntegrationSettings";
import connectToDatabase from "@/lib/db/mongodb";

async function getSettings() {
  await connectToDatabase();
  // single settings doc
  let doc = await IntegrationSettings.findOne();
  if (!doc) doc = await IntegrationSettings.create({});
  return doc;
}

export async function sendSlackWebhook(message) {
  const settings = await getSettings();
  if (!settings.slackWebhookUrl) return;
  await fetch(settings.slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  }).catch(() => {});
}

export async function sendDiscordWebhook(message) {
  const settings = await getSettings();
  if (!settings.discordWebhookUrl) return;
  await fetch(settings.discordWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  }).catch(() => {});
}

export async function broadcastWebhooks(message) {
  // fire-and-forget
  await Promise.allSettled([
    sendSlackWebhook(message),
    sendDiscordWebhook(message),
  ]);
}
