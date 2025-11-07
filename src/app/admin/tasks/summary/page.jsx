import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import Project from "@/models/Project";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export default async function TasksSummaryPage() {
  await connectToDatabase();
  const now = new Date();

  const [total, byStatusAgg, blocked, overdue, dueThisWeek, perProjectAgg, perAssigneeAgg] = await Promise.all([
    Task.countDocuments({ parentTask: null }),
    Task.aggregate([
      { $match: { parentTask: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.countDocuments({ parentTask: null, status: "blocked" }),
    Task.countDocuments({ parentTask: null, status: { $ne: "completed" }, dueDate: { $lt: now } }),
    Task.countDocuments({ parentTask: null, status: { $ne: "completed" }, dueDate: { $gte: now, $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7) } }),
    Task.aggregate([
      { $match: { parentTask: null } },
      { $group: { _id: "$project", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Task.aggregate([
      { $match: { parentTask: null } },
      { $group: { _id: "$assignee", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const byStatus = Object.fromEntries(byStatusAgg.map((d) => [d._id || "unknown", d.count]));

  // hydrate project and user names
  const projectIds = perProjectAgg.map((d) => d._id).filter(Boolean);
  const userIds = perAssigneeAgg.map((d) => d._id).filter(Boolean);
  const [projects, users] = await Promise.all([
    Project.find({ _id: { $in: projectIds } }).select("title").lean(),
    User.find({ _id: { $in: userIds } }).select("username").lean(),
  ]);
  const projectMap = new Map(projects.map((p) => [String(p._id), p.title]));
  const userMap = new Map(users.map((u) => [String(u._id), u.username]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks Dashboard Summary</h1>
        <div className="flex items-center gap-2 text-sm">
          <a href="/admin/tasks" className="underline text-gray-400">List</a>
          <a href="/admin/tasks/board" className="underline text-gray-400">Board</a>
          <a href="/admin/tasks/calendar" className="underline text-gray-400">Calendar</a>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Total Tasks" value={total} />
        <Card label="Blocked" value={blocked} />
        <Card label="Overdue" value={overdue} />
        <Card label="Due Next 7 Days" value={dueThisWeek} />
      </section>

      <section>
        <h3 className="font-semibold mb-2">By Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(byStatus).map(([s, c]) => (
            <Card key={s} label={s.replace("_", " ")} value={c} />
          ))}
          {Object.keys(byStatus).length === 0 && <div className="text-sm text-gray-400">No data</div>}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Top Projects by Task Count</h3>
          <div className="space-y-2">
            {perProjectAgg.map((d) => (
              <Row key={String(d._id)} name={projectMap.get(String(d._id)) || "Unassigned"} value={d.count} />
            ))}
            {perProjectAgg.length === 0 && <div className="text-sm text-gray-400">No data</div>}
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Top Assignees by Task Count</h3>
          <div className="space-y-2">
            {perAssigneeAgg.map((d) => (
              <Row key={String(d._id)} name={userMap.get(String(d._id)) || "Unassigned"} value={d.count} />
            ))}
            {perAssigneeAgg.length === 0 && <div className="text-sm text-gray-400">No data</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="p-4 rounded border border-neutral-800">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Row({ name, value }) {
  return (
    <div className="flex items-center justify-between p-3 rounded border border-neutral-800">
      <div className="text-sm">{name}</div>
      <div className="text-sm text-gray-300">{value}</div>
    </div>
  );
}
