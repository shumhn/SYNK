import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import User from "@/models/User";

function parseRange(url) {
  const { searchParams } = new URL(url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const period = searchParams.get("period") || "monthly"; // daily|weekly|monthly
  const now = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth() - 5, 1); // default ~6 months
  return { from, to: now, period };
}

function bucketFormat(period) {
  if (period === "weekly") return "%Y-W%V";
  if (period === "daily") return "%Y-%m-%d";
  return "%Y-%m"; // monthly default
}

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  await connectToDatabase();

  const { from, to, period } = parseRange(req.url);
  const fmt = bucketFormat(period);

  // Summary numbers
  const [startingHeadcount, endingHeadcount, newHires, leavers] = await Promise.all([
    // starting: created <= from and not (inactive updated before from)
    User.countDocuments({
      createdAt: { $lte: from },
      $or: [ { isActive: true }, { updatedAt: { $gte: from } } ],
    }),
    // ending: active as of now/to
    User.countDocuments({ isActive: true }),
    // new hires in range
    User.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    // leavers in range (approx by updatedAt during deactivation)
    User.countDocuments({ isActive: false, updatedAt: { $gte: from, $lte: to } }),
  ]);

  const retentionRate = startingHeadcount > 0
    ? Math.round(((startingHeadcount - leavers) / startingHeadcount) * 100)
    : 0;

  // Trend: joiners and leavers per bucket, plus cumulative headcount
  const [joinAgg, leaveAgg] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: fmt, date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $match: { isActive: false, updatedAt: { $gte: from, $lte: to } } },
      { $group: { _id: { $dateToString: { format: fmt, date: "$updatedAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Build bucket list from from..to per chosen period
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

  function getISOWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
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

  // Tenure distribution (active employees at 'to')
  const activeUsers = await User.find({ isActive: true }).select("createdAt").lean();
  const tenureBands = { under90: 0, d90_180: 0, d180_365: 0, over365: 0 };
  for (const u of activeUsers) {
    const days = Math.floor((to - u.createdAt) / (1000 * 60 * 60 * 24));
    if (days < 90) tenureBands.under90 += 1;
    else if (days < 180) tenureBands.d90_180 += 1;
    else if (days < 365) tenureBands.d180_365 += 1;
    else tenureBands.over365 += 1;
  }

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
