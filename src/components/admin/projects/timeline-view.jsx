"use client";
import { useMemo } from "react";

export default function TimelineView({ project, milestones, tasks, phases = [] }) {
  const projectStart = project.startDate ? new Date(project.startDate) : new Date();
  const projectEnd = project.endDate ? new Date(project.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.max(1, Math.ceil((projectEnd - projectStart) / (24 * 60 * 60 * 1000)));

  function getPosition(date) {
    if (!date) return 0;
    const d = new Date(date);
    const days = Math.ceil((d - projectStart) / (24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }

  function widthBetween(start, end) {
    const s = getPosition(start);
    const e = getPosition(end);
    return Math.max(2, Math.min(100, e - s));
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  }

  const prettyStatus = {
    planning: "Planning",
    on_track: "On Track",
    at_risk: "At Risk",
    delayed: "Delayed",
    completed: "Completed",
    on_hold: "On Hold",
    cancelled: "Cancelled",
  };

  const statusColor = {
    on_track: "bg-green-600",
    at_risk: "bg-yellow-600",
    delayed: "bg-red-600",
    completed: "bg-blue-600",
    planning: "bg-gray-600",
    on_hold: "bg-gray-600",
    cancelled: "bg-gray-700",
  };

  const phaseItems = (phases || []).filter(p => p.startDate && p.endDate).map(p => ({
    _id: p._id,
    type: "phase",
    title: p.title,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status || "planned",
  }));

  const milestoneItems = (milestones || []).filter(m => m.dueDate).map(m => ({
    _id: m._id,
    type: "milestone",
    title: m.title,
    dueDate: m.dueDate,
    status: m.status || "pending",
  }));

  const taskItems = (tasks || []).filter(t => t.dueDate).map(t => ({
    _id: t._id,
    type: "task",
    title: t.title,
    dueDate: t.dueDate,
    status: t.status || "todo",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-3">
          <div>Project Timeline: {formatDate(projectStart)} - {formatDate(projectEnd)} ({totalDays} days)</div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${statusColor[project.status] || "bg-gray-600"}`} />
            <span className="text-xs">{prettyStatus[project.status] || project.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 inline-block rounded-sm"/> Milestone</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-purple-600 inline-block rounded-sm"/> Phase</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-green-600 inline-block rounded-sm"/> Task</span>
        </div>
      </div>

      <div className="relative bg-neutral-900 rounded p-4 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Timeline ruler */}
          <div className="mb-6 pb-2 border-b border-neutral-800 text-xs text-gray-500">
            <div className="flex items-center justify-between">
              <div>{formatDate(projectStart)}</div>
              <div>Today</div>
              <div>{formatDate(projectEnd)}</div>
            </div>
            {/* Week grid lines */}
            <div className="relative h-0">
              {useMemo(() => {
                const ticks = [];
                const d = new Date(projectStart);
                // align to week start (Sunday)
                d.setDate(d.getDate() - d.getDay());
                while (d <= projectEnd) {
                  ticks.push(new Date(d));
                  d.setDate(d.getDate() + 7);
                }
                return ticks.map((t, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-neutral-800 opacity-60" style={{ left: `${getPosition(t)}%` }} />
                ));
              }, [projectStart, projectEnd, totalDays])}
            </div>
          </div>

          <div className="space-y-4">
            {/* Phases as ranges */}
            {phaseItems.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 mb-2">Phases</div>
                <div className="space-y-3">
                  {phaseItems.map((p) => (
                    <div key={`phase-${p._id}`} className="relative">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800">Phase</span>
                        <span className="text-sm">{p.title}</span>
                        <span className="text-xs text-gray-500">{formatDate(p.startDate)} → {formatDate(p.endDate)}</span>
                      </div>
                      <div className="relative h-6 bg-neutral-800 rounded">
                        <div
                          className={`absolute h-full rounded ${"bg-purple-600"}`}
                          style={{ left: `${getPosition(p.startDate)}%`, width: `${widthBetween(p.startDate, p.endDate)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Milestones and Tasks */}
            <div>
              <div className="text-xs text-gray-400 mb-2">Milestones & Tasks</div>
              <div className="space-y-3">
                {[...milestoneItems, ...taskItems].map((item) => {
                  const pos = getPosition(item.dueDate);
                  const isMilestone = item.type === "milestone";
                  return (
                    <div key={`${item.type}-${item._id}`} className="relative">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${isMilestone ? "bg-blue-800" : "bg-neutral-800"}`}>
                          {isMilestone ? "Milestone" : "Task"}
                        </span>
                        <span className="text-sm">{item.title}</span>
                        <span className="text-xs text-gray-500">{formatDate(item.dueDate)}</span>
                      </div>
                      <div className="relative h-6 bg-neutral-800 rounded">
                        <div
                          className={`absolute h-full rounded ${isMilestone ? "bg-blue-600" : "bg-green-600"}`}
                          style={{ left: `${Math.max(0, pos - (isMilestone ? 0.5 : 2))}%`, width: isMilestone ? "2px" : `${Math.min(4, 100 - pos)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(milestoneItems.length + taskItems.length === 0) && (
                  <div className="p-8 text-center text-gray-400">No items yet. Add milestones or tasks with due dates.</div>
                )}
              </div>
            </div>
          </div>

          {/* Today marker */}
          <div className="absolute top-20 bottom-0 border-l-2 border-yellow-500" style={{ left: `${getPosition(new Date())}%` }} />
        </div>
      </div>
    </div>
  );
}
