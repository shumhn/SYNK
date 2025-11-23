import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Webhook from "@/models/Webhook";

/**
 * GET /api/webhooks - List all webhooks
 */
export async function GET() {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const webhooks = await Webhook.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ error: false, data: webhooks });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

/**
 * POST /api/webhooks - Create new webhook
 */
export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, url, events, secret, active = true } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json({ 
        error: true, 
        message: "Name, URL, and at least one event are required" 
      }, { status: 400 });
    }

    const webhook = await Webhook.create({
      name,
      url,
      events,
      secret,
      active,
      createdBy: auth.user._id
    });

    return NextResponse.json({ error: false, data: webhook });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

/**
 * PUT /api/webhooks - Update webhook
 */
export async function PUT(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, name, url, events, secret, active } = body;

    if (!id) {
      return NextResponse.json({ error: true, message: "Webhook ID required" }, { status: 400 });
    }

    const webhook = await Webhook.findByIdAndUpdate(
      id,
      { name, url, events, secret, active },
      { new: true, runValidators: true }
    );

    if (!webhook) {
      return NextResponse.json({ error: true, message: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ error: false, data: webhook });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks - Delete webhook
 */
export async function DELETE(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: true, message: "Webhook ID required" }, { status: 400 });
    }

    const webhook = await Webhook.findByIdAndDelete(id);

    if (!webhook) {
      return NextResponse.json({ error: true, message: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ error: false, message: "Webhook deleted successfully" });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
