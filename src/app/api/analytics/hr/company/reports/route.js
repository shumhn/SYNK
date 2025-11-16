import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";
import User from "@/models/User";
import Project from "@/models/Project";

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
    const fromParam = searchParams.get("from"); // YYYY-MM-DD or ISO
    const toParam = searchParams.get("to"); // YYYY-MM-DD or ISO
    const userId = searchParams.get("userId");
    const departmentId = searchParams.get("departmentId");
    const projectId = searchParams.get("projectId");

    const now = new Date();

    // Build scope filter
    let scopeOr = [];
    if (userId) {
      try {
        scopeOr.push({
          assignee: new (await import("mongoose")).default.Types.ObjectId(
            userId
          ),
        });
      } catch {}
    }
    if (projectId) {
      try {
        scopeOr.push({
          project: new (await import("mongoose")).default.Types.ObjectId(
            projectId
          ),
        });
      } catch {}
    }
    if (departmentId) {
      const usersInDept = await User.find({
        department: departmentId,
        isActive: true,
      })
        .select("_id")
        .lean();
      const projectsInDept = await Project.find({
        departments: departmentId,
        archived: { $ne: true },
      })
        .select("_id")
        .lean();
      const uIds = usersInDept.map((u) => u._id);
      const pIds = projectsInDept.map((p) => p._id);
      if (uIds.length) scopeOr.push({ assignee: { $in: uIds } });
      if (pIds.length) scopeOr.push({ project: { $in: pIds } });
    }
    const scopeFilter = scopeOr.length > 0 ? { $or: scopeOr } : {};

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
            ...scopeFilter,
            status: "completed",
            completedAt: { $gte: startCurrent, $lte: endCurrent },
          }),
          Task.countDocuments({
            ...scopeFilter,
            createdAt: { $gte: startCurrent, $lte: endCurrent },
          }),
          Task.countDocuments({
            ...scopeFilter,
            status: "completed",
            completedAt: { $gte: startPrev, $lte: endPrev },
          }),
          Task.countDocuments({
            ...scopeFilter,
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

    // Custom range
    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to > from) {
        const days = Math.max(
          1,
          Math.ceil((to - from) / (24 * 60 * 60 * 1000))
        );
        result.custom = await buildWindowReport("Custom Range", days, to);
        // Override range to exact from/to for accuracy in response
        if (result.custom?.range) {
          result.custom.range.from = from.toISOString();
          result.custom.range.to = to.toISOString();
        }
      }
    }

    return NextResponse.json({ error: false, data: result }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
