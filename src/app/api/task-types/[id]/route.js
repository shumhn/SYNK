import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskType from "@/models/TaskType";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const found = await TaskType.findById(id).lean();
  if (!found) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: found }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json();
  const update = {};
  if (typeof body.name === "string") update.name = body.name.trim().toLowerCase();
  if (typeof body.label === "string") update.label = body.label.trim();
  if (typeof body.description === "string") update.description = body.description.trim();
  if (typeof body.color === "string") update.color = body.color.trim();
  if (typeof body.archived === "boolean") update.archived = body.archived;
  await connectToDatabase();
  if (update.name) {
    const dup = await TaskType.findOne({ _id: { $ne: id }, name: update.name }).lean();
    if (dup) return NextResponse.json({ error: true, message: "Task type with same name exists" }, { status: 400 });
  }
  const updated = await TaskType.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const del = await TaskType.findByIdAndDelete(id);
  if (!del) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Deleted" }, { status: 200 });
}
