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
    const resource = searchParams.get("resource");
    const resourceId = searchParams.get("resourceId");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
    const before = searchParams.get("before"); // ISO date cursor

    if (!resource || !resourceId) {
      return NextResponse.json({ error: true, message: "resource and resourceId are required" }, { status: 400 });
    }

    const filter = { resource, resourceId };
    if (before) {
      const dt = new Date(before);
      if (!isNaN(dt.getTime())) filter.createdAt = { $lt: dt };
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username email roles")
      .lean();

    const data = logs.map(l => ({
      id: String(l._id),
      ts: l.createdAt,
      user: l.user ? { id: String(l.user._id), username: l.user.username, email: l.user.email, roles: l.user.roles || [] } : null,
      action: l.action,
      status: l.status || "success",
      details: l.details || null,
    }));

    const nextCursor = logs.length === limit ? logs[logs.length - 1].createdAt : null;

    return NextResponse.json({ error: false, data, nextCursor });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
