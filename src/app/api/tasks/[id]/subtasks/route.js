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
    return NextResponse.json({ error: true, message: "Invalid task id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const subtasks = await Task.find({ parentTask: id })
    .populate("assignee", "username email image")
    .populate("assignees", "username email")
    .sort({ createdAt: 1 })
    .lean();
  
  return NextResponse.json({ error: false, data: subtasks }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid task id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { title, description, assignee, priority, estimatedHours } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });
  }
  
  await connectToDatabase();
  const parent = await Task.findById(id).lean();
  if (!parent) return NextResponse.json({ error: true, message: "Parent task not found" }, { status: 404 });
  
  const created = await Task.create({
    project: parent.project,
    parentTask: id,
    title: title.trim(),
    description,
    assignee,
    priority: priority || "medium",
    estimatedHours,
    status: "todo",
  });
  
  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
