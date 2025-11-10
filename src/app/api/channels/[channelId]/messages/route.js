import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import ChannelMessage from "@/models/ChannelMessage";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";
import pusherServer from "@/lib/pusher/server";

// GET messages for a channel
export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { channelId } = await params;
  if (!mongoose.isValidObjectId(channelId)) {
    return NextResponse.json({ error: true, message: "Invalid channel ID" }, { status: 400 });
  }
  
  await connectToDatabase();
  
  // Verify user is a member of this channel
  const channel = await Channel.findById(channelId).lean();
  if (!channel) {
    return NextResponse.json({ error: true, message: "Channel not found" }, { status: 404 });
  }
  
  if (!channel.members.some(m => m.toString() === auth.user._id.toString())) {
    return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 403 });
  }
  
  const messages = await ChannelMessage.find({ channel: channelId })
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .populate("reactions.user", "username image")
    .sort({ createdAt: 1 })
    .lean();
  
  // Reset unread count for this user
  await Channel.findByIdAndUpdate(channelId, {
    [`unreadCount.${auth.user._id}`]: 0
  });
  
  return NextResponse.json({ error: false, data: messages }, { status: 200 });
}

// POST new message to channel
export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { channelId } = await params;
  if (!mongoose.isValidObjectId(channelId)) {
    return NextResponse.json({ error: true, message: "Invalid channel ID" }, { status: 400 });
  }
  
  const body = await req.json();
  const { content, mentions, attachments } = body;
  
  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: true, message: "Content or attachments required" }, { status: 400 });
  }
  
  await connectToDatabase();
  
  // Verify user is a member of this channel
  const channel = await Channel.findById(channelId).lean();
  if (!channel) {
    return NextResponse.json({ error: true, message: "Channel not found" }, { status: 404 });
  }
  
  if (!channel.members.some(m => m.toString() === auth.user._id.toString())) {
    return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 403 });
  }
  
  // Create message
  const created = await ChannelMessage.create({
    channel: channelId,
    author: auth.user._id,
    content: content?.trim() || "",
    mentions: mentions || [],
    attachments: attachments || [],
  });
  
  const populated = await ChannelMessage.findById(created._id)
    .populate("author", "username email image")
    .populate("mentions", "username email")
    .lean();
  
  // Update channel's last message
  await Channel.findByIdAndUpdate(channelId, {
    lastMessage: {
      content: populated.content,
      author: populated.author._id,
      createdAt: populated.createdAt
    }
  });
  
  // Increment unread count for other members
  const updateUnread = {};
  channel.members.forEach(memberId => {
    if (memberId.toString() !== auth.user._id.toString()) {
      updateUnread[`unreadCount.${memberId}`] = (channel.unreadCount?.get(memberId.toString()) || 0) + 1;
    }
  });
  if (Object.keys(updateUnread).length > 0) {
    await Channel.findByIdAndUpdate(channelId, updateUnread);
  }
  
  // Trigger real-time event
  try {
    await pusherServer.trigger(`channel-${channelId}`, "message:new", populated);
  } catch (e) {
    console.error("Pusher trigger failed:", e);
  }
  
  // Create notifications for mentions
  try {
    const uniqueMentionIds = Array.from(
      new Set((mentions || []).map(m => m.toString()))
    ).filter(uid => uid !== auth.user._id.toString());
    
    if (uniqueMentionIds.length > 0) {
      const title = `You were mentioned in ${channel.name || 'a conversation'}`;
      const message = (content || "").slice(0, 140);
      const payload = uniqueMentionIds.map(uid => ({
        user: uid,
        type: "mention",
        title,
        message,
        actor: auth.user._id,
        refType: "ChannelMessage",
        refId: created._id,
        metadata: { channelId, channelName: channel.name }
      }));
      await Notification.insertMany(payload);
    }
  } catch (e) {
    // Ignore notification errors
  }
  
  return NextResponse.json({ error: false, data: populated }, { status: 201 });
}
