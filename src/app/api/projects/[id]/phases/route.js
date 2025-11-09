import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Phase from "@/models/Phase";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }

  await connectToDatabase();
  const phases = await Phase.find({ project: id }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json({ error: false, data: phases }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }

  const body = await req.json();
  const { title, description, startDate, endDate, order, status } = body;
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });

  await connectToDatabase();
  const created = await Phase.create({
    project: id,
    title: title.trim(),
    description,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: status || undefined,
    order: typeof order === "number" ? order : 0,
  });

  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
