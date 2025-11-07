import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import ProjectMessage from "@/models/ProjectMessage";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const messages = await ProjectMessage.find({ project: id })
    .populate("author", "username email image")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  return NextResponse.json({ error: false, data: messages.reverse() }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { content } = body;
  if (!content?.trim()) return NextResponse.json({ error: true, message: { content: ["Content is required"] } }, { status: 400 });
  
  await connectToDatabase();
  const created = await ProjectMessage.create({
    project: id,
    author: auth.user._id,
    content: content.trim(),
  });
  
  const populated = await ProjectMessage.findById(created._id).populate("author", "username email image").lean();
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
