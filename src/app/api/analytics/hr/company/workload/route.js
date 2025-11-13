import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  await connectToDatabase();

  // Status breakdown of open tasks
  const statusAgg = await Task.aggregate([
    { $match: { status: { $ne: "completed" } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Priority breakdown of open tasks
  const priorityAgg = await Task.aggregate([
    { $match: { status: { $ne: "completed" } } },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Top assignees by open tasks
  const assigneesAgg = await Task.aggregate([
    { $match: { status: { $ne: "completed" }, assignee: { $ne: null } } },
    { $group: { _id: "$assignee", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { _id: 0, userId: "$user._id", username: "$user.username", email: "$user.email", count: 1 } },
  ]);

  return NextResponse.json({ error: false, data: { statusBreakdown: statusAgg, priorityBreakdown: priorityAgg, topAssignees: assigneesAgg } });
}
