import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import { triggerWebhooks } from "@/lib/webhooks";

/**
 * POST /api/webhooks/test - Test a webhook
 */
export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { url, secret } = body;

    if (!url) {
      return NextResponse.json({ error: true, message: "URL required" }, { status: 400 });
    }

    // Send test payload
    const testPayload = {
      event: "test.webhook",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from Zalient Productive",
        success: true
      }
    };

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "ZPB-Webhook/1.0"
    };

    if (secret) {
      const crypto = await import("crypto");
      const signature = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(testPayload))
        .digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      return NextResponse.json({
        error: false,
        message: "Test webhook sent successfully!",
        status: response.status
      });
    } else {
      return NextResponse.json({
        error: true,
        message: `Webhook failed with status ${response.status}`,
        status: response.status
      }, { status: 500 });
    }

  } catch (e) {
    return NextResponse.json({ 
      error: true, 
      message: e.message || "Failed to send test webhook" 
    }, { status: 500 });
  }
}
