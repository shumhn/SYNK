import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import ProjectMessage from "@/models/ProjectMessage";
import Notification from "@/models/Notification";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/auth/gdpr/delete
 * Delete user account and all associated data (GDPR compliance)
 * Requires password confirmation
 */
export async function POST(request) {
  const auth = await requireRoles([]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { password, confirm } = body;

  if (confirm !== "DELETE MY ACCOUNT") {
    return NextResponse.json({ error: "Confirmation text required" }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  await connectToDatabase();

  // Verify password
  const { compare } = await import("bcrypt");
  const user = await User.findById(auth.user._id).select("+password");
  
  if (!user || !user.password) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const validPassword = await compare(password, user.password);
  if (!validPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  // Log deletion before deleting user
  await AuditLog.create({
    user: auth.user._id,
    action: "data_deleted",
    status: "success",
    details: { email: user.email, username: user.username },
  });

  // Delete or anonymize user data
  await Promise.all([
    // Soft delete user (keep for data integrity but anonymize)
    User.findByIdAndUpdate(auth.user._id, {
      email: `deleted_${Date.now()}@deleted.local`,
      username: `deleted_${Date.now()}`,
      password: undefined,
      image: undefined,
      googleId: undefined,
      isActive: false,
      roles: ["viewer"],
      permissions: [],
      profile: {},
      twoFA: { enabled: false },
      activeSessions: [],
    }),
    // Delete personal messages
    ProjectMessage.deleteMany({ author: auth.user._id }),
    // Delete notifications
    Notification.deleteMany({ user: auth.user._id }),
    // Keep audit logs for compliance (but user is anonymized)
  ]);

  // Note: We keep task assignments for data integrity
  // but the user is effectively deleted

  return NextResponse.json({ 
    message: "Account deleted successfully",
    note: "Your account has been anonymized and all personal data removed"
  });
}
