import connectToDatabase from "@/lib/db/mongodb";
import Team from "@/models/Team";
import CreateTeamForm from "@/components/admin/teams/create-team-form";
import TeamsTableClient from "@/components/admin/teams/teams-table-client";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

export default async function AdminTeamsPage({ searchParams }) {
  await connectToDatabase();
  const resolvedSearchParams = await searchParams;
  const departmentId = typeof resolvedSearchParams?.department === "string" ? resolvedSearchParams.department : "";
  const filter = departmentId ? { department: departmentId } : {};
  const teams = await Team.find(filter).populate("department", "name").sort({ createdAt: -1 }).lean();
  const safeTeams = teams.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    description: t.description || "",
    createdAt: t.createdAt,
    department: t.department ? { _id: t.department._id?.toString?.() || "", name: t.department.name } : null,
  }));
  const rawDepartments = await (await import("@/models/Department")).default
    .find()
    .select("name")
    .sort({ name: 1 })
    .lean();
  const departments = rawDepartments.map((d) => ({ _id: d._id.toString(), name: d.name }));

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

      <TeamsTableClient teams={safeTeams} departments={departments} />
    </div>
  );
}
