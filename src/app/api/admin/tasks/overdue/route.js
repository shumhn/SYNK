import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";
import User from "@/models/User";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const now = new Date();

    const overdueMatch = { status: { $ne: "completed" }, dueDate: { $ne: null, $lt: now } };

    // Priority distribution of overdue
    const priorityAgg = await Task.aggregate([
      { $match: overdueMatch },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);
    const priority = { low: 0, medium: 0, high: 0, urgent: 0, critical: 0 };
    for (const p of priorityAgg) {
      const key = p._id || "medium";
      if (priority[key] !== undefined) priority[key] = p.count;
    }

    // Age buckets for overdue
    const ageAgg = await Task.aggregate([
      { $match: overdueMatch },
      { $project: { days: { $dateDiff: { startDate: "$dueDate", endDate: now, unit: "day" } } } },
      { $bucket: {
        groupBy: "$days",
        boundaries: [0, 4, 8, 15, 10000],
        default: 10000,
        output: { count: { $sum: 1 } }
      } },
    ]);
    const ageBuckets = { d1_3: 0, d4_7: 0, d8_14: 0, d15_plus: 0 };
    for (const a of ageAgg) {
      if (a._id >= 0 && a._id < 4) ageBuckets.d1_3 = a.count;
      else if (a._id >= 4 && a._id < 8) ageBuckets.d4_7 = a.count;
      else if (a._id >= 8 && a._id < 15) ageBuckets.d8_14 = a.count;
      else ageBuckets.d15_plus += a.count;
    }

    // Top assignees with overdue counts
    const topAssigneesAgg = await Task.aggregate([
      { $match: overdueMatch },
      { $group: { _id: "$assignee", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const assigneeIds = topAssigneesAgg.map(a => a._id).filter(Boolean);
    const users = assigneeIds.length ? await User.find({ _id: { $in: assigneeIds } }).select("username email").lean() : [];
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const topAssignees = topAssigneesAgg.map(a => ({
      id: a._id ? String(a._id) : null,
      username: a._id ? (userMap.get(String(a._id))?.username || "Unknown") : "Unassigned",
      count: a.count,
    }));

    // Oldest overdue tasks (for escalation)
    const oldest = await Task.find(overdueMatch)
      .select("title priority dueDate assignee status")
      .populate("assignee", "username email")
      .sort({ dueDate: 1 })
      .limit(10)
      .lean();

    const totalOverdue = await Task.countDocuments(overdueMatch);
    const urgentOverdue = priority.urgent || 0;
    const criticalOverdue = priority.critical || 0;
    const d15Plus = ageBuckets.d15_plus || 0;

    return NextResponse.json({
      error: false,
      data: {
        summary: {
          totalOverdue,
          urgentOverdue,
          criticalOverdue,
          severeOverdue: d15Plus,
        },
        priority,
        ageBuckets,
        topAssignees,
        oldest: oldest.map(t => ({
          id: String(t._id),
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          status: t.status,
          assignee: t.assignee ? { id: String(t.assignee._id), username: t.assignee.username } : null,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
