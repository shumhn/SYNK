"use client";

import { useState, useEffect } from "react";
import ProjectChat from "@/components/chat/project-chat";
import { useRouter } from "next/navigation";

export default function TaskDetailModal({ task, onClose }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  const [subtasks, setSubtasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentFile, setCommentFile] = useState({ filename: "", url: "" });
  const [checklist, setChecklist] = useState(task.checklist || []);
  const [newSubtask, setNewSubtask] = useState({ title: "", assignee: "", estimatedHours: 0 });
  const [projectTasks, setProjectTasks] = useState([]);
  const [dependencies, setDependencies] = useState(task.dependencies || []);
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [newAttachment, setNewAttachment] = useState({ filename: "", url: "" });
  const [recurring, setRecurring] = useState(task.recurring || { enabled: false, frequency: "weekly", interval: 1, endDate: "" });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadSubtasks();
    loadComments();
    loadProjectTasks();
    loadUsers();
  }, [task._id]);

  async function loadSubtasks() {
    try {
      const res = await fetch(`/api/tasks/${task._id}/subtasks`);
      const data = await res.json();
      if (!data.error) setSubtasks(data.data);
    } catch (e) {}
  }

  async function loadUsers() {
    try {
      const res = await fetch(`/api/users`);
      const data = await res.json();
      if (!data.error) setUsers(data.data || []);
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

  async function addComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          attachments: commentFile.filename && commentFile.url ? [{ filename: commentFile.filename, url: commentFile.url }] : [],
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setComments([...comments, data.data]);
        setCommentText("");
        setCommentFile({ filename: "", url: "" });
      }
    } catch (e) {}
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

  async function createSubtask(e) {
    e.preventDefault();
    if (!newSubtask.title.trim()) return;
    await fetch(`/api/tasks/${task._id}/subtasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: newSubtask.title, assignee: newSubtask.assignee || undefined, estimatedHours: Number(newSubtask.estimatedHours) || undefined }),
    });
    setNewSubtask({ title: "", assignee: "", estimatedHours: 0 });
    loadSubtasks();
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
          <h2 className="text-lg font-semibold">{task.title}</h2>
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
            <div className="space-y-3">
              <form onSubmit={createSubtask} className="flex items-end gap-2 p-3 rounded border border-neutral-800">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Title</label>
                  <input value={newSubtask.title} onChange={(e)=>setNewSubtask({...newSubtask, title: e.target.value})} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Assignee</label>
                  <select value={newSubtask.assignee} onChange={(e)=>setNewSubtask({...newSubtask, assignee: e.target.value})} className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700">
                    <option value="">—</option>
                    {users.map((u)=>(<option key={u._id} value={u._id}>{u.username}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Est. Hours</label>
                  <input type="number" value={newSubtask.estimatedHours} onChange={(e)=>setNewSubtask({...newSubtask, estimatedHours: e.target.value})} className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 w-28" />
                </div>
                <button className="bg-white text-black px-3 py-2 rounded">Add</button>
              </form>
              {subtasks.length > 0 ? (
                subtasks.map((st) => (
                  <div key={st._id} className="p-3 rounded border border-neutral-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{st.title}</span>
                      <span className="text-xs px-2 py-1 rounded bg-neutral-800">{st.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{st.description || "No description"}</p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400">No subtasks yet.</div>
              )}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.author?.username || "Unknown"}</div>
                      <div className="text-sm text-gray-300 mt-1">{c.content}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(c.createdAt).toLocaleString()}</div>
                      {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {c.attachments.map((a, i) => {
                            const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(a.url || "");
                            return (
                              <div key={i} className="p-2 rounded border border-neutral-800">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs">{a.filename}</span>
                                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs underline">Open</a>
                                </div>
                                {isImage && (
                                  <img src={a.url} alt={a.filename} className="mt-2 max-h-40 rounded border border-neutral-900" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <div className="p-8 text-center text-gray-400">No comments yet.</div>}
              </div>
              <form onSubmit={addComment} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  />
                  <button className="bg-white text-black px-4 py-2 rounded">Post</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={commentFile.filename}
                    onChange={(e)=>setCommentFile({...commentFile, filename: e.target.value})}
                    placeholder="Attachment filename (optional)"
                    className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  />
                  <input
                    value={commentFile.url}
                    onChange={(e)=>setCommentFile({...commentFile, url: e.target.value})}
                    placeholder="Attachment URL (optional)"
                    className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
                  />
                </div>
                <div className="text-xs text-gray-500">Add an optional attachment by providing filename and URL. Images will preview.</div>
              </form>
            </div>
          )}

          {activeTab === "checklist" && (
            <div className="space-y-2">
              {checklist.length > 0 ? (
                checklist.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(i)}
                    />
                    <span className={`text-sm ${item.completed ? "line-through text-gray-500" : ""}`}>{item.text}</span>
                  </label>
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
