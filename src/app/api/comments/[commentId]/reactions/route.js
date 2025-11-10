import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskComment from "@/models/TaskComment";
import { requireRoles } from "@/lib/auth/guard";
import pusherServer from "@/lib/pusher/server";

// Add or toggle a reaction
export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { commentId } = await params;
  if (!mongoose.isValidObjectId(commentId)) {
    return NextResponse.json({ error: true, message: "Invalid comment id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { emoji } = body;
  if (!emoji) {
    return NextResponse.json({ error: true, message: "Emoji is required" }, { status: 400 });
  }
  
  await connectToDatabase();
  
  // Check if user already reacted with this emoji
  const comment = await TaskComment.findById(commentId);
  if (!comment) {
    return NextResponse.json({ error: true, message: "Comment not found" }, { status: 404 });
  }
  
  const existingReaction = comment.reactions.find(
    (r) => r.emoji === emoji && r.user.toString() === auth.user._id.toString()
  );
  
  if (existingReaction) {
    // Remove reaction (toggle off)
    comment.reactions = comment.reactions.filter(
      (r) => !(r.emoji === emoji && r.user.toString() === auth.user._id.toString())
    );
  } else {
    // Add reaction
    comment.reactions.push({
      emoji,
      user: auth.user._id,
      createdAt: new Date(),
    });
  }
  
  await comment.save();
  
  const populated = await TaskComment.findById(commentId)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .populate("reactions.user", "username image")
    .lean();
  
  // Trigger real-time event
  try {
    await pusherServer.trigger(`task-${comment.task}`, "comment:reaction", {
      commentId,
      reactions: populated.reactions,
    });
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }
  
  return NextResponse.json({ error: false, data: populated }, { status: 200 });
}
