import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";
import User from "@/models/User";
import Department from "@/models/Department";

/**
 * GET /api/analytics/compare/trends
 * Compare trends across multiple departments
 * Query params:
 * - metric: 'completionRate' | 'productivity' | 'completed'
 * - period: 'daily' | 'weekly' | 'monthly'
 * - days: number (default 30)
 * - departmentIds: comma-separated list of IDs
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric") || "completionRate";
    const period = searchParams.get("period") || "daily";
    const days = parseInt(searchParams.get("days") || "30");
    const departmentIdsParam = searchParams.get("departmentIds");

    if (!departmentIdsParam) {
      return NextResponse.json({ error: false, data: { buckets: [], series: [] } });
    }

    const departmentIds = departmentIdsParam.split(",").filter(id => mongoose.isValidObjectId(id));
    if (departmentIds.length === 0) {
      return NextResponse.json({ error: false, data: { buckets: [], series: [] } });
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Generate buckets
    let dateFormat, buckets;
    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        buckets = generateDailyBuckets(startDate, now);
        break;
      case "weekly":
        dateFormat = "%Y-W%V";
        buckets = generateWeeklyBuckets(startDate, now);
        break;
      case "monthly":
        dateFormat = "%Y-%m";
        buckets = generateMonthlyBuckets(startDate, now);
        break;
      default:
        return NextResponse.json({ error: true, message: "Invalid period" }, { status: 400 });
    }

    const series = [];

    // Fetch data for each department
    // Note: In a high-scale scenario, we'd optimize this to a single aggregation, 
    // but for < 10 departments, parallel promises are fine and simpler to maintain.
    const departments = await Department.find({ _id: { $in: departmentIds } }).select("name color").lean();
    const deptMap = new Map(departments.map(d => [String(d._id), d]));

    await Promise.all(departmentIds.map(async (deptId) => {
      const dept = deptMap.get(deptId);
      if (!dept) return;

      // Get users in this department to filter tasks
      const users = await User.find({ department: deptId }).select("_id").lean();
      const userIds = users.map(u => u._id);

      if (userIds.length === 0) {
        series.push({
          id: deptId,
          name: dept.name,
          color: dept.color || getRandomColor(deptId),
          data: buckets.map(() => 0)
        });
        return;
      }

      // Base match for time range and users
      const timeMatch = { $gte: startDate, $lte: now };
      
      let dataPoints = [];

      if (metric === "completed") {
        const agg = await Task.aggregate([
          { $match: { assignee: { $in: userIds }, status: "completed", completedAt: timeMatch } },
          { $group: { _id: { $dateToString: { format: dateFormat, date: "$completedAt" } }, count: { $sum: 1 } } }
        ]);
        const map = new Map(agg.map(i => [i._id, i.count]));
        dataPoints = buckets.map(b => map.get(b.key) || 0);

      } else if (metric === "productivity") {
        // Completed tasks / employee count (simplified: using current employee count)
        const employeeCount = Math.max(1, userIds.length);
        const agg = await Task.aggregate([
          { $match: { assignee: { $in: userIds }, status: "completed", completedAt: timeMatch } },
          { $group: { _id: { $dateToString: { format: dateFormat, date: "$completedAt" } }, count: { $sum: 1 } } }
        ]);
        const map = new Map(agg.map(i => [i._id, i.count]));
        dataPoints = buckets.map(b => {
          const count = map.get(b.key) || 0;
          return Number((count / employeeCount).toFixed(2));
        });

      } else if (metric === "completionRate") {
        // Completed / (Completed + Created) * 100
        // Note: This is an approximation. True completion rate is Completed / (Completed + Open at that time).
        // For trendlines, Completed vs Created ratio is often used as a proxy for "keeping up".
        // Alternatively, we can use: Completed / (Completed + Pending Created in that bucket).
        // Let's stick to: Completed Count / (Completed Count + Created Count in that bucket) * 100
        
        const [completedAgg, createdAgg] = await Promise.all([
          Task.aggregate([
            { $match: { assignee: { $in: userIds }, status: "completed", completedAt: timeMatch } },
            { $group: { _id: { $dateToString: { format: dateFormat, date: "$completedAt" } }, count: { $sum: 1 } } }
          ]),
          Task.aggregate([
            { $match: { assignee: { $in: userIds }, createdAt: timeMatch } },
            { $group: { _id: { $dateToString: { format: dateFormat, date: "$createdAt" } }, count: { $sum: 1 } } }
          ])
        ]);

        const completedMap = new Map(completedAgg.map(i => [i._id, i.count]));
        const createdMap = new Map(createdAgg.map(i => [i._id, i.count]));

        dataPoints = buckets.map(b => {
          const comp = completedMap.get(b.key) || 0;
          const created = createdMap.get(b.key) || 0;
          const total = comp + created; // Proxy for "active volume" in that period
          return total > 0 ? Math.round((comp / total) * 100) : 0;
        });
      }

      series.push({
        id: deptId,
        name: dept.name,
        color: dept.color || getRandomColor(deptId),
        data: dataPoints
      });
    }));

    return NextResponse.json({
      error: false,
      data: {
        buckets: buckets.map(b => b.label),
        series
      }
    });

  } catch (e) {
    console.error("Error fetching comparative trends:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

// --- Helpers ---

function generateDailyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    buckets.push({
      key: current.toISOString().split('T')[0],
      label: current.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    });
    current.setDate(current.getDate() + 1);
  }
  return buckets;
}

function generateWeeklyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay()); // Start of week
  while (current <= endDate) {
    const week = getWeekNumber(current);
    const key = `${current.getFullYear()}-W${String(week).padStart(2, '0')}`;
    const end = new Date(current);
    end.setDate(end.getDate() + 6);
    buckets.push({
      key,
      label: `${current.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    });
    current.setDate(current.getDate() + 7);
  }
  return buckets;
}

function generateMonthlyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (current <= endDate) {
    buckets.push({
      key: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
      label: current.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    });
    current.setMonth(current.getMonth() + 1);
  }
  return buckets;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getRandomColor(seed) {
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
