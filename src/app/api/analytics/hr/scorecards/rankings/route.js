import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";
import Task from "@/models/Task";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const topN = Math.min(50, Math.max(1, Number(searchParams.get("top")) || 10));
    const lowN = Math.min(50, Math.max(1, Number(searchParams.get("low")) || 10));
    const wOnTime = Math.max(0, Math.min(100, Number(searchParams.get("wOnTime")) || 45));
    const wThroughput = Math.max(0, Math.min(100, Number(searchParams.get("wThroughput")) || 40));
    const wCompletion = Math.max(0, Math.min(100, Number(searchParams.get("wCompletion")) || 15));
    const wPenalty = Math.max(0, Math.min(100, Number(searchParams.get("wPenalty")) || 30));

    const now = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const days = Math.max(1, Math.round((now - from) / (24 * 60 * 60 * 1000)));
    const weeks = Math.max(1, Math.ceil(days / 7));

    const userFilter = { isActive: true };
    if (department && mongoose.isValidObjectId(department)) userFilter.department = new mongoose.Types.ObjectId(department);

    const users = await User.find(userFilter).select("_id username email department").populate("department", "name").lean();
    if (!users.length) {
      return NextResponse.json({ error: false, data: { top: [], low: [], summary: { count: 0 } } });
    }

    const userIds = users.map(u => u._id);

    const completedAgg = await Task.aggregate([
      { $match: { assignee: { $in: userIds }, status: "completed", completedAt: { $gte: from, $lte: now } } },
      { $group: { 
          _id: "$assignee", 
          completed: { $sum: 1 },
          dueWithDate: { $sum: { $cond: [ { $ne: ["$dueDate", null] }, 1, 0 ] } },
          onTime: { $sum: { $cond: [ { $and: [ { $ne: ["$dueDate", null] }, { $lte: ["$completedAt", "$dueDate"] } ] }, 1, 0 ] } },
        } 
      },
    ]);

    const pendingAgg = await Task.aggregate([
      { $match: { assignee: { $in: userIds }, status: { $ne: "completed" } } },
      { $group: { _id: "$assignee", pending: { $sum: 1 } } },
    ]);

    const overdueAgg = await Task.aggregate([
      { $match: { assignee: { $in: userIds }, status: { $ne: "completed" }, dueDate: { $ne: null, $lt: now } } },
      { $group: { _id: "$assignee", overdueOpen: { $sum: 1 } } },
    ]);

    const completedMap = new Map(completedAgg.map(r => [String(r._id), r]));
    const pendingMap = new Map(pendingAgg.map(r => [String(r._id), r.pending]));
    const overdueMap = new Map(overdueAgg.map(r => [String(r._id), r.overdueOpen]));

    const throughputs = users.map(u => {
      const comp = completedMap.get(String(u._id));
      const completed = comp?.completed || 0;
      return completed / weeks;
    });
    const tMin = Math.min(...throughputs);
    const tMax = Math.max(...throughputs);
    const tRange = tMax - tMin;

    const items = users.map(u => {
      const comp = completedMap.get(String(u._id));
      const completed = comp?.completed || 0;
      const dueWithDate = comp?.dueWithDate || 0;
      const onTime = comp?.onTime || 0;
      const pending = pendingMap.get(String(u._id)) || 0;
      const overdueOpen = overdueMap.get(String(u._id)) || 0;

      const totalWork = completed + pending;
      const completionRate = totalWork > 0 ? Math.round((completed / totalWork) * 100) : 0;
      const onTimeRate = dueWithDate > 0 ? Math.round((onTime / dueWithDate) * 100) : 0;
      const throughput = completed / weeks;
      const throughputNorm = tRange > 0 ? (throughput - tMin) / tRange : 0.5;
      const overdueBase = overdueOpen + pending;
      const overdueRate = overdueBase > 0 ? overdueOpen / overdueBase : 0;

      const base = (wOnTime / 100) * onTimeRate
        + (wThroughput / 100) * (throughputNorm * 100)
        + (wCompletion / 100) * completionRate;
      const penalty = (wPenalty / 100) * (overdueRate * 100);
      const score = Math.max(0, Math.min(100, Math.round(base - penalty)));

      return {
        userId: u._id,
        username: u.username,
        email: u.email,
        department: u.department?.name || null,
        score,
        onTimeRate,
        throughput,
        completionRate,
        pending,
        overdueRate: Math.round(overdueRate * 100),
      };
    });

    items.sort((a, b) => b.score - a.score);

    const top = items.slice(0, topN);
    const low = items.slice(-lowN).reverse();

    const summary = {
      count: items.length,
      topCutoff: top[top.length - 1]?.score ?? null,
      lowCutoff: low[low.length - 1]?.score ?? null,
      avgScore: Math.round(items.reduce((s, i) => s + i.score, 0) / items.length),
    };

    return NextResponse.json({ error: false, data: { top, low, summary } });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
