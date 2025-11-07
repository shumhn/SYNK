import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import User from "@/models/User";
import Link from "next/link";
import { notFound } from "next/navigation";

function RoleChip({ text }) {
  return <span className="text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">{text}</span>;
}

export default async function OrgChartPage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  const dep = await Department.findById(id)
    .populate("head", "username email image roles")
    .populate("managers", "username email image roles")
    .lean();
  if (!dep) return notFound();

  const [teams, members] = await Promise.all([
    Team.find({ department: id }).select("name lead").populate("lead", "username email image roles").lean(),
    User.find({ department: id }).select("username email image roles team").populate("team", "name").lean(),
  ]);

  const membersByTeam = new Map();
  for (const t of teams) membersByTeam.set(t._id.toString(), []);
  const unassigned = [];
  for (const m of members) {
    if (m.team) {
      const k = m.team._id.toString();
      (membersByTeam.get(k) || []).push(m);
    } else {
      unassigned.push(m);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Org Chart: {dep.name}</h1>
        <Link href={`/admin/departments/${dep._id}`} className="underline">Back to Department</Link>
      </div>

      <div className="space-y-4">
        <section className="p-4 rounded border border-neutral-800">
          <h2 className="text-lg font-semibold mb-3">Head</h2>
          {dep.head ? (
            <PersonRow person={dep.head} badges={["head"]} />
          ) : (
            <div className="text-sm text-gray-400">No head assigned</div>
          )}
        </section>

        <section className="p-4 rounded border border-neutral-800">
          <h2 className="text-lg font-semibold mb-3">Managers</h2>
          <div className="space-y-2">
            {(dep.managers || []).length ? (
              dep.managers.map((m) => <PersonRow key={m._id} person={m} badges={["manager"]} />)
            ) : (
              <div className="text-sm text-gray-400">No managers assigned</div>
            )}
          </div>
        </section>

        <section className="p-4 rounded border border-neutral-800">
          <h2 className="text-lg font-semibold mb-3">Teams</h2>
          <div className="space-y-6">
            {teams.map((t) => (
              <div key={t._id} className="border border-neutral-800 rounded">
                <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-300">Lead: {t.lead ? t.lead.username : "—"}</div>
                </div>
                <div className="p-4 space-y-2">
                  {membersByTeam.get(t._id.toString())?.length ? (
                    membersByTeam.get(t._id.toString()).map((m) => <PersonRow key={m._id} person={m} />)
                  ) : (
                    <div className="text-sm text-gray-400">No members</div>
                  )}
                </div>
              </div>
            ))}
            {teams.length === 0 && <div className="text-sm text-gray-400">No teams in this department</div>}
          </div>
        </section>

        <section className="p-4 rounded border border-neutral-800">
          <h2 className="text-lg font-semibold mb-3">Unassigned Members</h2>
          <div className="space-y-2">
            {unassigned.length ? (
              unassigned.map((m) => <PersonRow key={m._id} person={m} />)
            ) : (
              <div className="text-sm text-gray-400">No unassigned members</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PersonRow({ person, badges = [] }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-neutral-800 rounded px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-neutral-800" />
        <div>
          <div className="text-sm">{person.username}</div>
          <div className="text-xs text-gray-400">{person.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {(person.roles || []).map((r) => <RoleChip key={r} text={r} />)}
        {badges.map((b) => <RoleChip key={b} text={b} />)}
      </div>
    </div>
  );
}
