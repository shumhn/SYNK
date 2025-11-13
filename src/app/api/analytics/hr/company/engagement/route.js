import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import TaskComment from "@/models/TaskComment";

function getRange(days) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to: now };
}

function bucketFormat(period) {
  if (period === "weekly") return "%Y-W%V";
  if (period === "monthly") return "%Y-%m";
  return "%Y-%m-%d"; // daily
}

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "daily";
  const days = Math.max(1, Math.min(365, Number(searchParams.get("days")) || 30));

  await connectToDatabase();

  const { from, to } = getRange(days);
  const format = bucketFormat(period);

  const agg = await TaskComment.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: {
      _id: { $dateToString: { format, date: "$createdAt" } },
      comments: { $sum: 1 },
      reactions: { $sum: { $cond: [ { $isArray: "$reactions" }, { $size: "$reactions" }, 0 ] } },
    }},
    { $sort: { _id: 1 } },
  ]);

  return NextResponse.json({ error: false, data: { period, days, trend: agg } });
}
