import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import User from "@/models/User";
import Link from "next/link";
import OrgTreeClient from "@/components/admin/departments/OrgTreeClient";
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

  // Build hierarchical tree: Department -> Head -> Managers + Teams -> Leads/Members
  const root = {
    title: dep.name,
    subtitle: "Department",
    badges: ["department"],
    children: [],
  };

  const headNode = dep.head
    ? { title: dep.head.username, subtitle: dep.head.email, badges: [...(dep.head.roles || []), "head"], children: [] }
    : null;

  const managerNodes = (dep.managers || []).map((m) => ({
    title: m.username,
    subtitle: m.email,
    badges: [...(m.roles || []), "manager"],
    children: [],
  }));

  const teamNodes = teams.map((t) => ({
    title: t.name,
    subtitle: "Team",
    badges: ["team"],
    children: [
      t.lead ? { title: t.lead.username, subtitle: t.lead.email, badges: [...(t.lead.roles || []), "lead"], children: [] } : null,
      ...((membersByTeam.get(t._id.toString()) || []).map((m) => ({ title: m.username, subtitle: m.email, badges: m.roles || [], children: [] }))),
    ].filter(Boolean),
  }));

  const attachPoint = headNode || root;
  if (headNode) root.children.push(headNode);
  if (managerNodes.length) attachPoint.children.push({ title: "Managers", subtitle: "", badges: [], children: managerNodes });
  if (teamNodes.length) attachPoint.children.push({ title: "Teams", subtitle: "", badges: [], children: teamNodes });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Org Chart: {dep.name}</h1>
        <Link href={`/admin/departments/${dep._id}`} className="underline">Back to Department</Link>
      </div>

      <div className="p-4 rounded border border-neutral-800">
        <OrgTreeClient
          root={root}
          ctas={{
            departmentId: dep._id.toString(),
            hasHead: !!dep.head,
            hasManagers: (dep.managers || []).length > 0,
            hasTeams: teams.length > 0,
          }}
        />
      </div>

      <style>{`
        .tree ul { padding-top: 20px; position: relative; transition: all .5s; }
        .tree li { list-style-type: none; text-align: center; position: relative; padding: 20px 5px 0 5px; }
        .tree li::before, .tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 1px solid #2f2f2f; width: 50%; height: 20px; }
        .tree li::after { right: auto; left: 50%; border-left: 1px solid #2f2f2f; }
        .tree li:only-child::before, .tree li:only-child::after { display: none; }
        .tree li:only-child { padding-top: 0; }
        .tree li:first-child::before, .tree li:last-child::after { border: 0 none; }
        .tree li:last-child::before { border-right: 1px solid #2f2f2f; border-radius: 0 5px 0 0; }
        .tree li:first-child::after { border-radius: 5px 0 0 0; }
        .tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 1px solid #2f2f2f; width: 0; height: 20px; }
      `}</style>
    </div>
  );
}
