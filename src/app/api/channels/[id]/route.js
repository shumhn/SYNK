import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

function badId() { return NextResponse.json({ error: true, message: "Invalid channel id" }, { status: 400 }); }

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const ch = await Channel.findById(id).populate("departments", "name").lean();
  if (!ch) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: ch }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  const body = await req.json();
  const update = {};
  if (typeof body?.name === 'string') update.name = body.name.trim();
  if (typeof body?.description === 'string') update.description = body.description.trim();
  if (typeof body?.archived === 'boolean') update.archived = body.archived;
  if (Array.isArray(body?.departments)) update.departments = body.departments.filter(Boolean);
  await connectToDatabase();
  if (update.name) {
    const exists = await Channel.findOne({ _id: { $ne: id }, name: update.name }).lean();
    if (exists) return NextResponse.json({ error: true, message: "Channel name already exists" }, { status: 400 });
  }
  if (update.departments) {
    const count = await Department.countDocuments({ _id: { $in: update.departments } });
    if (count !== update.departments.length) return NextResponse.json({ error: true, message: "Invalid departments" }, { status: 400 });
  }
  const updated = await Channel.findByIdAndUpdate(id, update, { new: true }).populate("departments", "name");
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}
