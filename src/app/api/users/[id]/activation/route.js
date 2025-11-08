import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { requireRoles } from "@/lib/auth/guard";

/**
 * PATCH /api/users/[id]/activation
 * Activate or deactivate user account (admin only)
 */
export async function PATCH(request, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be true or false" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findById(id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent deactivating yourself
  if (user._id.toString() === auth.user._id.toString()) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  // Update status
  user.isActive = isActive;
  await user.save();

  // If deactivating, revoke all sessions
  if (!isActive) {
    user.activeSessions = user.activeSessions.map((session) => ({
      ...session,
      revokedAt: new Date(),
    }));
    user.isOnline = false;
    await user.save();
  }

  // Log action
  await AuditLog.create({
    user: auth.user._id,
    action: isActive ? "user_activated" : "user_deactivated",
    resource: "User",
    resourceId: user._id,
    status: "success",
    details: { targetUser: user.email },
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({
    message: `User ${isActive ? "activated" : "deactivated"} successfully`,
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
    },
  });
}
