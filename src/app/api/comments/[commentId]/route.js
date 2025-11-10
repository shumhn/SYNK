import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskComment from "@/models/TaskComment";
import { requireRoles } from "@/lib/auth/guard";
import pusherServer from "@/lib/pusher/server";

// Update (edit) a comment
export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { commentId } = await params;
  if (!mongoose.isValidObjectId(commentId)) {
    return NextResponse.json({ error: true, message: "Invalid comment id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const comment = await TaskComment.findById(commentId);
  
  if (!comment) {
    return NextResponse.json({ error: true, message: "Comment not found" }, { status: 404 });
  }
  
  // Only author or admin can edit
  if (comment.author.toString() !== auth.user._id.toString() && auth.user.role !== "admin") {
    return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 403 });
  }
  
  const body = await req.json();
  const { content } = body;
  
  if (!content?.trim()) {
    return NextResponse.json({ error: true, message: "Content is required" }, { status: 400 });
  }
  
  comment.content = content.trim();
  comment.edited = true;
  comment.editedAt = new Date();
  await comment.save();
  
  const populated = await TaskComment.findById(commentId)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .populate("reactions.user", "username image")
    .lean();
  
  // Trigger real-time event
  try {
    await pusherServer.trigger(`task-${comment.task}`, "comment:updated", populated);
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }
  
  return NextResponse.json({ error: false, data: populated }, { status: 200 });
}

// Delete a comment
export async function DELETE(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { commentId } = await params;
  if (!mongoose.isValidObjectId(commentId)) {
    return NextResponse.json({ error: true, message: "Invalid comment id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const comment = await TaskComment.findById(commentId);
  
  if (!comment) {
    return NextResponse.json({ error: true, message: "Comment not found" }, { status: 404 });
  }
  
  // Only author or admin can delete
  if (comment.author.toString() !== auth.user._id.toString() && auth.user.role !== "admin") {
    return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 403 });
  }
  
  const taskId = comment.task;
  
  // Also delete all replies to this comment
  await TaskComment.deleteMany({ parentComment: commentId });
  await TaskComment.findByIdAndDelete(commentId);
  
  // Trigger real-time event
  try {
    await pusherServer.trigger(`task-${taskId}`, "comment:deleted", { commentId });
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }
  
  return NextResponse.json({ error: false, message: "Comment deleted" }, { status: 200 });
}
