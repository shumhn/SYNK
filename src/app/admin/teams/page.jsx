import connectToDatabase from "@/lib/db/mongodb";
import Team from "@/models/Team";
import CreateTeamForm from "@/components/admin/teams/create-team-form";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default async function AdminTeamsPage({ searchParams }) {
  await connectToDatabase();
  const departmentId = typeof searchParams?.department === "string" ? searchParams.department : "";
  const filter = departmentId ? { department: departmentId } : {};
  const teams = await Team.find(filter).populate("department", "name").sort({ createdAt: -1 }).lean();
  const departments = await (await import("@/models/Department")).default.find().select("name").sort({ name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teams</h1>
        <CreateTeamForm departments={departments} />
      </div>

      <form className="flex gap-2" action="/admin/teams" method="get">
        <select name="department" defaultValue={departmentId} className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <button className="px-3 py-2 rounded bg-white text-black">Filter</button>
      </form>

      <div className="overflow-x-auto rounded border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Department</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t._id} className="border-t border-neutral-800">
                <td className="p-3">{t.name}</td>
                <td className="p-3 text-gray-300">{t.department?.name || "-"}</td>
                <td className="p-3 text-gray-300">{t.description || "-"}</td>
                <td className="p-3 text-gray-300">{formatDate(t.createdAt)}</td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-400" colSpan={4}>No teams found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
