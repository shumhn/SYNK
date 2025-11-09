import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Phase from "@/models/Phase";
import { requireRoles } from "@/lib/auth/guard";

function badIds() {
  return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, phaseId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(phaseId)) return badIds();

  await connectToDatabase();
  const phase = await Phase.findOne({ _id: phaseId, project: id }).lean();
  if (!phase) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: phase }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, phaseId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(phaseId)) return badIds();

  const body = await req.json();
  const update = {};
  if (body.title) update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (body.startDate) update.startDate = new Date(body.startDate);
  if (body.endDate) update.endDate = new Date(body.endDate);
  if (body.status) update.status = body.status;
  if (typeof body.order === "number") update.order = body.order;

  await connectToDatabase();
  const updated = await Phase.findOneAndUpdate({ _id: phaseId, project: id }, update, { new: true });
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, phaseId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(phaseId)) return badIds();

  await connectToDatabase();
  const deleted = await Phase.findOneAndDelete({ _id: phaseId, project: id });
  if (!deleted) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Phase deleted" }, { status: 200 });
}
