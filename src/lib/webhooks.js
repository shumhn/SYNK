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

export async function sendTelegramMessage(message) {
  const settings = await getSettings();
  if (!settings.telegramBotToken || !settings.telegramChatId) return;
  
  const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: settings.telegramChatId,
      text: message,
      parse_mode: "HTML"
    }),
  }).catch(() => {});
}

export async function broadcastWebhooks(message) {
  // fire-and-forget
  await Promise.allSettled([
    sendSlackWebhook(message),
    sendDiscordWebhook(message),
    sendTelegramMessage(message),
  ]);
}

/**
 * Trigger all webhooks registered for a specific event
 * @param {string} eventType - e.g., "task.completed", "project.created"
 * @param {object} payload - Event data to send
 */
export async function triggerWebhooks(eventType, payload) {
  await connectToDatabase();
  const Webhook = (await import("@/models/Webhook")).default;
  const crypto = await import("crypto");

  // Find all active webhooks for this event
  const webhooks = await Webhook.find({
    active: true,
    events: eventType,
  }).lean();

  if (!webhooks.length) return;

  const results = [];

  for (const webhook of webhooks) {
    let attempt = 0;
    let success = false;

    while (attempt < webhook.retryAttempts && !success) {
      attempt++;

      try {
        const body = JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          data: payload,
        });

        const headers = {
          "Content-Type": "application/json",
          "User-Agent": "ZPB-Webhook/1.0",
          ...Object.fromEntries(webhook.headers || []),
        };

        // Add HMAC signature if secret is configured
        if (webhook.secret) {
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(body)
            .digest("hex");
          headers["X-Webhook-Signature"] = signature;
        }

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (response.ok) {
          success = true;
          // Update lastTriggered
          await Webhook.updateOne(
            { _id: webhook._id },
            { $set: { lastTriggered: new Date() } }
          );
        } else {
          console.error(
            `Webhook ${webhook.name} failed (attempt ${attempt}): ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.error(
          `Webhook ${webhook.name} error (attempt ${attempt}):`,
          error.message
        );
      }

      // Wait before retry (exponential backoff)
      if (!success && attempt < webhook.retryAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    results.push({ webhook: webhook.name, success, attempts: attempt });
  }

  console.log(
    `Triggered ${results.length} webhook(s) for event: ${eventType}`,
    results
  );
  return results;
}
