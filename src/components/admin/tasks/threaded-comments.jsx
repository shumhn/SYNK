"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RichCommentEditor from "./rich-comment-editor";

const EMOJI_OPTIONS = ["👍", "❤️", "😄", "🎉", "🚀", "👀", "🔥", "💯"];

function Comment({ comment, onReply, onReact, onEdit, onDelete, currentUserId, depth = 0, users = [] }) {
  const [showReply, setShowReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const isAuthor = comment.author?._id === currentUserId;
  const maxDepth = 3; // Maximum nesting level
  
  async function handleReplySubmit(data) {
    await onReply(comment._id, data.content, data.mentions, data.attachments);
    setShowReply(false);
  }
  
  async function handleEditSubmit(data) {
    await onEdit(comment._id, data.content);
    setIsEditing(false);
  }
  
  async function handleReact(emoji) {
    await onReact(comment._id, emoji);
    setShowEmojiPicker(false);
  }
  
  // Group reactions by emoji
  const reactionCounts = {};
  (comment.reactions || []).forEach((r) => {
    if (!reactionCounts[r.emoji]) {
      reactionCounts[r.emoji] = { count: 0, users: [], hasReacted: false };
    }
    reactionCounts[r.emoji].count++;
    reactionCounts[r.emoji].users.push(r.user?.username || "Unknown");
    if (r.user?._id === currentUserId) {
      reactionCounts[r.emoji].hasReacted = true;
    }
  });
  
  return (
    <div className={`flex gap-3 ${depth > 0 ? "ml-12" : ""}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.author?.image ? (
          <img src={comment.author.image} alt={comment.author.username} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium">
            {comment.author?.username?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="text-sm font-medium text-white">
                {comment.author?.username || "Unknown"}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {new Date(comment.createdAt).toLocaleString()}
              </span>
              {comment.edited && (
                <span className="text-xs text-gray-500 ml-2">(edited)</span>
              )}
            </div>
            
            {/* Actions */}
            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDelete(comment._id)}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
          
          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="mt-2">
              <RichCommentEditor
                initialValue={comment.content}
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                users={users}
                placeholder="Edit comment..."
                buttonText="Save"
              />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{comment.content}</ReactMarkdown>
            </div>
          )}
          
          {/* Mentions */}
          {comment.mentions && comment.mentions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {comment.mentions.map((m) => (
                <span key={m._id || m} className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-blue-400">
                  @{m.username || m}
                </span>
              ))}
            </div>
          )}
          
          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.attachments.map((a, i) => {
                const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url || "");
                return (
                  <div key={i} className="p-2 rounded border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{a.filename}</span>
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                        Open
                      </a>
                    </div>
                    {isImage && (
                      <img src={a.url} alt={a.filename} className="mt-2 max-h-40 rounded" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Reactions */}
        <div className="flex items-center gap-2 mt-2">
          {Object.entries(reactionCounts).map(([emoji, data]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                data.hasReacted
                  ? "bg-blue-500/20 border border-blue-500/50 text-blue-400"
                  : "bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
              }`}
              title={data.users.join(", ")}
            >
              <span>{emoji}</span>
              <span className="font-medium">{data.count}</span>
            </button>
          ))}
          
          {/* Emoji Picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-2 py-1 rounded text-xs bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 mt-1 p-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg z-10 flex gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Reply Button */}
          {depth < maxDepth && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-xs text-gray-400 hover:text-white ml-2"
            >
              💬 Reply
            </button>
          )}
        </div>
        
        {/* Reply Form */}
        {showReply && (
          <div className="mt-3">
            <RichCommentEditor
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReply(false)}
              users={users}
              placeholder="Write a reply..."
              buttonText="Reply"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThreadedComments({
  comments,
  onAddComment,
  onReply,
  onReact,
  onEdit,
  onDelete,
  currentUserId,
  users = [],
}) {
  
  // Build comment tree
  const commentMap = {};
  const rootComments = [];
  
  comments.forEach((c) => {
    commentMap[c._id] = { ...c, replies: [] };
  });
  
  comments.forEach((c) => {
    if (c.parentComment) {
      const parent = commentMap[c.parentComment._id || c.parentComment];
      if (parent) {
        parent.replies.push(commentMap[c._id]);
      } else {
        rootComments.push(commentMap[c._id]);
      }
    } else {
      rootComments.push(commentMap[c._id]);
    }
  });
  
  function renderComment(comment, depth = 0) {
    return (
      <div key={comment._id} className="space-y-4">
        <Comment
          comment={comment}
          onReply={onReply}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
          currentUserId={currentUserId}
          depth={depth}
          users={users}
        />
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <RichCommentEditor
        onSubmit={onAddComment}
        users={users}
        placeholder="Write a comment... (Markdown supported)"
        buttonText="Post Comment"
      />
      
      {/* Comments Thread */}
      <div className="space-y-6">
        {rootComments.length > 0 ? (
          rootComments.map((comment) => renderComment(comment))
        ) : (
          <p className="text-center text-gray-400 py-8">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
}
