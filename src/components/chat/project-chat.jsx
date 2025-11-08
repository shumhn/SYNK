"use client";

import { useState, useEffect, useRef } from "react";
import MarkdownEditor from "./markdown-editor";
import EmojiPicker from "./emoji-picker";

export default function ProjectChat({ projectId = null, taskId = null, channelId = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // message ID
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    
    // Connect to SSE for real-time updates
    const eventSource = new EventSource("/api/events/subscribe");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new-message") {
          // Channel scope
          if (channelId && data.message.channel === channelId) {
            setMessages((prev) => [...prev, data.message]);
            scrollToBottom();
          }
          // Project/task scope
          else if (projectId && data.message.project === projectId) {
            if (!taskId || data.message.task === taskId) {
              setMessages((prev) => [...prev, data.message]);
              scrollToBottom();
            }
          }
        }
        if (data.type === "reaction" && data.messageId) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
            )
          );
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, taskId, channelId]);

  async function fetchMessages() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (taskId) params.append("task", taskId);
      let url;
      if (channelId) {
        url = `/api/channels/${channelId}/messages?${params}`;
      } else {
        url = `/api/projects/${projectId}/messages?${params}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error) {
        setMessages(data.data || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(content, attachments = []) {
    if (!content.trim() && attachments.length === 0) return;

    setSending(true);
    try {
      const url = channelId ? `/api/channels/${channelId}/messages` : `/api/projects/${projectId}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          task: taskId,
          parent: replyingTo?._id,
          attachments,
        }),
      });

      const data = await res.json();
      if (!data.error) {
        setMessages((prev) => [...prev, data.data]);
        setReplyingTo(null);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  }

  async function addReaction(messageId, emoji) {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      
      setShowEmojiPicker(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  }

  async function removeReaction(messageId, emoji) {
    try {
      await fetch(`/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error removing reaction:", error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMarkdown(content) {
    // Simple markdown rendering (can be enhanced with a library like marked or react-markdown)
    return content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/@(\w+)/g, '<span class="text-blue-400">@$1</span>');
  }

  function groupReactions(reactions) {
    const grouped = {};
    reactions.forEach((r) => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user);
    });
    return grouped;
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div key={message._id} className="group">
              {/* Thread Indicator */}
              {message.parent && (
                <div className="ml-12 mb-1 text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Replying to {message.parent.author?.username}
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Avatar */}
                {message.author?.image ? (
                  <img
                    src={message.author.image}
                    alt={message.author.username}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {message.author?.username?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                )}

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold">{message.author?.username || "Unknown"}</span>
                    <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                    {message.isEdited && (
                      <span className="text-xs text-gray-500">(edited)</span>
                    )}
                  </div>

                  {/* Message Text */}
                  <div
                    className="mt-1 text-sm prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded text-sm hover:bg-neutral-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span>{att.filename}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(groupReactions(message.reactions)).map(([emoji, data]) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            const hasReacted = data.users.some((u) => u._id === "current-user-id"); // TODO: Get current user ID
                            if (hasReacted) {
                              removeReaction(message._id, emoji);
                            } else {
                              addReaction(message._id, emoji);
                            }
                          }}
                          className="px-2 py-1 bg-neutral-800 rounded text-xs hover:bg-neutral-700 flex items-center gap-1"
                          title={data.users.map((u) => u.username).join(", ")}
                        >
                          <span>{emoji}</span>
                          <span>{data.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions (show on hover) */}
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
                    <button
                      onClick={() => setReplyingTo(message)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(message._id)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      React
                    </button>
                  </div>

                  {/* Emoji Picker */}
                  {showEmojiPicker === message._id && (
                    <div className="mt-2">
                      <EmojiPicker
                        onSelect={(emoji) => {
                          addReaction(message._id, emoji);
                          setShowEmojiPicker(null);
                        }}
                        onClose={() => setShowEmojiPicker(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-gray-400">Replying to </span>
            <span className="font-semibold">{replyingTo.author?.username}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-neutral-800">
        <MarkdownEditor
          onSend={sendMessage}
          sending={sending}
          placeholder={replyingTo ? "Write a reply..." : "Write a message..."}
        />
      </div>
    </div>
  );
}
