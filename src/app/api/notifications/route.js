import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";

/**
 * GET /api/notifications
 * Get user's notifications with filtering and pagination
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const type = searchParams.get("type"); // mention, reaction, reply, etc.
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  // Build query
  const query = { user: auth.user._id };
  if (unreadOnly) query.isRead = false;
  if (type) query.type = type;

  // Execute query
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("actor", "username email image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: auth.user._id, isRead: false }),
  ]);

  return NextResponse.json({
    error: false,
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  }, { status: 200 });
}

/**
 * PUT /api/notifications
 * Bulk update notifications (mark as read, mark all as read, etc.)
 */
export async function PUT(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  await connectToDatabase();

  const body = await req.json();
  const { action, notificationIds } = body;

  if (!action) {
    return NextResponse.json({ error: true, message: "Action is required" }, { status: 400 });
  }

  if (action === "markAsRead") {
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: true, message: "notificationIds array is required" },
        { status: 400 }
      );
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds }, user: auth.user._id },
      { isRead: true, readAt: new Date() }
    );

    return NextResponse.json({ error: false, message: "Notifications marked as read" }, { status: 200 });
  }

  if (action === "markAllAsRead") {
    await Notification.updateMany(
      { user: auth.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return NextResponse.json({ error: false, message: "All notifications marked as read" }, { status: 200 });
  }

  return NextResponse.json({ error: true, message: "Invalid action" }, { status: 400 });
}
