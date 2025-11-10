import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskComment from "@/models/TaskComment";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";
import pusherServer from "@/lib/pusher/server";

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
    .populate("reactions.user", "username image")
    .populate("parentComment")
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
  const { content, mentions, attachments, parentComment } = body;
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
    parentComment: parentComment || null,
  });
  
  const populated = await TaskComment.findById(created._id)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .lean();
  
  // Trigger real-time event for this comment
  try {
    await pusherServer.trigger(`task-${id}`, "comment:new", populated);
  } catch (e) {
    console.error("Pusher trigger failed:", e);
    // Don't block comment creation if Pusher fails
  }
  
  // Create notifications for mentioned users (best-effort)
  try {
    const uniqueMentionIds = Array.from(new Set((mentions || []).map((m) => m.toString()))).filter((uid) => uid !== auth.user._id.toString());
    if (uniqueMentionIds.length > 0) {
      const taskDoc = await Task.findById(id).select("title project").lean();
      const title = "You were mentioned in a task comment";
      const message = (content || "").slice(0, 140);
      const payload = uniqueMentionIds.map((uid) => ({
        user: uid,
        type: "mention",
        title,
        message,
        actor: auth.user._id,
        refType: "TaskComment",
        refId: created._id,
        metadata: { taskId: id, taskTitle: taskDoc?.title, projectId: taskDoc?.project },
      }));
      await Notification.insertMany(payload);
    }
  } catch (e) {
    // ignore notification errors to avoid blocking comment creation
  }
  
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
