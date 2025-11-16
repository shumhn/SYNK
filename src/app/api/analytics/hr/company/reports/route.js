import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

// 2.13: Auto-generated weekly/monthly productivity reports
// GET /api/analytics/hr/company/reports
// Optional query: ?period=weekly|monthly (default: both)

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period"); // weekly | monthly | null

    const now = new Date();

    async function buildWindowReport(label, days, nowDate) {
      const endCurrent = new Date(nowDate);
      const startCurrent = new Date(
        endCurrent.getTime() - days * 24 * 60 * 60 * 1000
      );
      const endPrev = new Date(startCurrent.getTime());
      const startPrev = new Date(
        endPrev.getTime() - days * 24 * 60 * 60 * 1000
      );

      const [currentCompleted, currentCreated, prevCompleted, prevCreated] =
        await Promise.all([
          Task.countDocuments({
            status: "completed",
            completedAt: { $gte: startCurrent, $lte: endCurrent },
          }),
          Task.countDocuments({
            createdAt: { $gte: startCurrent, $lte: endCurrent },
          }),
          Task.countDocuments({
            status: "completed",
            completedAt: { $gte: startPrev, $lte: endPrev },
          }),
          Task.countDocuments({
            createdAt: { $gte: startPrev, $lte: endPrev },
          }),
        ]);

      const currentTotal = currentCompleted + currentCreated;
      const prevTotal = prevCompleted + prevCreated;

      const completionRateCurrent =
        currentTotal > 0
          ? Math.round((currentCompleted / currentTotal) * 100)
          : 0;
      const completionRatePrev =
        prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

      const avgCompletedPerDay =
        days > 0 ? Number((currentCompleted / days).toFixed(2)) : 0;

      const deltaCompleted = currentCompleted - prevCompleted;
      const pctChangeCompleted =
        prevCompleted > 0
          ? Math.round(
              ((currentCompleted - prevCompleted) / prevCompleted) * 100
            )
          : currentCompleted > 0
          ? 100
          : 0;

      const deltaRate = completionRateCurrent - completionRatePrev;

      return {
        label,
        range: {
          from: startCurrent.toISOString(),
          to: endCurrent.toISOString(),
        },
        comparisonRange: {
          from: startPrev.toISOString(),
          to: endPrev.toISOString(),
        },
        metrics: {
          completed: currentCompleted,
          created: currentCreated,
          completionRate: completionRateCurrent,
          avgCompletedPerDay,
        },
        comparison: {
          completed: prevCompleted,
          created: prevCreated,
          completionRate: completionRatePrev,
        },
        deltas: {
          completed: deltaCompleted,
          completedPct: pctChangeCompleted,
          completionRate: deltaRate,
          direction:
            deltaCompleted > 0 ? "up" : deltaCompleted < 0 ? "down" : "stable",
        },
      };
    }

    const result = {};

    if (!period || period === "weekly") {
      result.weekly = await buildWindowReport("This Week", 7, now);
    }
    if (!period || period === "monthly") {
      result.monthly = await buildWindowReport("This Month", 30, now);
    }

    return NextResponse.json({ error: false, data: result }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
