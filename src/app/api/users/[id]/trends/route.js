import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
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
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7);

  await connectToDatabase();

  const tasks = await Task.find({
    $or: [{ assignee: id }, { assignees: id }],
    createdAt: { $gte: start },
  })
    .select("status dueDate completedAt createdAt")
    .lean();

  const buckets = Array.from({ length: weeks }, (_, i) => ({
    weekStart: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7),
    completed: 0,
    onTime: 0,
    completedWithDue: 0,
  }));

  for (const t of tasks) {
    const idx = Math.min(
      weeks - 1,
      Math.max(0, Math.floor((new Date(t.createdAt) - start) / (7 * 24 * 60 * 60 * 1000)))
    );

    if (t.status === "completed" && t.completedAt) {
      buckets[idx].completed += 1;
      if (t.dueDate) {
        buckets[idx].completedWithDue += 1;
        if (new Date(t.completedAt) <= new Date(t.dueDate)) buckets[idx].onTime += 1;
      }
    }
  }

  const series = buckets.map((b, i) => ({
    week: i + 1,
    completed: b.completed,
    onTimeRate: b.completedWithDue ? Math.round((b.onTime / b.completedWithDue) * 100) : 0,
    velocity: b.completed,
  }));

  return NextResponse.json({ error: false, data: { series } }, { status: 200 });
}
