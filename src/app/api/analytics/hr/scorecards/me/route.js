import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Task from "@/models/Task";

/**
 * GET /api/analytics/hr/scorecards/me?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns performance summary (HR scorecard) for the logged-in user based on real tasks.
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    // Weights (percent-style numbers). Defaults: completion=50, onTime=30, throughput=20, penalty=0
    const wOnTime = Math.max(
      0,
      Math.min(100, Number(searchParams.get("wOnTime")) || 30)
    );
    const wThroughput = Math.max(
      0,
      Math.min(100, Number(searchParams.get("wThroughput")) || 20)
    );
    const wCompletion = Math.max(
      0,
      Math.min(100, Number(searchParams.get("wCompletion")) || 50)
    );
    const wPenalty = Math.max(
      0,
      Math.min(100, Number(searchParams.get("wPenalty")) || 0)
    );

    const now = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // default 90 days
    const days = Math.max(1, Math.round((now - from) / (24 * 60 * 60 * 1000)));
    const weeks = Math.max(1, Math.ceil(days / 7));

    const userId = new mongoose.Types.ObjectId(auth.user._id);

    const userDoc = await User.findById(userId)
      .select("_id username email department")
      .populate("department", "name")
      .lean();
    if (!userDoc) {
      return NextResponse.json(
        { error: true, message: "User not found" },
        { status: 404 }
      );
    }

    // Completed tasks within range
    const completedAgg = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: "completed",
          completedAt: { $gte: from, $lte: now },
        },
      },
      {
        $group: {
          _id: "$assignee",
          completed: { $sum: 1 },
          dueWithDate: {
            $sum: { $cond: [{ $ne: ["$dueDate", null] }, 1, 0] },
          },
          onTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$dueDate", null] },
                    { $lte: ["$completedAt", "$dueDate"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Pending open tasks
    const pendingAgg = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: { $ne: "completed" },
        },
      },
      { $group: { _id: "$assignee", pending: { $sum: 1 } } },
    ]);

    // Overdue open tasks
    const overdueAgg = await Task.aggregate([
      {
        $match: {
          assignee: userId,
          status: { $ne: "completed" },
          dueDate: { $ne: null, $lt: now },
        },
      },
      { $group: { _id: "$assignee", overdueOpen: { $sum: 1 } } },
    ]);

    const completedRow = completedAgg[0] || null;
    const pending = pendingAgg[0]?.pending || 0;
    const overdueOpen = overdueAgg[0]?.overdueOpen || 0;

    const completed = completedRow?.completed || 0;
    const dueWithDate = completedRow?.dueWithDate || 0;
    const onTime = completedRow?.onTime || 0;

    const totalWork = completed + pending;
    const completionRate =
      totalWork > 0 ? Math.round((completed / totalWork) * 100) : 0;

    const onTimeRate =
      dueWithDate > 0 ? Math.round((onTime / dueWithDate) * 100) : 0;

    const throughput = completed / weeks; // tasks/week
    // Single-user normalization: default to middle when there is no comparison
    const throughputNorm =
      0.5 +
      (throughput > 0 ? Math.min(0.5, throughput / (throughput + 5)) : -0.25);

    const overdueBase = overdueOpen + pending;
    const overdueRate = overdueBase > 0 ? overdueOpen / overdueBase : 0; // 0..1

    // Performance Index (0..100) with configurable weights
    const base =
      (wOnTime / 100) * onTimeRate +
      (wThroughput / 100) * (throughputNorm * 100) +
      (wCompletion / 100) * completionRate;
    const penalty = (wPenalty / 100) * (overdueRate * 100); // penalize overdue
    const score = Math.max(0, Math.min(100, Math.round(base - penalty)));

    const metrics = {
      completed,
      pending,
      overdueOpen,
      weeks,
      throughput: Number(throughput.toFixed(2)),
      onTimeRate,
      completionRate,
      overdueRate: Math.round(overdueRate * 100),
    };

    return NextResponse.json(
      {
        error: false,
        data: {
          user: {
            id: userDoc._id,
            username: userDoc.username,
            email: userDoc.email,
            department: userDoc.department?.name || null,
          },
          range: {
            from,
            to: now,
            days,
            weeks,
          },
          metrics,
          score,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error generating self scorecard:", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
