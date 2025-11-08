"use client";

import { useState, useRef, useEffect } from "react";

export default function MarkdownEditor({ onSend, sending = false, placeholder = "Write a message..." }) {
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  // Mentions state
  const [users, setUsers] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);

  useEffect(() => {
    // Preload users for mentions
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (!data.error) setUsers(data.data || []);
      } catch {}
    })();
  }, []);

  async function handleSend() {
    if (!content.trim() && attachments.length === 0) return;
    
    await onSend(content, attachments);
    setContent("");
    setAttachments([]);
    setShowPreview(false);
    setMentionOpen(false);
  }

  async function handleFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      // Get signed upload URL
      const signRes = await fetch("/api/files/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "chat", context: "messages" }),
      });
      const signData = await signRes.json();

      // Upload each file to Cloudinary
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", signData.apiKey);
        formData.append("timestamp", signData.timestamp);
        formData.append("signature", signData.signature);
        formData.append("folder", signData.folder);
        formData.append("upload_preset", signData.uploadPreset);

        const uploadRes = await fetch(signData.uploadUrl, {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        // Create FileAsset record
        await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            originalFilename: file.name,
            url: uploadData.secure_url || uploadData.url,
            secureUrl: uploadData.secure_url,
            publicId: uploadData.public_id,
            resourceType: uploadData.resource_type,
            format: uploadData.format,
            mimeType: file.type,
            size: uploadData.bytes,
            width: uploadData.width,
            height: uploadData.height,
            cloudinaryMetadata: uploadData,
          }),
        });

        return {
          filename: file.name,
          url: uploadData.secure_url || uploadData.url,
          publicId: uploadData.public_id,
          resourceType: uploadData.resource_type,
          format: uploadData.format,
          size: uploadData.bytes,
        };
      });

      const uploaded = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function insertMarkdown(before, after = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newText);
    
    // Set cursor position after inserted markdown
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  function updateMentionState() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const text = content.substring(0, cursor);
    // Find the last token starting with '@' without whitespace between
    const match = text.match(/(^|\s)@(\w{0,32})$/);
    if (match) {
      const query = match[2] || "";
      setMentionQuery(query);
      const filtered = users
        .filter((u) => u.username && u.username.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 8);
      setMentionCandidates(filtered);
      setMentionIndex(0);
      setMentionOpen(filtered.length > 0);
    } else {
      setMentionOpen(false);
      setMentionCandidates([]);
      setMentionIndex(0);
    }
  }

  function insertMention(user) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const textBefore = content.substring(0, cursor);
    const textAfter = content.substring(cursor);
    const match = textBefore.match(/(^|\s)@(\w{0,32})$/);
    if (!match) return;
    const prefix = textBefore.slice(0, match.index + match[1].length);
    const mentionText = `@${user.username}`;
    const newContent = prefix + mentionText + " " + textAfter;
    setContent(newContent);
    setMentionOpen(false);
    setMentionCandidates([]);
    setMentionIndex(0);
    // restore caret after inserted mention
    setTimeout(() => {
      const pos = (prefix + mentionText + " ").length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    }, 0);
  }

  function renderPreview(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code class='bg-neutral-800 px-1 rounded'>$1</code>")
      .replace(/@(\w+)/g, '<span class="text-blue-400">@$1</span>')
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="bg-neutral-900">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800">
        <button
          onClick={() => insertMarkdown("**", "**")}
          className="p-2 hover:bg-neutral-800 rounded"
          title="Bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
          </svg>
        </button>

        <button
          onClick={() => insertMarkdown("*", "*")}
          className="p-2 hover:bg-neutral-800 rounded"
          title="Italic"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        <button
          onClick={() => insertMarkdown("`", "`")}
          className="p-2 hover:bg-neutral-800 rounded"
          title="Code"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* File Upload */}
        <label className="p-2 hover:bg-neutral-800 rounded cursor-pointer" title="Attach file">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </label>

        {/* Preview Toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded ${showPreview ? "bg-neutral-700" : "hover:bg-neutral-800"}`}
          title="Preview"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-3 py-2 border-b border-neutral-800 flex flex-wrap gap-2">
          {attachments.map((att, idx) => (
            <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-neutral-800 rounded text-sm">
              <span>{att.filename}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-3 min-h-[100px] prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
        />
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              // wait for state update then compute mention state
              requestAnimationFrame(updateMentionState);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
                return;
              }
              if (mentionOpen) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => Math.min(i + 1, mentionCandidates.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const sel = mentionCandidates[mentionIndex];
                  if (sel) insertMention(sel);
                } else if (e.key === "Escape") {
                  setMentionOpen(false);
                }
              }
            }}
            onClick={updateMentionState}
            onKeyUp={updateMentionState}
            placeholder={placeholder}
            className="w-full p-3 bg-transparent resize-none focus:outline-none min-h-[100px]"
            disabled={sending || uploading}
          />

          {mentionOpen && mentionCandidates.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-72 max-h-60 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded shadow-lg z-50">
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-neutral-800">Mention someone</div>
              {mentionCandidates.map((u, idx) => (
                <button
                  key={u._id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(u);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 ${idx === mentionIndex ? "bg-neutral-800" : ""}`}
                >
                  @{u.username}
                  {u.email ? <span className="text-xs text-gray-500 ml-2">{u.email}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800">
        <div className="text-xs text-gray-500">
          {uploading ? "Uploading..." : "Ctrl/Cmd + Enter to send"}
        </div>
        <button
          onClick={handleSend}
          disabled={sending || uploading || (!content.trim() && attachments.length === 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
