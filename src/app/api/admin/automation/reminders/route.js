import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { sendDeadlineReminders } from "@/lib/notifications";

/**
 * POST /api/admin/automation/reminders
 * Cron endpoint to send deadline reminders for tasks due soon
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
    await sendDeadlineReminders();

    return NextResponse.json(
      { error: false, message: "Deadline reminders sent" },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error sending deadline reminders", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
