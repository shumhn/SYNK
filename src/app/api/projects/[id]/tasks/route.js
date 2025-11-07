import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
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
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { title, description, milestone, assignee, assignees, status, priority, taskType, dueDate, estimatedHours, tags, checklist, attachments } = body;
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });
  
  await connectToDatabase();
  const created = await Task.create({
    project: id,
    milestone,
    title: title.trim(),
    description,
    assignee,
    assignees: assignees || [],
    status: status || "todo",
    priority: priority || "medium",
    taskType: taskType || "task",
    dueDate: dueDate ? new Date(dueDate) : undefined,
    estimatedHours,
    tags: tags || [],
    checklist: checklist || [],
    attachments: attachments || [],
  });
  
  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
