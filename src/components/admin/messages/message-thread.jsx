"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RichCommentEditor from "@/components/admin/tasks/rich-comment-editor";
import getPusherClient from "@/lib/pusher/client";

function formatTimestamp(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function MessageBubble({ message, isOwn }) {
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 shadow transition-colors border ${
          isOwn
            ? "bg-blue-500/90 text-white border-blue-400"
            : "bg-neutral-900 text-gray-100 border-neutral-800"
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className={`text-xs font-semibold ${isOwn ? "text-white/90" : "text-gray-300"}`}>
            {message.author?.username || "Unknown"}
          </span>
          <span className={`text-[10px] ${isOwn ? "text-white/60" : "text-gray-500"}`}>
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
        {message.content && (
          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isOwn ? "text-white" : "text-gray-100"}`}>
            {message.content}
          </p>
        )}
        {attachments.length > 0 && (
          <div className={`mt-2 space-y-2 ${isOwn ? "text-white" : "text-gray-100"}`}>
            {attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-xs px-3 py-2 rounded-md border ${
                  isOwn
                    ? "border-white/30 bg-white/10 hover:bg-white/20"
                    : "border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                } transition-colors`}
              >
                📎 {att.filename || att.url || `Attachment ${idx + 1}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageThread({ channel, currentUser, onChannelUpdated }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const pusherRef = useRef(null);

  const channelId = channel?._id?.toString();
  const currentUserId = currentUser?._id?.toString();

  const members = useMemo(() => {
    return (channel?.members || []).map((member) => ({
      _id: member?._id?.toString() || "",
      username: member?.username || "Unknown",
    }));
  }, [channel]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      const data = await res.json();
      if (!data.error) {
        const sorted = Array.isArray(data.data)
          ? [...data.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
          : [];
        setMessages(sorted);
        onChannelUpdated?.();
        scrollToBottom();
      }
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      setLoading(false);
    }
  }, [channelId, onChannelUpdated, scrollToBottom]);

  useEffect(() => {
    setMessages([]);
    fetchMessages();
  }, [channelId, fetchMessages]);

  useEffect(() => {
    if (!channelId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const topic = `channel-${channelId}`;
    const subscription = pusher.subscribe(topic);

    const handleNewMessage = (message) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });
      onChannelUpdated?.();
      scrollToBottom();
    };

    subscription.bind("message:new", handleNewMessage);

    pusherRef.current = { pusher, topic, subscription };

    return () => {
      subscription.unbind("message:new", handleNewMessage);
      pusher.unsubscribe(topic);
      pusherRef.current = null;
    };
  }, [channelId, onChannelUpdated, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend({ content, mentions, attachments }) {
    if (!channelId) return;
    if (!content?.trim() && (!attachments || attachments.length === 0)) return;

    setSending(true);
    try {
      await fetch(`/api/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: content?.trim() || "",
          mentions,
          attachments,
        }),
      });
      // Optimistic behaviour handled by Pusher event
    } catch (e) {
      console.error("Failed to send message", e);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const headerTitle = useMemo(() => {
    if (!channel) return "";
    if (channel.type === "private") {
      const otherMembers = (channel.members || []).filter((member) => (member?._id || member)?.toString() !== currentUserId);
      return otherMembers.map((m) => m.username || "Unknown").join(", ") || "Direct Message";
    }
    return channel.name || "Group Chat";
  }, [channel, currentUserId]);

  const metaSubtitle = useMemo(() => {
    if (!channel) return "";
    const memberCount = channel.members?.length || 0;
    return `${memberCount} member${memberCount === 1 ? "" : "s"}`;
  }, [channel]);

  if (!channelId) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-neutral-800 px-6 py-4 bg-neutral-950/80 backdrop-blur flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white truncate">{headerTitle}</h3>
          <p className="text-xs text-gray-500 mt-1">{metaSubtitle}</p>
        </div>
        {channel.type === "group" && channel.description && (
          <p className="text-sm text-gray-400 max-w-md line-clamp-2">{channel.description}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-neutral-950">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-3">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={(message.author?._id || message.author) === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-neutral-800 bg-neutral-950 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <RichCommentEditor
            onSubmit={handleSend}
            users={members}
            buttonText={sending ? "Sending…" : "Send"}
            placeholder="Write a message…"
          />
        </div>
      </div>
    </div>
  );
}
