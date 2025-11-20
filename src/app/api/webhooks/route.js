import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Webhook from "@/models/Webhook";

/**
 * GET /api/webhooks - List all webhooks
 */
export async function GET(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const webhooks = await Webhook.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ error: false, data: webhooks }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks - Create a new webhook
 */
export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, url, events, headers, secret, retryAttempts, active } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: true, message: "Missing required fields: name, url, events" },
        { status: 400 }
      );
    }

    const webhook = await Webhook.create({
      name,
      url,
      events,
      headers: headers || {},
      secret,
      retryAttempts: retryAttempts || 3,
      active: active !== false,
      createdBy: auth.user._id,
    });

    return NextResponse.json({ error: false, data: webhook }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
