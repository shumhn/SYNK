import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import TaskType from "@/models/TaskType";
import { requireRoles } from "@/lib/auth/guard";
import { broadcastEvent } from "@/app/api/events/subscribe/route";
import AuditLog from "@/models/AuditLog";

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
  if (body.taskType) update.taskType = body.taskType.trim().toLowerCase();
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (typeof body.estimatedHours === "number") update.estimatedHours = body.estimatedHours;
  if (typeof body.actualHours === "number") update.actualHours = body.actualHours;
  if (typeof body.progress === "number") update.progress = body.progress;
  if (Array.isArray(body.tags)) update.tags = body.tags;
  if (Array.isArray(body.dependencies)) update.dependencies = body.dependencies;
  if (Array.isArray(body.checklist)) update.checklist = body.checklist;
  if (Array.isArray(body.attachments)) update.attachments = body.attachments;
  if (body.recurring) update.recurring = body.recurring;
  if (body.parentTask !== undefined) update.parentTask = body.parentTask; // allow null to remove parent
  if (typeof body.boardOrder === "number") update.boardOrder = body.boardOrder;
  
  await connectToDatabase();
  
  // Cycle guard for parentTask (reparenting): prevent making a descendant the parent
  if (body.parentTask !== undefined && body.parentTask !== null) {
    async function isDescendant(potentialParentId, taskId) {
      if (potentialParentId.toString() === taskId.toString()) return true;
      const task = await Task.findById(taskId).select("parentTask").lean();
      if (!task || !task.parentTask) return false;
      return isDescendant(potentialParentId, task.parentTask);
    }
    if (await isDescendant(id, body.parentTask)) {
      return NextResponse.json({ error: true, message: "Cannot set a descendant as parent (would create cycle)" }, { status: 400 });
    }
  }
  // Validate dynamic task type if provided
  if (update.taskType) {
    const existsType = await TaskType.findOne({ name: update.taskType, archived: { $ne: true } }).lean();
    if (!existsType) return NextResponse.json({ error: true, message: "Invalid task type" }, { status: 400 });
  }
  
  // Cycle guard for dependencies: prevent circular dependency chains
  if (Array.isArray(body.dependencies) && body.dependencies.length > 0) {
    async function hasDependencyCycle(taskId, depIds, visited = new Set()) {
      if (visited.has(taskId.toString())) return true; // cycle detected
      visited.add(taskId.toString());
      for (const depId of depIds) {
        if (depId.toString() === taskId.toString()) return true; // self-dependency
        const depTask = await Task.findById(depId).select("dependencies").lean();
        if (depTask && depTask.dependencies && depTask.dependencies.length > 0) {
          if (await hasDependencyCycle(taskId, depTask.dependencies, visited)) return true;
        }
      }
      return false;
    }
    if (await hasDependencyCycle(id, body.dependencies)) {
      return NextResponse.json({ error: true, message: "Circular dependency detected" }, { status: 400 });
    }
    // Sequential enforcement: if any dependency is not completed, force status to 'blocked'
    const incompleteCount = await Task.countDocuments({ _id: { $in: body.dependencies }, status: { $ne: "completed" } });
    if (incompleteCount > 0 && !requestedStatus) {
      update.status = "blocked";
    }
  }
  
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

  // Snapshot before
  const before = await Task.findById(id)
    .select("title description milestone assignee assignees status priority taskType startDate dueDate estimatedHours actualHours progress tags dependencies checklist attachments recurring parentTask boardOrder project")
    .lean();
  if (!before) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  // Apply update
  let updated = await Task.findByIdAndUpdate(id, update, { new: true })
    .populate("assignee", "username email")
    .populate("milestone", "title");
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  // Audit diff
  try {
    const after = await Task.findById(id)
      .select("title description milestone assignee assignees status priority taskType startDate dueDate estimatedHours actualHours progress tags dependencies checklist attachments recurring parentTask boardOrder project")
      .lean();
    const changes = {};
    const fields = [
      "title","description","milestone","assignee","assignees","status","priority","taskType","startDate","dueDate","estimatedHours","actualHours","progress","tags","dependencies","checklist","attachments","recurring","parentTask","boardOrder"
    ];
    for (const f of fields) {
      const b = before?.[f];
      const a = after?.[f];
      const toStr = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v));
      if (toStr(b) !== toStr(a)) {
        changes[f] = { before: b ?? null, after: a ?? null };
      }
    }
    if (Object.keys(changes).length > 0) {
      await AuditLog.create({
        user: auth.user._id,
        action: "task_updated",
        resource: "Task",
        resourceId: updated._id,
        details: { project: updated.project, changes },
        status: "success",
      });
    }
  } catch {}

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

  // Auto-unblock dependents when this task completes
  try {
    if (requestedStatus === "completed") {
      const dependents = await Task.find({ dependencies: id, status: "blocked" }).select("_id dependencies status").lean();
      for (const dep of dependents) {
        const remaining = await Task.countDocuments({ _id: { $in: dep.dependencies }, status: { $ne: "completed" } });
        if (remaining === 0) {
          await Task.findByIdAndUpdate(dep._id, { $set: { status: "todo" } });
        }
      }
    }
  } catch (e) {}

  try {
    broadcastEvent({ type: "task-updated", taskId: id, project: updated.project, status: updated.status });
  } catch {}

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
  try {
    broadcastEvent({ type: "task-deleted", taskId: id, project: task.project });
  } catch {}
  try {
    await AuditLog.create({
      user: auth.user._id,
      action: "task_deleted",
      resource: "Task",
      resourceId: task._id,
      details: { title: task.title, project: task.project, assignee: task.assignee, status: task.status, priority: task.priority, dueDate: task.dueDate },
      status: "success",
    });
  } catch {}
  return NextResponse.json({ error: false, message: "Task deleted" }, { status: 200 });
}

