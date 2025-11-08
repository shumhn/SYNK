import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const weeks = Math.max(4, Math.min(52, Number(searchParams.get("weeks")) || 12));
  const now = new Date();

  await connectToDatabase();

  // Fallback series derived from user's performance fields
  const user = await User.findById(id).select("performance").lean();
  if (!user) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  const perf = user.performance || {};
  const baselineVelocity = Number.isFinite(perf.velocity) && perf.velocity > 0
    ? Math.round(perf.velocity)
    : Math.round(((Number(perf.tasksCompleted) || 0) / weeks) || 0);
  const onTimeRate = Math.max(0, Math.min(100, Number(perf.onTimeRate) || 0));

  const series = Array.from({ length: weeks }, (_, i) => ({
    week: i + 1,
    completed: baselineVelocity,
    onTimeRate,
    velocity: baselineVelocity,
  }));

  return NextResponse.json({ error: false, data: { series } }, { status: 200 });
}
