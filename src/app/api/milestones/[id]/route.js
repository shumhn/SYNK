import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Milestone from "@/models/Milestone";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid milestone id" }, { status: 400 });
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
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (body.status) update.status = body.status;
  if (typeof body.order === "number") update.order = body.order;
  if (body.status === "completed" && !body.completedAt) update.completedAt = new Date();
  
  await connectToDatabase();
  const updated = await Milestone.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  
  await connectToDatabase();
  const milestone = await Milestone.findByIdAndDelete(id);
  if (!milestone) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Milestone deleted" }, { status: 200 });
}
