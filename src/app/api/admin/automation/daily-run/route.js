import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import {
  generateRecurringTasks,
  escalateOverdueTasks,
  sendDeadlineReminders,
  sendAllDailyDigests,
} from "@/lib/notifications";

/**
 * GET /api/admin/automation/daily-run?token=CRON_SECRET
 * Single daily orchestrator for all automation tasks.
 * - Recurring tasks generation
 * - Overdue escalation (assignees + managers/HR)
 * - Deadline reminders
 * - Daily digests
 * - Weekly/monthly reports (conditional by date)
 */
export async function GET(req) {
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

  const results = {
    recurring: null,
    overdue: null,
    reminders: null,
    digests: null,
    weeklyReport: null,
    monthlyReport: null,
  };

  try {
    // 1) Recurring tasks
    try {
      await generateRecurringTasks();
      results.recurring = "ok";
    } catch (e) {
      console.error("daily-run: generateRecurringTasks failed", e);
      results.recurring = e.message || "error";
    }

    // 2) Overdue escalation (assignees + managers/HR)
    try {
      await escalateOverdueTasks();
      results.overdue = "ok";
    } catch (e) {
      console.error("daily-run: escalateOverdueTasks failed", e);
      results.overdue = e.message || "error";
    }

    // 3) Deadline reminders
    try {
      await sendDeadlineReminders();
      results.reminders = "ok";
    } catch (e) {
      console.error("daily-run: sendDeadlineReminders failed", e);
      results.reminders = e.message || "error";
    }

    // 4) Daily digests
    try {
      await sendAllDailyDigests();
      results.digests = "ok";
    } catch (e) {
      console.error("daily-run: sendAllDailyDigests failed", e);
      results.digests = e.message || "error";
    }

    // 5) Weekly / monthly productivity reports via existing endpoint
    //    We call the /api/admin/reports/dispatch endpoint internally via fetch.
    try {
      const now = new Date();
      const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
      const date = now.getUTCDate();

      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const tokenParam = process.env.CRON_SECRET;

      // Weekly (only on Mondays)
      if (day === 1 && tokenParam) {
        const url = `${baseUrl}/api/admin/reports/dispatch?token=${encodeURIComponent(
          tokenParam
        )}&period=weekly`;
        const res = await fetch(url, { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(
            json.message || `Weekly report dispatch failed (${res.status})`
          );
        }
        results.weeklyReport = "ok";
      }

      // Monthly (only on 1st of month)
      if (date === 1 && tokenParam) {
        const url = `${baseUrl}/api/admin/reports/dispatch?token=${encodeURIComponent(
          tokenParam
        )}&period=monthly`;
        const res = await fetch(url, { method: "POST" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
          throw new Error(
            json.message || `Monthly report dispatch failed (${res.status})`
          );
        }
        results.monthlyReport = "ok";
      }
    } catch (e) {
      console.error("daily-run: report dispatch failed", e);
      const msg = e.message || "error";
      if (!results.weeklyReport) results.weeklyReport = msg;
      if (!results.monthlyReport) results.monthlyReport = msg;
    }

    return NextResponse.json(
      { error: false, message: "Daily automation run completed", results },
      { status: 200 }
    );
  } catch (e) {
    console.error("daily-run: unexpected error", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
