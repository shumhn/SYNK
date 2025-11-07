import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const user = await User.findById(id).select("activeSessions isOnline lastLoginAt").lean();
  if (!user) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: user }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json();
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return NextResponse.json({ error: true, message: { sessionId: ["sessionId is required"] } }, { status: 400 });
  await connectToDatabase();
  const res = await User.updateOne(
    { _id: id, "activeSessions.sessionId": sessionId },
    { $set: { "activeSessions.$.revokedAt": new Date() } }
  );
  if (res.matchedCount === 0) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  // Reset isOnline if no active sessions remain
  const user = await User.findById(id).select("activeSessions").lean();
  const hasActive = (user?.activeSessions || []).some((s) => !s.revokedAt);
  if (!hasActive) await User.updateOne({ _id: id }, { $set: { isOnline: false } });
  return NextResponse.json({ error: false, message: "Session revoked" }, { status: 200 });
}
