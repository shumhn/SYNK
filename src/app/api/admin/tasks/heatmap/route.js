import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const metric = (searchParams.get("metric") || "created").toLowerCase(); // 'created' | 'completed'
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days")) || 90));

    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const dateField = metric === "completed" ? "$completedAt" : "$createdAt";

    const agg = await Task.aggregate([
      { $match: { [metric === "completed" ? "completedAt" : "createdAt"]: { $gte: from, $lte: now } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: dateField } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Build a dense series with 0s for missing days
    const map = new Map(agg.map(r => [r._id, r.count]));
    const series = [];
    for (let d = startOfDay(from); d <= now; d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().split("T")[0];
      series.push({ date: key, count: map.get(key) || 0 });
    }

    const max = series.reduce((m, x) => Math.max(m, x.count), 0);

    return NextResponse.json({ error: false, data: { metric, days, series, max } });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
