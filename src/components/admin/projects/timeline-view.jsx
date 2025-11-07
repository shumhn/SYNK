"use client";

export default function TimelineView({ project, milestones, tasks }) {
  const projectStart = project.startDate ? new Date(project.startDate) : new Date();
  const projectEnd = project.endDate ? new Date(project.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const totalDays = Math.max(1, Math.ceil((projectEnd - projectStart) / (24 * 60 * 60 * 1000)));

  function getPosition(date) {
    if (!date) return 0;
    const d = new Date(date);
    const days = Math.ceil((d - projectStart) / (24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(100, (days / totalDays) * 100));
  }

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  }

  const items = [
    ...milestones.map((m) => ({ ...m, type: "milestone" })),
    ...tasks.map((t) => ({ ...t, type: "task" })),
  ].filter((i) => i.dueDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>Project Timeline: {formatDate(projectStart)} - {formatDate(projectEnd)}</div>
        <div>{totalDays} days</div>
      </div>

      <div className="relative bg-neutral-900 rounded p-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline ruler */}
          <div className="flex justify-between mb-6 pb-2 border-b border-neutral-800 text-xs text-gray-500">
            <div>{formatDate(projectStart)}</div>
            <div>Today</div>
            <div>{formatDate(projectEnd)}</div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.length > 0 ? (
              items.map((item) => {
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
                        style={{
                          left: `${Math.max(0, pos - 2)}%`,
                          width: isMilestone ? "4px" : `${Math.min(5, 100 - pos)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400">No timeline items yet. Add milestones or tasks with due dates.</div>
            )}
          </div>

          {/* Today marker */}
          <div className="absolute top-20 bottom-0 border-l-2 border-yellow-500" style={{ left: `${getPosition(new Date())}%` }} />
        </div>
      </div>
    </div>
  );
}
