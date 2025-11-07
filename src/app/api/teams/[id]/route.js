import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Team from "@/models/Team";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid team id" }, { status: 400 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json();
  const update = {};
  if (typeof body?.name === "string") update.name = body.name.trim();
  if (typeof body?.description === "string") update.description = body.description.trim();
  if (typeof body?.archived === "boolean") update.archived = body.archived;
  if (body?.lead) update.lead = body.lead;
  if (body?.department) update.department = body.department;

  await connectToDatabase();

  if (update.name) {
    const exists = await Team.findOne({ _id: { $ne: id }, name: update.name, department: update.department || undefined }).lean();
    if (exists) return NextResponse.json({ error: true, message: "Team with same name already exists in department" }, { status: 400 });
  }

  if (update.department) {
    const dep = await Department.findById(update.department).lean();
    if (!dep) return NextResponse.json({ error: true, message: "Department not found" }, { status: 404 });
  }

  const updated = await Team.findByIdAndUpdate(id, update, { new: true });
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}
