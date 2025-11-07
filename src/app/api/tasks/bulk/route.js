import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const body = await req.json();
  const { operation, taskIds, updates } = body;
  
  if (!operation || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: true, message: "Operation and taskIds required" }, { status: 400 });
  }
  
  await connectToDatabase();
  
  const validIds = taskIds.filter((id) => mongoose.isValidObjectId(id));
  if (validIds.length === 0) {
    return NextResponse.json({ error: true, message: "No valid task IDs" }, { status: 400 });
  }
  
  let result;
  
  switch (operation) {
    case "delete":
      result = await Task.deleteMany({ _id: { $in: validIds } });
      return NextResponse.json({ error: false, message: `Deleted ${result.deletedCount} tasks` }, { status: 200 });
    
    case "update":
      if (!updates || typeof updates !== "object") {
        return NextResponse.json({ error: true, message: "Updates object required" }, { status: 400 });
      }
      result = await Task.updateMany({ _id: { $in: validIds } }, { $set: updates });
      return NextResponse.json({ error: false, message: `Updated ${result.modifiedCount} tasks` }, { status: 200 });
    
    case "move":
      const { project, milestone } = updates || {};
      if (!project) {
        return NextResponse.json({ error: true, message: "Project ID required for move" }, { status: 400 });
      }
      result = await Task.updateMany(
        { _id: { $in: validIds } },
        { $set: { project, milestone: milestone || null } }
      );
      return NextResponse.json({ error: false, message: `Moved ${result.modifiedCount} tasks` }, { status: 200 });
    
    case "assign":
      const { assignee, assignees } = updates || {};
      if (!assignee && !assignees) {
        return NextResponse.json({ error: true, message: "Assignee required for assign" }, { status: 400 });
      }
      const assignUpdate = {};
      if (assignee) assignUpdate.assignee = assignee;
      if (assignees) assignUpdate.assignees = assignees;
      result = await Task.updateMany({ _id: { $in: validIds } }, { $set: assignUpdate });
      return NextResponse.json({ error: false, message: `Assigned ${result.modifiedCount} tasks` }, { status: 200 });
    
    default:
      return NextResponse.json({ error: true, message: "Invalid operation" }, { status: 400 });
  }
}
