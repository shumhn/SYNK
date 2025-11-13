import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";

function parseRange(url) {
  const { searchParams } = new URL(url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const period = searchParams.get("period") || "monthly";
  const now = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { from, to: now, period };
}

function bucketFormat(period) {
  if (period === "weekly") return "%Y-W%V";
  if (period === "daily") return "%Y-%m-%d";
  return "%Y-%m";
}

function getISOWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid department id" }, { status: 400 });

  await connectToDatabase();

  const { from, to, period } = parseRange(req.url);
  const fmt = bucketFormat(period);

  const deptFilter = { department: new mongoose.Types.ObjectId(id) };

  const [startingHeadcount, endingHeadcount, newHires, leavers] = await Promise.all([
    User.countDocuments({ ...deptFilter, createdAt: { $lte: from }, $or: [ { isActive: true }, { updatedAt: { $gte: from } } ] }),
    User.countDocuments({ ...deptFilter, isActive: true }),
    User.countDocuments({ ...deptFilter, createdAt: { $gte: from, $lte: to } }),
    User.countDocuments({ ...deptFilter, isActive: false, updatedAt: { $gte: from, $lte: to } }),
  ]);

  const [joinAgg, leaveAgg] = await Promise.all([
    User.aggregate([
      { $match: { ...deptFilter, createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $match: { ...deptFilter, isActive: false, updatedAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: fmt, date: "$updatedAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  function generateBuckets() {
    const out = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      let key;
      if (period === "daily") {
        key = cursor.toISOString().slice(0, 10);
        cursor.setDate(cursor.getDate() + 1);
      } else if (period === "weekly") {
        const tmp = new Date(cursor);
        const week = getISOWeek(tmp);
        key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
        cursor.setDate(cursor.getDate() + 7);
      } else {
        key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      out.push(key);
    }
    return out;
  }

  const joinMap = new Map(joinAgg.map(r => [r._id, r.count]));
  const leaveMap = new Map(leaveAgg.map(r => [r._id, r.count]));
  let running = startingHeadcount;
  const buckets = generateBuckets().map((key) => {
    const joins = joinMap.get(key) || 0;
    const leaves = leaveMap.get(key) || 0;
    running = running + joins - leaves;
    return { _id: key, newHires: joins, leavers: leaves, headcount: running };
  });

  const activeUsers = await User.find({ ...deptFilter, isActive: true }).select("createdAt").lean();
  const tenureBands = { under90: 0, d90_180: 0, d180_365: 0, over365: 0 };
  for (const u of activeUsers) {
    const days = Math.floor((to - u.createdAt) / (1000 * 60 * 60 * 24));
    if (days < 90) tenureBands.under90 += 1;
    else if (days < 180) tenureBands.d90_180 += 1;
    else if (days < 365) tenureBands.d180_365 += 1;
    else tenureBands.over365 += 1;
  }

  const retentionRate = startingHeadcount > 0 ? Math.round(((startingHeadcount - leavers) / startingHeadcount) * 100) : 0;

  return NextResponse.json({
    error: false,
    data: {
      summary: { startingHeadcount, endingHeadcount, newHires, leavers, retentionRate },
      period,
      from,
      to,
      trend: buckets,
      tenure: tenureBands,
    },
  });
}
