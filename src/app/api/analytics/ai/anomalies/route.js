import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";
import User from "@/models/User";

/**
 * POST /api/analytics/ai/anomalies
 * Detects statistical anomalies in performance metrics
 * Body: { scope: 'company' | 'department', refId?: string, days?: number }
 */
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { scope = "company", refId, days = 30 } = body;

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Fetch Daily Data
    let matchStage = {
      completedAt: { $gte: startDate, $lte: now },
      status: "completed"
    };

    if (scope === "department" && refId) {
      const users = await User.find({ department: refId }).select("_id");
      matchStage.assignee = { $in: users.map(u => u._id) };
    }

    const dailyData = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    if (dailyData.length < 5) {
      return NextResponse.json({ 
        error: false, 
        data: { anomalies: [], message: "Not enough data for analysis" } 
      });
    }

    // 2. Calculate Statistics (Mean & Std Dev)
    const values = dailyData.map(d => d.count);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 3. Identify Anomalies (Z-Score > 2 or < -2)
    const anomalies = [];
    const THRESHOLD = 1.5; // Slightly lower threshold for demo purposes (usually 2 or 3)

    dailyData.forEach(day => {
      const zScore = stdDev === 0 ? 0 : (day.count - mean) / stdDev;
      
      if (Math.abs(zScore) > THRESHOLD) {
        anomalies.push({
          date: day._id,
          value: day.count,
          expected: Math.round(mean),
          zScore: Number(zScore.toFixed(2)),
          type: zScore > 0 ? "spike" : "drop",
          severity: Math.abs(zScore) > 2.5 ? "high" : "medium"
        });
      }
    });

    // Sort by date descending (newest first)
    anomalies.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      error: false,
      data: {
        anomalies,
        stats: {
          mean: Number(mean.toFixed(1)),
          stdDev: Number(stdDev.toFixed(1)),
          totalDays: dailyData.length
        }
      }
    });

  } catch (e) {
    console.error("Error detecting anomalies:", e);
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
