import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

/**
 * GET /api/analytics/hr/company/trends
 * Returns productivity trends with daily/weekly/monthly breakdowns
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly
    const days = parseInt(searchParams.get("days") || "30");

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    let dateFormat, groupBy, buckets;

    switch (period) {
      case "daily":
        dateFormat = "%Y-%m-%d";
        groupBy = { $dateToString: { format: dateFormat, date: "$completedAt" } };
        buckets = generateDailyBuckets(startDate, now);
        break;
      
      case "weekly":
        dateFormat = "%Y-W%V"; // ISO week
        groupBy = { $dateToString: { format: dateFormat, date: "$completedAt" } };
        buckets = generateWeeklyBuckets(startDate, now);
        break;
      
      case "monthly":
        dateFormat = "%Y-%m";
        groupBy = { $dateToString: { format: dateFormat, date: "$completedAt" } };
        buckets = generateMonthlyBuckets(startDate, now);
        break;
      
      default:
        return NextResponse.json({ error: true, message: "Invalid period" }, { status: 400 });
    }

    // Aggregate completed tasks by period
    const completedTrend = await Task.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate created tasks by period
    const createdTrend = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregate in-progress tasks snapshot by period (tasks that were in-progress during that time)
    const inProgressTrend = await Task.aggregate([
      {
        $match: {
          status: "in_progress",
          createdAt: { $lte: now }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert to maps for easy lookup
    const completedMap = new Map(completedTrend.map(item => [item._id, item.count]));
    const createdMap = new Map(createdTrend.map(item => [item._id, item.count]));
    const inProgressMap = new Map(inProgressTrend.map(item => [item._id, item.count]));

    // Fill in all buckets (including zero values)
    const trend = buckets.map(bucket => ({
      period: bucket.label,
      date: bucket.key,
      completed: completedMap.get(bucket.key) || 0,
      created: createdMap.get(bucket.key) || 0,
      inProgress: inProgressMap.get(bucket.key) || 0
    }));

    // Calculate summary statistics
    const totalCompleted = trend.reduce((sum, item) => sum + item.completed, 0);
    const totalCreated = trend.reduce((sum, item) => sum + item.created, 0);
    const avgCompleted = trend.length > 0 ? Math.round(totalCompleted / trend.length) : 0;
    const avgCreated = trend.length > 0 ? Math.round(totalCreated / trend.length) : 0;

    // Calculate velocity (trend direction)
    const firstHalf = trend.slice(0, Math.floor(trend.length / 2));
    const secondHalf = trend.slice(Math.floor(trend.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.completed, 0) / (firstHalf.length || 1);
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.completed, 0) / (secondHalf.length || 1);
    const velocityChange = Math.round(((secondHalfAvg - firstHalfAvg) / (firstHalfAvg || 1)) * 100);

    return NextResponse.json({
      error: false,
      data: {
        trend,
        summary: {
          period,
          days,
          totalCompleted,
          totalCreated,
          avgCompleted,
          avgCreated,
          velocityChange, // Percentage change between first and second half
          velocityDirection: velocityChange > 0 ? "up" : velocityChange < 0 ? "down" : "stable"
        }
      }
    });

  } catch (e) {
    console.error("Error fetching productivity trends:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

// Helper functions to generate time buckets
function generateDailyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const key = current.toISOString().split('T')[0]; // YYYY-MM-DD
    const label = new Date(current).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.push({ key, label });
    current.setDate(current.getDate() + 1);
  }
  
  return buckets;
}

function generateWeeklyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate);
  
  // Start from the beginning of the week
  current.setDate(current.getDate() - current.getDay());
  
  while (current <= endDate) {
    const year = current.getFullYear();
    const week = getWeekNumber(current);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const label = `${current.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    buckets.push({ key, label });
    current.setDate(current.getDate() + 7);
  }
  
  return buckets;
}

function generateMonthlyBuckets(startDate, endDate) {
  const buckets = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
  while (current <= endDate) {
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const label = current.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    buckets.push({ key, label });
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
