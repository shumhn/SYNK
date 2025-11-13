import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import Task from "@/models/Task";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const weeks = Math.max(4, Math.min(52, Number(searchParams.get("weeks")) || 12));
  const now = new Date();
  const startDate = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

  await connectToDatabase();

  const user = await User.findById(id).select("_id").lean();
  if (!user) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  const dateFormat = "%Y-W%V";

  const completedAgg = await Task.aggregate([
    {
      $match: {
        assignee: new mongoose.Types.ObjectId(id),
        status: "completed",
        completedAt: { $gte: startDate, $lte: now },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: "$completedAt" } },
        total: { $sum: 1 },
        dueWithDate: {
          $sum: {
            $cond: [ { $ne: ["$dueDate", null] }, 1, 0 ],
          },
        },
        onTime: {
          $sum: {
            $cond: [
              { $and: [ { $ne: ["$dueDate", null] }, { $lte: ["$completedAt", "$dueDate"] } ] },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const completedMap = new Map(completedAgg.map((r) => [r._id, { total: r.total, onTime: r.onTime }]));

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  const buckets = [];
  const cursor = new Date(startDate);
  cursor.setDate(cursor.getDate() - (cursor.getDay() || 7) + 1);
  while (buckets.length < weeks) {
    const year = cursor.getFullYear();
    const week = String(getWeekNumber(cursor)).padStart(2, "0");
    buckets.push({ key: `${year}-W${week}` });
    cursor.setDate(cursor.getDate() + 7);
  }

  const series = buckets.map((b, idx) => {
    const entry = completedMap.get(b.key) || { total: 0, onTime: 0 };
    const completed = entry.total || 0;
    const onTimeRate = completed > 0 ? Math.round((entry.onTime / completed) * 100) : 0;
    const velocity = completed;
    return { week: idx + 1, completed, onTimeRate, velocity };
  });

  return NextResponse.json({ error: false, data: { series } }, { status: 200 });
}
