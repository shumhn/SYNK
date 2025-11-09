import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Milestone from "@/models/Milestone";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  await connectToDatabase();
  const project = await Project.findById(id)
    .populate("departments", "name")
    .populate("managers", "username email")
    .populate("members", "username email")
    .populate("createdBy", "username email")
    .lean();
  
  if (!project) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  
  // Calculate progress from tasks
  const tasks = await Task.find({ project: id }).select("status").lean();
  const completed = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  
  // Update if different
  if (project.progress !== progress) {
    await Project.updateOne({ _id: id }, { $set: { progress } });
    project.progress = progress;
  }
  
  return NextResponse.json({ error: false, data: project }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  const body = await req.json();
  const update = {};
  
  if (body.title) update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description.trim();
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.endDate) update.endDate = new Date(body.endDate);
  if (body.status) update.status = body.status;
  if (typeof body.archived === "boolean") update.archived = body.archived;
  if (Array.isArray(body.departments)) update.departments = body.departments;
  if (Array.isArray(body.managers)) update.managers = body.managers;
  if (Array.isArray(body.members)) update.members = body.members;
  if (body.budget) update.budget = body.budget;
  if (Array.isArray(body.resources)) update.resources = body.resources;
  
  await connectToDatabase();
  // Validate departments exist and are not archived
  if (Array.isArray(update.departments)) {
    const depDocs = await Department.find({ _id: { $in: update.departments }, archived: false }).select("_id").lean();
    if (depDocs.length !== update.departments.length) {
      return NextResponse.json({ error: true, message: "One or more departments are invalid or archived" }, { status: 400 });
    }
  }
  // Validate managers have privileged roles
  if (Array.isArray(update.managers)) {
    const mgrDocs = await User.find({ _id: { $in: update.managers }, roles: { $in: ["admin", "hr", "manager"] } }).select("_id").lean();
    if (mgrDocs.length !== update.managers.length) {
      return NextResponse.json({ error: true, message: "One or more managers are invalid or not allowed" }, { status: 400 });
    }
  }
  // Validate members are approved (non-empty roles)
  if (Array.isArray(update.members)) {
    const memDocs = await User.find({ _id: { $in: update.members }, roles: { $exists: true, $ne: [] } }).select("_id").lean();
    if (memDocs.length !== update.members.length) {
      return NextResponse.json({ error: true, message: "One or more members are invalid or not approved" }, { status: 400 });
    }
  }
  // Ensure all managers are also members
  if (Array.isArray(update.managers)) {
    const currentMembers = Array.isArray(update.members) ? update.members : [];
    const membersSet = new Set([...(currentMembers || []), ...update.managers]);
    update.members = Array.from(membersSet);
  }

  const updated = await Project.findByIdAndUpdate(id, update, { new: true })
    .populate("departments", "name")
    .populate("managers", "username email")
    .populate("members", "username email");
  
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  await connectToDatabase();
  const project = await Project.findByIdAndDelete(id);
  if (!project) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  
  // Delete associated tasks and milestones
  await Task.deleteMany({ project: id });
  await Milestone.deleteMany({ project: id });
  
  return NextResponse.json({ error: false, message: "Project deleted" }, { status: 200 });
}
