import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const dep = await Department.findById(id)
    .populate("head", "username email")
    .populate("managers", "username email")
    .lean();
  if (!dep) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: dep }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();

  const body = await req.json();
  const update = {};
  if (typeof body?.name === "string") update.name = body.name.trim();
  if (typeof body?.description === "string") update.description = body.description.trim();
  if (typeof body?.archived === "boolean") update.archived = body.archived;
  if (body?.head) update.head = body.head;
  if (Array.isArray(body?.managers)) update.managers = body.managers;

  await connectToDatabase();

  if (update.name) {
    const exists = await Department.findOne({ _id: { $ne: id }, name: update.name }).lean();
    if (exists) return NextResponse.json({ error: true, message: "Department name already exists" }, { status: 400 });
  }

  // Validate head/managers exist
  if (update.head) {
    const u = await User.findById(update.head).select("_id").lean();
    if (!u) return NextResponse.json({ error: true, message: "Head user not found" }, { status: 400 });
  }
  if (update.managers) {
    const count = await User.countDocuments({ _id: { $in: update.managers } });
    if (count !== update.managers.length) return NextResponse.json({ error: true, message: "One or more managers not found" }, { status: 400 });
  }

  const updated = await Department.findByIdAndUpdate(id, update, { new: true })
    .populate("head", "username email")
    .populate("managers", "username email");
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}
