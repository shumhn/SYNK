import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import Team from "@/models/Team";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();

  const dep = await Department.findById(id).select("_id head managers").lean();
  if (!dep) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  const [teams, members] = await Promise.all([
    Team.find({ department: id }).select("_id name").lean(),
    User.find({ department: id }).select("roles employmentType isOnline team profile.completion").lean(),
  ]);

  const totals = {
    members: members.length,
    online: members.filter((m) => m.isOnline).length,
    teams: teams.length,
    hasHead: !!dep.head,
    managers: (dep.managers || []).length,
  };

  const byRole = {};
  for (const m of members) {
    for (const r of m.roles || []) {
      byRole[r] = (byRole[r] || 0) + 1;
    }
  }

  const byEmploymentType = {};
  for (const m of members) {
    const e = m.employmentType || "full_time";
    byEmploymentType[e] = (byEmploymentType[e] || 0) + 1;
  }

  const teamMemberCounts = {};
  for (const t of teams) teamMemberCounts[t._id.toString()] = 0;
  for (const m of members) {
    const tid = m.team ? m.team.toString() : null;
    if (tid && teamMemberCounts.hasOwnProperty(tid)) teamMemberCounts[tid] += 1;
  }
  const teamsBreakdown = teams.map((t) => ({ id: t._id, name: t.name, members: teamMemberCounts[t._id.toString()] || 0 }));

  const profileCompletion = {
    average: members.length
      ? Math.round(
          (members.reduce((sum, m) => sum + (m?.profile?.completion || 0), 0) / members.length) * 10
        ) / 10
      : 0,
  };

  return NextResponse.json(
    {
      error: false,
      data: { totals, byRole, byEmploymentType, teams: teamsBreakdown, profileCompletion },
    },
    { status: 200 }
  );
}
