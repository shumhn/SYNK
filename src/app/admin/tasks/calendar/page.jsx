import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

export default async function CalendarViewPage({ searchParams }) {
  await connectToDatabase();
  const now = new Date();
  const monthParam = searchParams?.month; // YYYY-MM
  const base = monthParam ? new Date(`${monthParam}-01T00:00:00`) : now;
  const from = startOfMonth(base);
  const to = endOfMonth(base);

  const tasks = await Task.find({ dueDate: { $gte: from, $lte: to }, parentTask: null })
    .select("title dueDate status project")
    .populate("project", "title")
    .sort({ dueDate: 1 })
    .lean();

  const daysInMonth = to.getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const byDay = Object.fromEntries(days.map((d) => [d, []]));
  tasks.forEach((t) => { const day = new Date(t.dueDate).getDate(); if (byDay[day]) byDay[day].push(t); });

  const ym = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(base); prev.setMonth(prev.getMonth() - 1);
  const next = new Date(base); next.setMonth(next.getMonth() + 1);
  const ymPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const ymNext = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2 text-sm">
          <a className="underline text-gray-400" href={`/admin/tasks/calendar?month=${ymPrev}`}>Prev</a>
          <span className="text-gray-300">{ym}</span>
          <a className="underline text-gray-400" href={`/admin/tasks/calendar?month=${ymNext}`}>Next</a>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <div key={d} className="min-h-[120px] p-2 rounded border border-neutral-800">
            <div className="text-xs text-gray-400 mb-1">{d}</div>
            <div className="space-y-1">
              {(byDay[d] || []).map((t) => (
                <div key={t._id} className="text-xs p-1 rounded bg-neutral-900 border border-neutral-800">
                  <div className="truncate">{t.title}</div>
                  <div className="text-[10px] text-gray-500">{t.project?.title || ""} • {t.status}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
