import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskComment from "@/models/TaskComment";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid task id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const comments = await TaskComment.find({ task: id })
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .sort({ createdAt: 1 })
    .lean();
  
  return NextResponse.json({ error: false, data: comments }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid task id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { content, mentions, attachments } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: true, message: { content: ["Content is required"] } }, { status: 400 });
  }
  
  await connectToDatabase();
  const created = await TaskComment.create({
    task: id,
    author: auth.user._id,
    content: content.trim(),
    mentions: mentions || [],
    attachments: attachments || [],
  });
  
  const populated = await TaskComment.findById(created._id)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .lean();
  
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
