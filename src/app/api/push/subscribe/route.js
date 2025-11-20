import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import PushSubscription from "@/models/PushSubscription";

/**
 * POST /api/push/subscribe - Subscribe to push notifications
 */
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: true, message: "Invalid subscription data" },
        { status: 400 }
      );
    }

    // Upsert subscription
    const subscription = await PushSubscription.findOneAndUpdate(
      { user: auth.user._id, endpoint },
      {
        $set: {
          keys,
          userAgent: req.headers.get("user-agent") || "Unknown",
          active: true,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(
      { error: false, data: subscription },
      { status: 200 }
    );
  } catch (e) {
    console.error("Push subscription error:", e);
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push/subscribe - Unsubscribe from push notifications
 */
export async function DELETE(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: true, message: "Missing endpoint" },
        { status: 400 }
      );
    }

    await PushSubscription.deleteOne({
      user: auth.user._id,
      endpoint,
    });

    return NextResponse.json(
      { error: false, message: "Unsubscribed" },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
