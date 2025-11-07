import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "in_progress", "review", "completed", "blocked"];

function StatusHeader({ s }) {
  const labels = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Completed", blocked: "Blocked" };
  return <div className="text-xs uppercase tracking-wide text-gray-400">{labels[s] || s}</div>;
}

export default async function KanbanBoardPage() {
  await connectToDatabase();
  const tasks = await Task.find({ parentTask: null })
    .select("title status project assignee dueDate priority")
    .populate("project", "title")
    .populate("assignee", "username")
    .lean();

  const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
  tasks.forEach((t) => { grouped[t.status] = grouped[t.status] || []; grouped[t.status].push(t); });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kanban Board</h1>
        <a href="/admin/tasks" className="text-sm underline text-gray-400">Back to Tasks</a>
      </div>
      {/* @ts-expect-error Server Component includes client child */}
      <Board initial={grouped} />
    </div>
  );
}

// Client subcomponent
function BoardClient({ initial }) {
  const [columns, setColumns] = React.useState(initial);

  async function onDrop(e, status) {
    const id = e.dataTransfer.getData("text/plain");
    e.preventDefault();
    if (!id) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      // Optimistic move
      setColumns((prev) => {
        const next = { ...prev };
        for (const s of Object.keys(next)) next[s] = next[s].filter((t) => String(t._id) !== id);
        const moved = Object.values(prev).flat().find((t) => String(t._id) === id);
        if (moved) next[status] = [{ ...moved, status }, ...next[status]];
        return next;
      });
    } catch {}
  }

  function allowDrop(e) { e.preventDefault(); }

  function Card({ t }) {
    function onDragStart(e) { e.dataTransfer.setData("text/plain", String(t._id)); }
    return (
      <div draggable onDragStart={onDragStart} className="p-3 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 cursor-grab">
        <div className="text-sm font-medium truncate">{t.title}</div>
        <div className="text-xs text-gray-400 mt-1">{t.project?.title || ""}</div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-neutral-800">{t.priority}</span>
          <span>{t.assignee?.username || "—"}</span>
          <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {Object.keys(columns).map((s) => (
        <div key={s} className="rounded border border-neutral-800">
          <div className="p-3 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between">
            <StatusHeader s={s} />
            <span className="text-xs text-gray-400">{columns[s].length}</span>
          </div>
          <div onDrop={(e)=>onDrop(e,s)} onDragOver={allowDrop} className="p-3 space-y-2 min-h-[200px]">
            {columns[s].map((t) => (<Card key={t._id} t={t} />))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Minimal bridge to satisfy Next server/client segregation
import React from "react";
function Board({ initial }) { return <BoardClient initial={initial} />; }
