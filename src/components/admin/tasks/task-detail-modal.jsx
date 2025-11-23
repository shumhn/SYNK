"use client";

import { useState, useEffect, useRef } from "react";
import ProjectChat from "@/components/chat/project-chat";
import { useRouter } from "next/navigation";
import SubtaskTree from "./subtask-tree";
import getPusherClient from "@/lib/pusher/client";
import ThreadedComments from "./threaded-comments";
import TaskTimer from "@/components/tasks/task-timer";

export default function TaskDetailModal({ task, onClose }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState([]);
  const [commentFile, setCommentFile] = useState({ filename: "", url: "" });
  const [checklist, setChecklist] = useState(task.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [projectTasks, setProjectTasks] = useState([]);
  const [dependencies, setDependencies] = useState(task.dependencies || []);
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [newAttachment, setNewAttachment] = useState({ filename: "", url: "" });
  const [recurring, setRecurring] = useState(task.recurring || { enabled: false, frequency: "weekly", interval: 1, endDate: "" });
  const [users, setUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [commentUploading, setCommentUploading] = useState(false);
  const commentFileInputRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadComments();
    loadProjectTasks();
    loadUsers();
    loadCurrentUser();
  }, [task._id]);

  // Real-time comment subscription
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `task-${task._id}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("comment:new", (newComment) => {
      setComments((prev) => [...prev, newComment]);
    });
    
    channel.bind("comment:updated", (updatedComment) => {
      setComments((prev) =>
        prev.map((c) => (c._id === updatedComment._id ? updatedComment : c))
      );
    });
    
    channel.bind("comment:deleted", ({ commentId }) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId && c.parentComment !== commentId));
    });
    
    channel.bind("comment:reaction", ({ commentId, reactions }) => {
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, reactions } : c))
      );
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [task._id]);

  async function onUploadCommentFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentUploading(true);
    try {
      const sigRes = await fetch(`/api/uploads/cloudinary/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: `tasks/${task._id}/comments`, uploadPreset: "zpb-uploads" }),
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
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: fd });
      const up = await uploadRes.json();
      if (!uploadRes.ok || up.error) {
        alert(up.error?.message || "Upload failed");
        return;
      }
      setCommentFile({ filename: up.original_filename || file.name, url: up.secure_url });
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
    } catch (e) {
      alert("Unexpected upload error");
    } finally {
      setCommentUploading(false);
    }
  }

  async function addChecklistItem(e) {
    e.preventDefault();
    const text = newChecklistText.trim();
    if (!text) return;
    const updated = [...checklist, { text, completed: false, order: checklist.length }];
    setChecklist(updated);
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    });
    setNewChecklistText("");
    router.refresh();
  }

  async function removeChecklistItem(i) {
    const updated = checklist.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, order: idx }));
    setChecklist(updated);
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    });
    router.refresh();
  }

  async function loadUsers() {
    try {
      const res = await fetch(`/api/users`);
      const data = await res.json();
      if (!data.error) setUsers(data.data || []);
    } catch (e) {}
  }
  
  async function loadCurrentUser() {
    try {
      const res = await fetch(`/api/auth/me`);
      const data = await res.json();
      if (!data.error) setCurrentUser(data.data);
    } catch (e) {}
  }

  async function loadComments() {
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`);
      const data = await res.json();
      if (!data.error) setComments(data.data);
    } catch (e) {}
  }

  async function loadProjectTasks() {
    try {
      const pid = task.project?._id || task.project; // support id or populated
      if (!pid) return;
      const res = await fetch(`/api/projects/${pid}/tasks`);
      const data = await res.json();
      if (!data.error) setProjectTasks(data.data || []);
    } catch (e) {}
  }

  async function addComment(data, parentCommentId = null) {
    if (!data.content?.trim() && (!data.attachments || data.attachments.length === 0)) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: data.content?.trim() || "",
          mentions: data.mentions || [],
          attachments: data.attachments || [],
          parentComment: parentCommentId,
        }),
      });
      const responseData = await res.json();
      if (!responseData.error) {
        // Real-time will handle adding to state
      }
    } catch (e) {
      console.error("Failed to add comment:", e);
    }
  }
  
  async function handleReply(parentCommentId, content, mentions, attachments) {
    await addComment({ content, mentions, attachments }, parentCommentId);
  }
  
  async function handleReact(commentId, emoji) {
    try {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      // Real-time will handle updating state
    } catch (e) {
      console.error("Failed to react:", e);
    }
  }
  
  async function handleEditComment(commentId, content) {
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: content.content || content }),
      });
      // Real-time will handle updating state
    } catch (e) {
      console.error("Failed to edit comment:", e);
    }
  }
  
  async function handleDeleteComment(commentId) {
    if (!confirm("Delete this comment and all its replies?")) return;
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      // Real-time will handle removing from state
    } catch (e) {
      console.error("Failed to delete comment:", e);
    }
  }

  async function toggleChecklistItem(index) {
    const updated = [...checklist];
    updated[index].completed = !updated[index].completed;
    setChecklist(updated);
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklist: updated }),
    });
    router.refresh();
  }

  async function saveDependencies() {
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dependencies }),
    });
    router.refresh();
  }

  async function addAttachment(e) {
    e.preventDefault();
    if (!newAttachment.filename.trim() || !newAttachment.url.trim()) return;
    const next = [...attachments, { filename: newAttachment.filename, url: newAttachment.url }];
    setAttachments(next);
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attachments: next }),
    });
    setNewAttachment({ filename: "", url: "" });
    router.refresh();
  }

  async function onUploadAttachmentChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const sigRes = await fetch(`/api/uploads/cloudinary/sign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: `tasks/${task._id}`, uploadPreset: "zpb-uploads" }),
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
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: fd });
      const up = await uploadRes.json();
      if (!uploadRes.ok || up.error) {
        alert(up.error?.message || "Upload failed");
        return;
      }
      const next = [
        ...attachments,
        { filename: up.original_filename || file.name, url: up.secure_url },
      ];
      setAttachments(next);
      await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attachments: next }),
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch (e) {
      alert("Unexpected upload error");
    } finally {
      setUploading(false);
    }
  }

  async function saveRecurring(e) {
    e.preventDefault();
    const payload = { ...recurring };
    if (payload.endDate && typeof payload.endDate === "string") payload.endDate = new Date(payload.endDate);
    await fetch(`/api/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recurring: payload }),
    });
    router.refresh();
  }

  const tabs = ["details", "subtasks", "comments", "checklist", "attachments", "dependencies", "recurring", "chat"];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">{task.title}</h2>
            <TaskTimer taskId={task._id} projectId={task.project?._id || task.project} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex border-b border-neutral-800">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-sm ${activeTab === t ? "border-b-2 border-white" : "text-gray-400"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <p className="text-sm">{task.description || "No description"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Status</label>
                  <p className="text-sm">{task.status}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Priority</label>
                  <p className="text-sm">{task.priority}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <p className="text-sm">{task.taskType}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Due Date</label>
                  <p className="text-sm">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Assignee</label>
                  <p className="text-sm">{task.assignee?.username || "Unassigned"}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Progress</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-neutral-800 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${task.progress || 0}%` }} />
                    </div>
                    <span className="text-sm">{task.progress || 0}%</span>
                  </div>
                </div>
              </div>
              {task.tags?.length > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded bg-neutral-800">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "subtasks" && (
            <SubtaskTree taskId={task._id} users={users} projectId={task.project?._id || task.project} />
          )}

          {activeTab === "comments" && (
            <ThreadedComments
              comments={comments}
              onAddComment={addComment}
              onReply={handleReply}
              onReact={handleReact}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              currentUserId={currentUser?._id}
              users={users}
            />
          )}

          {activeTab === "checklist" && (
            <div className="space-y-3">
              <form onSubmit={addChecklistItem} className="flex items-end gap-2 p-3 rounded border border-neutral-800">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">New item</label>
                  <input value={newChecklistText} onChange={(e)=>setNewChecklistText(e.target.value)} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" placeholder="Describe the step" />
                </div>
                <button className="bg-white text-black px-3 py-2 rounded">Add</button>
              </form>
              {checklist.length > 0 ? (
                checklist.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border border-neutral-800">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(i)}
                      />
                      <span className={`text-sm ${item.completed ? "line-through text-gray-500" : ""}`}>{item.text}</span>
                    </label>
                    <button onClick={() => removeChecklistItem(i)} className="text-xs text-red-400 underline">Remove</button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400">No checklist items.</div>
              )}
              {checklist.length > 0 && (
                <div className="pt-2 text-sm text-gray-400">
                  {checklist.filter((x) => x.completed).length} of {checklist.length} completed
                </div>
              )}
            </div>
          )}

          {activeTab === "attachments" && (
            <div className="space-y-2">
              <form onSubmit={addAttachment} className="flex items-end gap-2 p-3 rounded border border-neutral-800">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Filename</label>
                  <input value={newAttachment.filename} onChange={(e)=>setNewAttachment({...newAttachment, filename: e.target.value})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">URL</label>
                  <input value={newAttachment.url} onChange={(e)=>setNewAttachment({...newAttachment, url: e.target.value})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
                </div>
                <button className="bg-white text-black px-3 py-2 rounded">Add</button>
              </form>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" className="hidden" onChange={onUploadAttachmentChange} />
                <button type="button" onClick={()=>fileInputRef.current?.click()} disabled={uploading} className="bg-white text-black px-3 py-2 rounded">
                  {uploading ? "Uploading..." : "Upload File"}
                </button>
                <span className="text-xs text-gray-500">Uploads are stored in Cloudinary and added as task attachments.</span>
              </div>
              {task.attachments?.length > 0 ? (
                attachments.map((a, i) => {
                  const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url || "");
                  return (
                    <div key={i} className="p-3 rounded border border-neutral-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{a.filename}</span>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Open</a>
                      </div>
                      {isImage && (
                        <img src={a.url} alt={a.filename} className="max-h-40 rounded border border-neutral-900" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400">No attachments.</div>
              )}
            </div>
          )}

          {activeTab === "dependencies" && (
            <div className="space-y-3">
              <div className="text-sm text-gray-400">Select tasks that must be completed before this task can proceed.</div>
              <div className="max-h-64 overflow-y-auto p-2 rounded border border-neutral-800">
                {projectTasks.map((t) => (
                  <label key={t._id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={dependencies.includes(t._id)}
                      onChange={(e)=>{
                        setDependencies((prev)=>
                          e.target.checked ? [...prev, t._id] : prev.filter((id)=>id!==t._id)
                        );
                      }}
                      disabled={t._id === task._id}
                    />
                    <span>{t.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 ml-auto">{t.status}</span>
                  </label>
                ))}
                {projectTasks.length === 0 && <div className="text-sm text-gray-400">No tasks in this project.</div>}
              </div>
              <button onClick={saveDependencies} className="bg-white text-black px-4 py-2 rounded">Save Dependencies</button>
              <div className="text-xs text-gray-500">Blocking enforced: cannot move to In Progress/Review/Completed when blockers remain.</div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="h-[500px]">
              <ProjectChat projectId={task.project?._id || task.project} taskId={task._id} />
            </div>
          )}

          {activeTab === "recurring" && (
            <form onSubmit={saveRecurring} className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!recurring.enabled} onChange={(e)=>setRecurring({...recurring, enabled: e.target.checked})} /> Enable Recurring
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm mb-1">Frequency</label>
                  <select value={recurring.frequency || "weekly"} onChange={(e)=>setRecurring({...recurring, frequency: e.target.value})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Interval</label>
                  <input type="number" value={recurring.interval || 1} onChange={(e)=>setRecurring({...recurring, interval: Number(e.target.value)||1})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
                </div>
                <div>
                  <label className="block text-sm mb-1">End Date (optional)</label>
                  <input type="date" value={recurring.endDate ? new Date(recurring.endDate).toISOString().slice(0,10) : ""} onChange={(e)=>setRecurring({...recurring, endDate: e.target.value})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" />
                </div>
              </div>
              <div>
                <button className="bg-white text-black px-4 py-2 rounded">Save Recurring</button>
              </div>
              <div className="text-xs text-gray-500">Global generator endpoint available: POST /api/tasks/recurring/run</div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
