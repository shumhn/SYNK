import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });

    const user = await User.findById(id).select("_id isActive").lean();
    if (!user) return NextResponse.json({ error: true, message: "User not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const completedFilter = { status: "completed", assignee: id };
    if (from || to) {
      completedFilter.completedAt = {};
      if (from) completedFilter.completedAt.$gte = new Date(from);
      if (to) completedFilter.completedAt.$lte = new Date(to);
    }

    const [activeProjects, completedTasks, pendingTasks] = await Promise.all([
      Project.countDocuments({ archived: { $ne: true }, status: { $nin: ["completed", "cancelled"] }, $or: [ { members: id }, { managers: id } ] }),
      Task.countDocuments(completedFilter),
      Task.countDocuments({ assignee: id, status: { $ne: "completed" } })
    ]);

    return NextResponse.json({
      error: false,
      data: {
        totalEmployees: user.isActive ? 1 : 0,
        activeProjects,
        completedTasks,
        pendingTasks,
      }
    });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
