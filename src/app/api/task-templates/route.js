import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import TaskTemplate from "@/models/TaskTemplate";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const isPublic = searchParams.get("public") === "true";
  
  const filter = isPublic ? { isPublic: true } : { $or: [{ createdBy: auth.user._id }, { isPublic: true }] };
  
  const templates = await TaskTemplate.find(filter)
    .populate("createdBy", "username email")
    .sort({ createdAt: -1 })
    .lean();
  
  return NextResponse.json({ error: false, data: templates }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const body = await req.json();
  const { name, description, taskType, priority, estimatedHours, tags, checklist, subtasks, isPublic } = body;
  
  if (!name?.trim()) {
    return NextResponse.json({ error: true, message: { name: ["Name is required"] } }, { status: 400 });
  }
  
  await connectToDatabase();
  const created = await TaskTemplate.create({
    name: name.trim(),
    description,
    taskType: taskType || "task",
    priority: priority || "medium",
    estimatedHours,
    tags: tags || [],
    checklist: checklist || [],
    subtasks: subtasks || [],
    createdBy: auth.user._id,
    isPublic: !!isPublic,
  });
  
  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
