import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const usersInDept = await User.find({ department: id, isActive: true }).select("_id").lean();
    const userIds = usersInDept.map(u => u._id);

    const projectsInDept = await Project.find({ departments: id, archived: { $ne: true } }).select("_id").lean();
    const projectIds = projectsInDept.map(p => p._id);

    const baseTaskScope = { $or: [] };
    if (userIds.length > 0) baseTaskScope.$or.push({ assignee: { $in: userIds } });
    if (projectIds.length > 0) baseTaskScope.$or.push({ project: { $in: projectIds } });
    if (baseTaskScope.$or.length === 0) baseTaskScope.$or.push({ _id: { $exists: false } });

    const completedFilter = { ...baseTaskScope, status: "completed" };
    if (from || to) {
      completedFilter.completedAt = {};
      if (from) completedFilter.completedAt.$gte = new Date(from);
      if (to) completedFilter.completedAt.$lte = new Date(to);
    }

    const [totalEmployees, activeProjects, completedTasks, pendingTasks] = await Promise.all([
      User.countDocuments({ department: id, isActive: true }),
      Project.countDocuments({ departments: id, archived: { $ne: true }, status: { $nin: ["completed", "cancelled"] } }),
      Task.countDocuments(completedFilter),
      Task.countDocuments({ ...baseTaskScope, status: { $ne: "completed" } })
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
