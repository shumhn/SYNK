import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { sendProductivityReportEmail } from "@/lib/notifications";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import User from "@/models/User";
import Project from "@/models/Project";

const MODEL = "gemini-1.5-flash-latest";

async function buildScopeFilter({ userId, departmentId, projectId }) {
  let scopeOr = [];
  if (userId) {
    try {
      const mongoose = (await import("mongoose")).default;
      scopeOr.push({ assignee: new mongoose.Types.ObjectId(userId) });
    } catch {}
  }
  if (projectId) {
    try {
      const mongoose = (await import("mongoose")).default;
      scopeOr.push({ project: new mongoose.Types.ObjectId(projectId) });
    } catch {}
  }
  if (departmentId) {
    const usersInDept = await User.find({
      department: departmentId,
      isActive: true,
    })
      .select("_id")
      .lean();
    const projectsInDept = await Project.find({
      departments: departmentId,
      archived: { $ne: true },
    })
      .select("_id")
      .lean();
    const uIds = usersInDept.map((u) => u._id);
    const pIds = projectsInDept.map((p) => p._id);
    if (uIds.length) scopeOr.push({ assignee: { $in: uIds } });
    if (pIds.length) scopeOr.push({ project: { $in: pIds } });
  }
  return scopeOr.length > 0 ? { $or: scopeOr } : {};
}

async function buildWindowReport({ label, days, now, scopeFilter }) {
  const endCurrent = new Date(now);
  const startCurrent = new Date(
    endCurrent.getTime() - days * 24 * 60 * 60 * 1000
  );
  const endPrev = new Date(startCurrent.getTime());
  const startPrev = new Date(endPrev.getTime() - days * 24 * 60 * 60 * 1000);

  const [currentCompleted, currentCreated, prevCompleted, prevCreated] =
    await Promise.all([
      Task.countDocuments({
        ...scopeFilter,
        status: "completed",
        completedAt: { $gte: startCurrent, $lte: endCurrent },
      }),
      Task.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startCurrent, $lte: endCurrent },
      }),
      Task.countDocuments({
        ...scopeFilter,
        status: "completed",
        completedAt: { $gte: startPrev, $lte: endPrev },
      }),
      Task.countDocuments({
        ...scopeFilter,
        createdAt: { $gte: startPrev, $lte: endPrev },
      }),
    ]);

  const currentTotal = currentCompleted + currentCreated;
  const prevTotal = prevCompleted + prevCreated;

  const completionRateCurrent =
    currentTotal > 0 ? Math.round((currentCompleted / currentTotal) * 100) : 0;
  const completionRatePrev =
    prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0;

  const avgCompletedPerDay =
    days > 0 ? Number((currentCompleted / days).toFixed(2)) : 0;

  const deltaCompleted = currentCompleted - prevCompleted;
  const pctChangeCompleted =
    prevCompleted > 0
      ? Math.round(((currentCompleted - prevCompleted) / prevCompleted) * 100)
      : currentCompleted > 0
      ? 100
      : 0;

  const deltaRate = completionRateCurrent - completionRatePrev;

  return {
    label,
    range: {
      from: startCurrent.toISOString(),
      to: endCurrent.toISOString(),
    },
    comparisonRange: {
      from: startPrev.toISOString(),
      to: endPrev.toISOString(),
    },
    metrics: {
      completed: currentCompleted,
      created: currentCreated,
      completionRate: completionRateCurrent,
      avgCompletedPerDay,
    },
    comparison: {
      completed: prevCompleted,
      created: prevCreated,
      completionRate: completionRatePrev,
    },
    deltas: {
      completed: deltaCompleted,
      completedPct: pctChangeCompleted,
      completionRate: deltaRate,
      direction:
        deltaCompleted > 0 ? "up" : deltaCompleted < 0 ? "down" : "stable",
    },
  };
}

async function getAiSummary({ label, range, metrics, comparison, deltas }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const period = (label || "this period").toLowerCase();
  const prompt = `You are an analytics assistant. Summarize changes ${period} vs the previous comparable window. Be precise, objective, and concise (1–2 sentences). Avoid fluff.\n\nData:\n- Range: ${JSON.stringify(
    range || {}
  )}\n- Metrics: ${JSON.stringify(
    metrics || {}
  )}\n- Comparison: ${JSON.stringify(
    comparison || {}
  )}\n- Deltas: ${JSON.stringify(
    deltas || {}
  )}\n\nWrite only the summary sentence(s).`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 120 },
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) {
    console.error("Gemini summary error", json?.error || json);
    return "";
  }

  const text =
    json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    json?.candidates?.[0]?.output_text?.trim() ||
    "";
  return text;
}

export async function POST(req) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: true, message: "Unauthorized cron" },
      { status: 401 }
    );
  }

  const periodParam = searchParams.get("period"); // weekly | monthly | both/null

  try {
    await connectToDatabase();

    const now = new Date();
    const scopeFilter = await buildScopeFilter({}); // company-wide for now

    const periods = [];
    if (!periodParam || periodParam === "weekly") periods.push("weekly");
    if (!periodParam || periodParam === "monthly") periods.push("monthly");

    for (const period of periods) {
      const days = period === "weekly" ? 7 : 30;
      const label = period === "weekly" ? "This Week" : "This Month";
      const report = await buildWindowReport({
        label,
        days,
        now,
        scopeFilter,
      });

      const summary = await getAiSummary({
        label: report.label,
        range: report.range,
        metrics: report.metrics,
        comparison: report.comparison,
        deltas: report.deltas,
      });

      await sendProductivityReportEmail({ period, report, summary });
    }

    return NextResponse.json(
      { error: false, message: "Reports dispatched" },
      { status: 200 }
    );
  } catch (e) {
    console.error("Error dispatching productivity reports", e);
    return NextResponse.json(
      { error: true, message: e.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
