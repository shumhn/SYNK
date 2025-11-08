import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Link from "next/link";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString();
}

function StatusBadge({ status }) {
  const colors = {
    planning: "bg-gray-700 text-gray-200",
    on_track: "bg-green-700 text-green-100",
    at_risk: "bg-yellow-700 text-yellow-100",
    delayed: "bg-red-700 text-red-100",
    completed: "bg-blue-700 text-blue-100",
    on_hold: "bg-gray-700 text-gray-300",
    cancelled: "bg-gray-800 text-gray-400",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[status] || colors.planning}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

export default async function ProjectsListPage({ searchParams }) {
  await connectToDatabase();
  const resolvedSearchParams = await searchParams;
  const status = resolvedSearchParams?.status;
  const filter = status ? { status, archived: false } : { archived: false };
  const projects = await Project.find(filter)
    .select("title description status progress startDate endDate departments managers createdAt")
    .populate("departments", "name")
    .populate("managers", "username")
    .sort({ createdAt: -1 })
    .lean();

  const statusOptions = ["planning", "on_track", "at_risk", "delayed", "completed", "on_hold", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Link href="/admin/projects/new" className="bg-white text-black px-3 py-2 rounded">New Project</Link>
      </div>

      <form className="flex gap-2" action="/admin/projects" method="get">
        <select name="status" defaultValue={status || ""} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <button className="px-3 py-2 rounded bg-white text-black">Filter</button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link key={p._id} href={`/admin/projects/${p._id}`} className="block p-4 rounded border border-neutral-800 hover:border-neutral-700 transition">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold truncate">{p.title}</h3>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{p.description || "No description"}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Progress: {p.progress}%</div>
              <div>Managers: {(p.managers || []).map((m) => m.username).join(", ") || "—"}</div>
              <div>Departments: {(p.departments || []).map((d) => d.name).join(", ") || "—"}</div>
              <div>Due: {formatDate(p.endDate)}</div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400 border border-neutral-800 rounded">
            No projects found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
