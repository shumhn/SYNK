import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskTemplate from "@/models/TaskTemplate";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid template id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const tpl = await TaskTemplate.findById(id).lean();
  if (!tpl) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: tpl }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();

  const body = await req.json();
  const update = {};
  if (body.name) update.name = body.name.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (body.taskType) update.taskType = body.taskType;
  if (body.priority) update.priority = body.priority;
  if (typeof body.estimatedHours === "number") update.estimatedHours = body.estimatedHours;
  if (Array.isArray(body.tags)) update.tags = body.tags;
  if (Array.isArray(body.checklist)) update.checklist = body.checklist;
  if (Array.isArray(body.subtasks)) update.subtasks = body.subtasks;
  if (typeof body.isPublic === "boolean") update.isPublic = body.isPublic;

  await connectToDatabase();
  const updated = await TaskTemplate.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const del = await TaskTemplate.findByIdAndDelete(id);
  if (!del) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Deleted" }, { status: 200 });
}
