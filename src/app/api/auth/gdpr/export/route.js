import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import ProjectMessage from "@/models/ProjectMessage";
import Notification from "@/models/Notification";
import AuditLog from "@/models/AuditLog";

/**
 * GET /api/auth/gdpr/export
 * Export all user data (GDPR compliance)
 */
export async function GET() {
  const auth = await requireRoles([]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await connectToDatabase();

  // Collect all user data
  const [user, tasks, messages, notifications, auditLogs] = await Promise.all([
    User.findById(auth.user._id).lean(),
    Task.find({ $or: [{ assignee: auth.user._id }, { assignees: auth.user._id }] }).lean(),
    ProjectMessage.find({ author: auth.user._id }).lean(),
    Notification.find({ user: auth.user._id }).lean(),
    AuditLog.find({ user: auth.user._id }).lean(),
  ]);

  const exportData = {
    user: {
      ...user,
      password: "[REDACTED]", // Don't export password
      twoFA: user.twoFA ? { enabled: user.twoFA.enabled } : undefined,
    },
    tasks,
    messages,
    notifications,
    auditLogs,
    exportedAt: new Date().toISOString(),
  };

  // Log export
  await AuditLog.create({
    user: auth.user._id,
    action: "data_exported",
    status: "success",
  });

  return NextResponse.json(exportData);
}
