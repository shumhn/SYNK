import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";
import User from "@/models/User";
import Project from "@/models/Project";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });

  await connectToDatabase();

  const usersInDept = await User.find({ department: id, isActive: true }).select("_id").lean();
  const userIds = usersInDept.map(u => u._id);

  const projectsInDept = await Project.find({ departments: id, archived: { $ne: true } }).select("_id").lean();
  const projectIds = projectsInDept.map(p => p._id);

  const scope = { $or: [] };
  if (userIds.length) scope.$or.push({ assignee: { $in: userIds } });
  if (projectIds.length) scope.$or.push({ project: { $in: projectIds } });
  if (!scope.$or.length) scope.$or.push({ _id: { $exists: false } });

  const statusAgg = await Task.aggregate([
    { $match: { ...scope, status: { $ne: "completed" } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const priorityAgg = await Task.aggregate([
    { $match: { ...scope, status: { $ne: "completed" } } },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const assigneesAgg = await Task.aggregate([
    { $match: { ...scope, status: { $ne: "completed" }, assignee: { $ne: null } } },
    { $group: { _id: "$assignee", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { _id: 0, userId: "$user._id", username: "$user.username", email: "$user.email", count: 1 } },
  ]);

  return NextResponse.json({ error: false, data: { statusBreakdown: statusAgg, priorityBreakdown: priorityAgg, topAssignees: assigneesAgg } });
}
