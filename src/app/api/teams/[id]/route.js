import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Team from "@/models/Team";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid team id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const team = await Team.findById(id).populate("department", "name").lean();
  if (!team) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: team }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const usage = await User.countDocuments({ team: id });
  if (usage > 0) {
    return NextResponse.json({ error: true, message: "Team is referenced by users; reassign or remove references before deleting" }, { status: 400 });
  }
  const deleted = await Team.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  try {
    broadcastEvent({ type: "team-deleted", teamId: id });
  } catch {}
  return NextResponse.json({ error: false, message: "Deleted" }, { status: 200 });
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
