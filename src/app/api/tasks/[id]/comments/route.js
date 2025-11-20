import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskComment from "@/models/TaskComment";
import Task from "@/models/Task";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";
import pusherServer from "@/lib/pusher/server";
import { notifyMention } from "@/lib/notifications";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid task id" },
      { status: 400 }
    );
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
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: true, message: "Invalid task id" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { content, mentions, attachments, parentComment } = body;
  if (!content?.trim()) {
    return NextResponse.json(
      { error: true, message: { content: ["Content is required"] } },
      { status: 400 }
    );
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
    const uniqueMentionIds = Array.from(
      new Set((mentions || []).map((m) => m.toString()))
    ).filter((uid) => uid !== auth.user._id.toString());
    if (uniqueMentionIds.length > 0) {
      for (const uid of uniqueMentionIds) {
        await notifyMention(uid, auth.user._id, "TaskComment", created._id, {
          taskId: id,
          message: (content || "").slice(0, 140),
        });
      }
    }
  } catch (e) {
    // ignore notification errors to avoid blocking comment creation
  }

  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
