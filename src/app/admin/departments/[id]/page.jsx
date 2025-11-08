import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import User from "@/models/User";
import Link from "next/link";
import DepartmentSettingsForm from "@/components/admin/departments/department-settings-form";
import DepartmentKpisForm from "@/components/admin/departments/department-kpis-form";
import DepartmentMergeForm from "@/components/admin/departments/department-merge-form";
import { notFound } from "next/navigation";

function Card({ title, children }) {
  return (
    <div className="p-4 rounded border border-neutral-800">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default async function DepartmentDetailPage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  const dep = await Department.findById(id)
    .populate("head", "username email")
    .populate("managers", "username email")
    .lean();
  if (!dep) return notFound();

  const [members, otherDepartments, teams] = await Promise.all([
    User.find({ department: id }).select("username email roles team").populate("team", "name").lean(),
    Department.find({ _id: { $ne: id }, archived: { $ne: true } }).select("name").sort({ name: 1 }).lean(),
    Team.find({ department: id }).select("name lead").populate("lead", "username").lean(),
  ]);

  // Lightweight analytics (aligns with /api/departments/[id]/analytics)
  const totals = {
    members: members.length,
    online: members.filter((m) => m.isOnline).length,
    teams: teams.length,
    hasHead: !!dep.head,
    managers: (dep.managers || []).length,
  };

  const byRole = {};
  for (const m of members) {
    for (const r of m.roles || []) byRole[r] = (byRole[r] || 0) + 1;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Department: {dep.name}</h1>
        <Link href="/admin/departments" className="underline">Back</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Settings">
            <DepartmentSettingsForm department={JSON.parse(JSON.stringify(dep))} members={JSON.parse(JSON.stringify(members))} otherDepartments={JSON.parse(JSON.stringify(otherDepartments))} />
          </Card>

          <Card title="KPIs">
            <DepartmentKpisForm departmentId={dep._id.toString()} initial={dep.kpis || []} />
          </Card>

          <Card title="Analytics">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded bg-neutral-900 border border-neutral-800">Members<br/><span className="text-2xl font-semibold">{totals.members}</span></div>
              <div className="p-3 rounded bg-neutral-900 border border-neutral-800">Teams<br/><span className="text-2xl font-semibold">{totals.teams}</span></div>
              <div className="p-3 rounded bg-neutral-900 border border-neutral-800">Managers<br/><span className="text-2xl font-semibold">{totals.managers}</span></div>
              <div className="p-3 rounded bg-neutral-900 border border-neutral-800">Has Head<br/><span className="text-2xl font-semibold">{totals.hasHead ? 'Yes' : 'No'}</span></div>
            </div>
            <div className="mt-4">
              <h3 className="mb-2">By Role</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.keys(byRole).length ? (
                  Object.entries(byRole).map(([role, count]) => (
                    <span key={role} className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800">{role}: {count}</span>
                  ))
                ) : (
                  <span className="text-gray-400">No roles assigned</span>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Merge Department">
            <DepartmentMergeForm sourceId={dep._id.toString()} departments={JSON.parse(JSON.stringify(otherDepartments))} />
          </Card>

          <Card title="Org Chart">
            <Link className="underline" href={`/admin/departments/${dep._id}/org`}>View Org Chart</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
