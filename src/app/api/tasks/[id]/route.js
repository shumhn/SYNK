import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid task id" }, { status: 400 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  const body = await req.json();
  const update = {};
  if (body.title) update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description.trim();
  if (body.milestone) update.milestone = body.milestone;
  if (body.assignee) update.assignee = body.assignee;
  if (Array.isArray(body.assignees)) update.assignees = body.assignees;
  const requestedStatus = body.status;
  if (requestedStatus) {
    update.status = requestedStatus;
    if (requestedStatus === "completed" && !body.completedAt) update.completedAt = new Date();
  }
  if (body.priority) update.priority = body.priority;
  if (body.taskType) update.taskType = body.taskType;
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (typeof body.estimatedHours === "number") update.estimatedHours = body.estimatedHours;
  if (typeof body.actualHours === "number") update.actualHours = body.actualHours;
  if (typeof body.progress === "number") update.progress = body.progress;
  if (Array.isArray(body.tags)) update.tags = body.tags;
  if (Array.isArray(body.dependencies)) update.dependencies = body.dependencies;
  if (Array.isArray(body.checklist)) update.checklist = body.checklist;
  if (Array.isArray(body.attachments)) update.attachments = body.attachments;
  if (body.recurring) update.recurring = body.recurring;
  
  await connectToDatabase();
  // Enforce dependency blocking for forward-moving statuses
  if (requestedStatus && ["in_progress", "review", "completed"].includes(requestedStatus)) {
    const current = await Task.findById(id).select("dependencies status").lean();
    if (!current) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
    const deps = Array.isArray(body.dependencies) ? body.dependencies : (current.dependencies || []);
    if (deps.length > 0) {
      const blockers = await Task.countDocuments({ _id: { $in: deps }, status: { $ne: "completed" } });
      if (blockers > 0) {
        return NextResponse.json({ error: true, message: `Task has ${blockers} incomplete dependency(ies)` }, { status: 400 });
      }
    }
  }

  // Apply update
  let updated = await Task.findByIdAndUpdate(id, update, { new: true })
    .populate("assignee", "username email")
    .populate("milestone", "title");
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  // Auto progress from checklist/subtasks if not explicitly set
  try {
    if (typeof body.progress !== "number") {
      const fresh = await Task.findById(id).select("checklist status").lean();
      const [subTotal, subCompleted] = await (async () => {
        const subs = await Task.find({ parentTask: id }).select("status").lean();
        const total = subs.length;
        const comp = subs.filter((s) => s.status === "completed").length;
        return [total, comp];
      })();
      const checklist = fresh?.checklist || [];
      const ckTotal = checklist.length;
      const ckComp = checklist.filter((c) => c.completed).length;
      let computed = 0;
      const parts = [];
      if (ckTotal > 0) parts.push(Math.round((ckComp / ckTotal) * 100));
      if (subTotal > 0) parts.push(Math.round((subCompleted / subTotal) * 100));
      if (parts.length > 0) computed = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
      if (fresh?.status === "completed") computed = 100;
      if (updated.progress !== computed) {
        updated = await Task.findByIdAndUpdate(id, { $set: { progress: computed } }, { new: true })
          .populate("assignee", "username email")
          .populate("milestone", "title");
      }
    }
  } catch (e) {
    // ignore auto progress errors
  }

  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  await connectToDatabase();
  const task = await Task.findByIdAndDelete(id);
  if (!task) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Task deleted" }, { status: 200 });
}

