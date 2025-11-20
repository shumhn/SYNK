import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { escalateOverdueTasks } from "@/lib/notifications";

/**
 * POST /api/admin/automation/escalate-overdue
 * Cron endpoint to escalate overdue tasks to managers and HR
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
    await escalateOverdueTasks();

    return NextResponse.json(
      { error: false, message: "Overdue task escalations sent" },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error escalating overdue tasks", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
