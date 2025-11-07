import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Milestone from "@/models/Milestone";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const milestones = await Milestone.find({ project: id }).sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json({ error: false, data: milestones }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { title, description, dueDate, order } = body;
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });
  
  await connectToDatabase();
  const created = await Milestone.create({
    project: id,
    title: title.trim(),
    description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    order: typeof order === "number" ? order : 0,
  });
  
  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
