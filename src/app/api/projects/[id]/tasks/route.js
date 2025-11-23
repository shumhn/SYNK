import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import TaskType from "@/models/TaskType";
import Project from "@/models/Project";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import { broadcastEvent } from "@/app/api/events/subscribe/route";
import AuditLog from "@/models/AuditLog";
import { notifyTaskAssignment } from "@/lib/notifications";
import { triggerWebhooks } from "@/lib/webhooks";
import { syncTaskToCalendar } from "@/lib/calendar-sync";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid project id" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const tasks = await Task.find({ project: id })
    .populate("assignee", "username email")
    .populate("milestone", "title")
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ error: false, data: tasks }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid project id" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const {
    title,
    description,
    milestone,
    assignee,
    assignees,
    status,
    priority,
    taskType,
    dueDate,
    estimatedHours,
    tags,
    checklist,
    attachments,
  } = body;
  if (!title?.trim())
    return NextResponse.json(
      { error: true, message: { title: ["Title is required"] } },
      { status: 400 }
    );

  await connectToDatabase();
  // Validate taskType if provided against TaskType collection (dynamic types)
  let typeToUse = (taskType || "task").trim().toLowerCase();
  if (typeToUse) {
    const existsType = await TaskType.findOne({
      name: typeToUse,
      archived: { $ne: true },
    }).lean();
    if (!existsType)
      return NextResponse.json(
        { error: true, message: "Invalid task type" },
        { status: 400 }
      );
  }
  // Validate project and allowed assignees: must be approved and either in managers/members or have admin/hr/manager roles
  const projectDoc = await Project.findById(id)
    .select("managers members")
    .lean();
  if (!projectDoc)
    return NextResponse.json(
      { error: true, message: "Project not found" },
      { status: 404 }
    );
  const teamSet = new Set([
    ...(projectDoc.managers || []).map((x) => x.toString()),
    ...(projectDoc.members || []).map((x) => x.toString()),
  ]);
  function isPrivileged(user) {
    return (
      Array.isArray(user.roles) &&
      user.roles.some((r) => ["admin", "hr", "manager"].includes(r))
    );
  }
  async function validateUserId(userId) {
    if (!userId) return true; // optional
    if (!mongoose.isValidObjectId(userId)) return false;
    const u = await User.findById(userId).select("roles").lean();
    if (!u || !u.roles || u.roles.length === 0) return false; // must be approved
    if (teamSet.has(userId.toString()) || isPrivileged(u)) return true;
    return false;
  }
  // validate single assignee
  if (assignee) {
    const ok = await validateUserId(assignee);
    if (!ok)
      return NextResponse.json(
        {
          error: true,
          message:
            "Assignee must be an approved project member/manager or admin/hr/manager",
        },
        { status: 400 }
      );
  }
  // validate multi assignees
  if (Array.isArray(assignees) && assignees.length > 0) {
    for (const aid of assignees) {
      const ok = await validateUserId(aid);
      if (!ok)
        return NextResponse.json(
          {
            error: true,
            message:
              "Assignees must be approved project members/managers or admin/hr/manager",
          },
          { status: 400 }
        );
    }
  }
  const created = await Task.create({
    project: id,
    milestone,
    title: title.trim(),
    description,
    assignee,
    assignees: assignees || [],
    status: status || "todo",
    priority: priority || "medium",
    taskType: typeToUse || "task",
    dueDate: dueDate ? new Date(dueDate) : undefined,
    estimatedHours,
    tags: tags || [],
    checklist: checklist || [],
    attachments: attachments || [],
  });
  try {
    broadcastEvent({
      type: "task-created",
      taskId: created._id,
      project: created.project,
      status: created.status,
    });
  } catch {}
  try {
    await AuditLog.create({
      user: auth.user._id,
      action: "task_created",
      resource: "Task",
      resourceId: created._id,
      details: {
        title: created.title,
        project: created.project,
        assignee: created.assignee,
        status: created.status,
        priority: created.priority,
        dueDate: created.dueDate,
      },
      status: "success",
    });
  } catch {}

  // Notify assigned users
  try {
    if (created.assignee) {
      notifyTaskAssignment(created._id, created.assignee, auth.user._id).catch(
        (err) => {
          console.error("Failed to send task assignment notification:", err);
        }
      );
    }
    if (created.assignees && created.assignees.length > 0) {
      for (const assigneeId of created.assignees) {
        notifyTaskAssignment(created._id, assigneeId, auth.user._id).catch(
          (err) => {
            console.error("Failed to send task assignment notification:", err);
          }
        );
      }
    }
  } catch (e) {}

  // Trigger webhooks for task creation
  try {
    triggerWebhooks("task.created", {
      taskId: created._id.toString(),
      title: created.title,
      status: created.status,
      priority: created.priority,
      project: created.project.toString(),
      assignee: created.assignee?.toString(),
      dueDate: created.dueDate,
    }).catch((err) => {
      console.error("Failed to trigger task.created webhooks:", err);
    });
  } catch (e) {}

  // Sync to Google Calendar if user has it connected
  if (created.assignee && created.dueDate) {
    syncTaskToCalendar(created, created.assignee, "create").catch((err) => {
      console.error("Calendar sync error:", err);
    });
  }

  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
