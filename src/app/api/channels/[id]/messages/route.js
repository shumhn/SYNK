import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import ProjectMessage from "@/models/ProjectMessage";
import Channel from "@/models/Channel";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";
import { broadcastEvent, sendEventToUsers } from "@/app/api/events/subscribe/route";
import { broadcastWebhooks } from "@/lib/webhooks";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid channel id" }, { status: 400 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const parent = searchParams.get("parent");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const query = { channel: id, isDeleted: false };
  if (parent) query.parent = parent; else query.parent = null;

  const [messages, total] = await Promise.all([
    ProjectMessage.find(query)
      .populate("author", "username email image")
      .populate("mentions", "username email")
      .populate("reactions.user", "username image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProjectMessage.countDocuments(query),
  ]);

  return NextResponse.json({
    error: false,
    data: messages.reverse(),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid channel id" }, { status: 400 });
  }

  const body = await req.json();
  const { content, parent, mentions, attachments, contentType } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: true, message: { content: ["Content is required"] } }, { status: 400 });
  }

  await connectToDatabase();

  let extractedMentions = mentions || [];
  if (!extractedMentions.length) {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);
    if (matches) {
      const User = mongoose.model("User");
      const usernames = matches.map((m) => m.slice(1));
      const mentionedUsers = await User.find({ username: { $in: usernames } }).select("_id").lean();
      extractedMentions = mentionedUsers.map((u) => u._id);
    }
  }

  const created = await ProjectMessage.create({
    channel: id,
    author: auth.user._id,
    content: content.trim(),
    contentType: contentType || "markdown",
    parent: parent || undefined,
    mentions: extractedMentions,
    attachments: attachments || [],
  });

  if (extractedMentions.length > 0) {
    const notificationsToCreate = extractedMentions
      .filter((userId) => userId.toString() !== auth.user._id.toString())
      .map((userId) => ({
        user: userId,
        type: parent ? "reply" : "mention",
        title: parent ? `${auth.user.username} replied in channel` : `${auth.user.username} mentioned you in a channel`,
        message: content.slice(0, 100),
        actor: auth.user._id,
        refType: "ProjectMessage",
        refId: created._id,
        metadata: { channel: id },
      }));
    if (notificationsToCreate.length > 0) await Notification.insertMany(notificationsToCreate);
  }

  const populated = await ProjectMessage.findById(created._id)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .populate("reactions.user", "username image")
    .lean();

  // SSE broadcast
  try {
    broadcastEvent({ type: "new-message", message: populated });
    if (extractedMentions?.length) {
      sendEventToUsers(extractedMentions.map(String), { type: "new-message", message: populated });
    }
  } catch {}

  // Webhooks (fire-and-forget)
  try {
    const channel = await Channel.findById(id).lean();
    const text = `[Channel: ${channel?.name || id}] ${auth.user.username}: ${content.slice(0, 200)}`;
    broadcastWebhooks(text);
  } catch {}

  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
