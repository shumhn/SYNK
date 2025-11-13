import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import AuditLog from "@/models/AuditLog";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));

    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username email roles department")
      .lean();

    const data = logs.map(l => ({
      id: String(l._id),
      ts: l.createdAt,
      user: l.user ? { id: String(l.user._id), username: l.user.username, email: l.user.email, roles: l.user.roles || [], department: l.user.department || null } : null,
      action: l.action,
      resource: l.resource || null,
      resourceId: l.resourceId ? String(l.resourceId) : null,
      status: l.status || "success",
      ip: l.ip || null,
      userAgent: l.userAgent || null,
    }));

    return NextResponse.json({ error: false, data });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
