import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Team from "@/models/Team";
import Project from "@/models/Project";
import Task from "@/models/Task";

export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const [employees, teams, projects, tasks] = await Promise.all([
      User.countDocuments({ 
        isActive: true,
        roles: { $in: ["employee", "manager", "hr", "admin"] } // Exclude viewers and count only real employees
      }),
      Team.countDocuments({}),
      Project.countDocuments({}),
      Task.countDocuments({}),
    ]);

    return NextResponse.json({
      error: false,
      data: {
        employees,
        teams,
        projects,
        tasks,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
