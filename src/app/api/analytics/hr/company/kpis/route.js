import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const completedFilter = { status: "completed" };
    if (from || to) {
      completedFilter.completedAt = {};
      if (from) completedFilter.completedAt.$gte = new Date(from);
      if (to) completedFilter.completedAt.$lte = new Date(to);
    }

    const [totalEmployees, activeProjects, completedTasks, pendingTasks] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Project.countDocuments({ archived: { $ne: true }, status: { $nin: ["completed", "cancelled"] } }),
      Task.countDocuments(completedFilter),
      Task.countDocuments({ status: { $ne: "completed" } })
    ]);

    return NextResponse.json({
      error: false,
      data: {
        totalEmployees,
        activeProjects,
        completedTasks,
        pendingTasks,
      }
    });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
