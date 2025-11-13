import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });

  await connectToDatabase();

  const match = { assignee: new mongoose.Types.ObjectId(id), status: { $ne: "completed" } };

  const statusAgg = await Task.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const priorityAgg = await Task.aggregate([
    { $match: match },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return NextResponse.json({ error: false, data: { statusBreakdown: statusAgg, priorityBreakdown: priorityAgg } });
}
