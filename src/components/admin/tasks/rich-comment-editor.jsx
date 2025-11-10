"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TextareaAutosize from "react-textarea-autosize";

export default function RichCommentEditor({
  onSubmit,
  onCancel,
  initialValue = "",
  placeholder = "Write a comment...",
  users = [],
  buttonText = "Post",
}) {
  const [content, setContent] = useState(initialValue);
  const [showPreview, setShowPreview] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Detect @mentions while typing
  function handleContentChange(e) {
    const value = e.target.value;
    setContent(value);
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // Check if typing @ mention
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      
      // Check if it's a valid mention context (no space after @)
      if (!textAfterAt.includes(" ") && textAfterAt.length > 0) {
        setMentionSearch(textAfterAt);
        setShowMentionMenu(true);
        
        // Calculate position for mention menu
        const textarea = textareaRef.current;
        if (textarea) {
          const coords = getCaretCoordinates(textarea, cursorPos);
          setMentionPosition({ top: coords.top + 20, left: coords.left });
        }
      } else if (textAfterAt.length === 0) {
        setMentionSearch("");
        setShowMentionMenu(true);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  }

  // Simple caret position calculation
  function getCaretCoordinates(element, position) {
    const div = document.createElement("div");
    const style = getComputedStyle(element);
    div.style.position = "absolute";
    div.style.visibility = "hidden";
    div.style.whiteSpace = "pre-wrap";
    div.style.font = style.font;
    div.style.padding = style.padding;
    div.textContent = element.value.substring(0, position);
    document.body.appendChild(div);
    const span = document.createElement("span");
    span.textContent = element.value.substring(position) || ".";
    div.appendChild(span);
    const { offsetTop: top, offsetLeft: left } = span;
    document.body.removeChild(div);
    return { top, left };
  }

  // Filter users for mention autocomplete
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Insert mention
  function insertMention(user) {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");
    
    const newContent =
      content.substring(0, lastAtSymbol) +
      `@${user.username} ` +
      textAfterCursor;
    
    setContent(newContent);
    setShowMentionMenu(false);
    
    if (!mentions.includes(user._id)) {
      setMentions([...mentions, user._id]);
    }
    
    // Focus back on textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // Handle file upload
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const sigRes = await fetch(`/api/uploads/cloudinary/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: "comments", uploadPreset: "zpb-uploads" }),
      });
      const sig = await sigRes.json();
      
      if (!sigRes.ok || sig.error) {
        alert(sig.message || "Failed to get upload signature");
        return;
      }
      
      const { cloudName, apiKey, timestamp, signature, folder, uploadPreset } = sig.data;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      if (folder) fd.append("folder", folder);
      if (uploadPreset) fd.append("upload_preset", uploadPreset);
      fd.append("signature", signature);
      
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: fd }
      );
      const up = await uploadRes.json();
      
      if (!uploadRes.ok || up.error) {
        alert(up.error?.message || "Upload failed");
        return;
      }
      
      setAttachments([
        ...attachments,
        {
          filename: up.original_filename || file.name,
          url: up.secure_url,
          size: file.size,
        },
      ]);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      alert("Unexpected upload error");
    } finally {
      setUploadingFile(false);
    }
  }

  function removeAttachment(index) {
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;
    onSubmit({ content, mentions, attachments });
    setContent("");
    setMentions([]);
    setAttachments([]);
  }

  // Toolbar actions
  function insertMarkdown(prefix, suffix = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText =
      content.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      content.substring(end);
    
    setContent(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
        <button
          type="button"
          onClick={() => insertMarkdown("**", "**")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("*", "*")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800"
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("`", "`")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800 font-mono"
          title="Code"
        >
          {"<>"}
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("\n```\n", "\n```\n")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800"
          title="Code Block"
        >
          {"```"}
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("[", "](url)")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800"
          title="Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown("\n- ", "")}
          className="px-2 py-1 text-xs rounded hover:bg-neutral-800"
          title="List"
        >
          • List
        </button>
        
        <div className="flex-1" />
        
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-3 py-1 text-xs rounded ${
            showPreview ? "bg-blue-500 text-white" : "hover:bg-neutral-800"
          }`}
        >
          {showPreview ? "📝 Edit" : "👁️ Preview"}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="px-3 py-1 text-xs rounded hover:bg-neutral-800"
          title="Attach File"
        >
          {uploadingFile ? "⏳" : "📎"}
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="p-3 rounded bg-neutral-900/50 border border-neutral-800 min-h-[100px] prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview*"}</ReactMarkdown>
        </div>
      ) : (
        <div className="relative">
          <TextareaAutosize
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder}
            minRows={3}
            maxRows={15}
            className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm resize-none"
          />
          
          {/* Mention Autocomplete Menu */}
          {showMentionMenu && filteredUsers.length > 0 && (
            <div
              className="absolute z-50 mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              style={{ top: mentionPosition.top, left: mentionPosition.left }}
            >
              {filteredUsers.slice(0, 5).map((user) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-800 text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span>@{user.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded bg-neutral-900/50 border border-neutral-800"
            >
              <span className="text-xs flex-1">📎 {att.filename}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Markdown Guide */}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-400">Markdown Guide</summary>
        <div className="mt-2 space-y-1 pl-4">
          <div>**bold** → <strong>bold</strong></div>
          <div>*italic* → <em>italic</em></div>
          <div>`code` → <code className="bg-neutral-800 px-1 rounded">code</code></div>
          <div>[link](url) → link</div>
          <div>- List item → • List item</div>
          <div>@username → Mention user</div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-white text-black px-4 py-2 rounded text-sm font-medium"
        >
          {buttonText}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-neutral-800 text-white px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
