"use client";

import { useRouter } from "next/navigation";
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

export default function ProjectsListClient({ projects = [], departments = [], managers = [], filters = {} }) {
  const router = useRouter();

  function updateFilter(key, value) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  }

  function toggleArchived() {
    const params = new URLSearchParams(window.location.search);
    if (filters.showArchived) {
      params.delete("archived");
    } else {
      params.set("archived", "true");
    }
    router.push(`?${params.toString()}`);
  }

  const statusOptions = ["planning", "on_track", "at_risk", "delayed", "completed", "on_hold", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">{projects.length} projects found</p>
        </div>
        <Link href="/admin/projects/new" className="bg-white text-black px-3 py-2 rounded">
          New Project
        </Link>
      </div>

      <div className="p-4 rounded border border-neutral-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Search projects..."
            defaultValue={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          />
          <select
            defaultValue={filters.status || ""}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            defaultValue={filters.department || ""}
            onChange={(e) => updateFilter("department", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            defaultValue={filters.manager || ""}
            onChange={(e) => updateFilter("manager", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="">All Managers</option>
            {managers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.username}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <select
            defaultValue={filters.sortBy || "createdAt"}
            onChange={(e) => updateFilter("sort", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="createdAt">Sort: Created Date</option>
            <option value="title">Sort: Title</option>
            <option value="progress">Sort: Progress</option>
            <option value="endDate">Sort: Due Date</option>
            <option value="status">Sort: Status</option>
          </select>
          <select
            defaultValue={filters.sortOrder || "desc"}
            onChange={(e) => updateFilter("order", e.target.value)}
            className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded bg-neutral-900 border border-neutral-800 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showArchived || false}
              onChange={toggleArchived}
            />
            <span className="text-sm">Show Archived</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link
            key={p._id}
            href={`/admin/projects/${p._id}`}
            className="block p-4 rounded border border-neutral-800 hover:border-neutral-700 transition"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold truncate">{p.title}</h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {p.archived && (
                  <span className="text-xs px-2 py-1 rounded bg-neutral-800 text-gray-500">Archived</span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-3 line-clamp-2">
              {p.description || "No description"}
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex items-center gap-2">
                <span>Progress: {p.progress}%</span>
                <div className="flex-1 bg-neutral-800 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${p.progress || 0}%` }}
                  />
                </div>
              </div>
              <div>
                Managers: {(p.managers || []).map((m) => m.username).join(", ") || "—"}
              </div>
              <div>
                Departments: {(p.departments || []).map((d) => d.name).join(", ") || "—"}
              </div>
              <div>Due: {formatDate(p.endDate)}</div>
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-400 border border-neutral-800 rounded">
            No projects found. Try adjusting your filters or create a new project.
          </div>
        )}
      </div>
    </div>
  );
}
