import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { autoArchiveCompletedProjects } from "@/lib/notifications";

/**
 * POST /api/admin/automation/archive-projects
 * Cron endpoint to auto-archive completed projects after X days
 * Protected by CRON_SECRET
 */
export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: true, message: "Unauthorized cron" },
      { status: 401 }
    );
  }

  try {
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    await autoArchiveCompletedProjects(days);

    return NextResponse.json(
      {
        error: false,
        message: `Auto-archived completed projects after ${days} days`,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error auto-archiving projects", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
