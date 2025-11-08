import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import ProjectMessage from "@/models/ProjectMessage";
import Notification from "@/models/Notification";
import { broadcastEvent, sendEventToUser } from "@/app/api/events/subscribe/route";
import { requireRoles } from "@/lib/auth/guard";

/**
 * POST /api/messages/[id]/reactions
 * Add emoji reaction to a message
 */
export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid message id" }, { status: 400 });
  }

  const body = await req.json();
  const { emoji } = body;

  if (!emoji || typeof emoji !== "string") {
    return NextResponse.json({ error: true, message: "Valid emoji is required" }, { status: 400 });
  }

  await connectToDatabase();

  const message = await ProjectMessage.findById(id);
  if (!message) {
    return NextResponse.json({ error: true, message: "Message not found" }, { status: 404 });
  }

  // Check if user already reacted with this emoji
  const existingReaction = message.reactions.find(
    (r) => r.emoji === emoji && r.user.toString() === auth.user._id.toString()
  );

  if (existingReaction) {
    return NextResponse.json(
      { error: true, message: "You already reacted with this emoji" },
      { status: 400 }
    );
  }

  // Add reaction
  message.reactions.push({
    emoji,
    user: auth.user._id,
    createdAt: new Date(),
  });

  await message.save();

  // Create notification for message author (if not self)
  if (message.author.toString() !== auth.user._id.toString()) {
    const notif = await Notification.create({
      user: message.author,
      type: "reaction",
      title: `${auth.user.username} reacted ${emoji} to your message`,
      actor: auth.user._id,
      refType: "ProjectMessage",
      refId: message._id,
      metadata: { emoji, project: message.project, task: message.task },
    });
    try {
      sendEventToUser(String(message.author), { type: "notification", notification: notif.toObject() });
    } catch {}
  }

  // Populate and return
  const updated = await ProjectMessage.findById(id)
    .populate("author", "username email image")
    .populate("reactions.user", "username image")
    .lean();

  // Emit SSE event for real-time updates
  try {
    broadcastEvent({ type: "reaction", messageId: id, reactions: updated.reactions || [] });
  } catch {}

  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

/**
 * DELETE /api/messages/[id]/reactions
 * Remove emoji reaction from a message
 */
export async function DELETE(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid message id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const emoji = searchParams.get("emoji");

  if (!emoji) {
    return NextResponse.json({ error: true, message: "Emoji parameter is required" }, { status: 400 });
  }

  await connectToDatabase();

  const message = await ProjectMessage.findById(id);
  if (!message) {
    return NextResponse.json({ error: true, message: "Message not found" }, { status: 404 });
  }

  // Remove reaction
  message.reactions = message.reactions.filter(
    (r) => !(r.emoji === emoji && r.user.toString() === auth.user._id.toString())
  );

  await message.save();

  // Populate and return
  const updated = await ProjectMessage.findById(id)
    .populate("author", "username email image")
    .populate("reactions.user", "username image")
    .lean();

  // Emit SSE event for real-time updates
  try {
    broadcastEvent({ type: "reaction", messageId: id, reactions: updated.reactions || [] });
  } catch {}

  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}
