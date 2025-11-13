import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import AppraisalCycle from "@/models/AppraisalCycle";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "0");
    const sort = searchParams.get("sort") || "-periodEnd";

    const filter = {};
    if (status) filter.status = status;

    let q = AppraisalCycle.find(filter);
    if (sort) q = q.sort(sort.replace(":", " "));
    if (limit > 0) q = q.limit(limit);

    const cycles = await q.lean();
    return NextResponse.json({ error: false, data: cycles });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const now = new Date();

    const name = body.name || `Appraisal ${now.toLocaleString("en-US", { month: "long", year: "numeric" })}`;
    const periodStart = body.periodStart ? new Date(body.periodStart) : new Date(now.getTime() - 90*24*60*60*1000);
    const periodEnd = body.periodEnd ? new Date(body.periodEnd) : now;
    const visibility = body.visibility || "private";
    const reviewerMode = body.reviewerMode || "manager";
    const competencies = Array.isArray(body.competencies) && body.competencies.length > 0 ? body.competencies : [
      { key: "communication", label: "Communication", weight: 20 },
      { key: "quality", label: "Quality of Work", weight: 30 },
      { key: "delivery", label: "Delivery & Deadlines", weight: 30 },
      { key: "ownership", label: "Ownership", weight: 20 },
    ];

    const created = await AppraisalCycle.create({ name, periodStart, periodEnd, visibility, reviewerMode, competencies, status: body.status || "open" });

    try { broadcastEvent({ type: "appraisal-cycle-created", cycleId: created._id }); } catch {}

    return NextResponse.json({ error: false, data: created });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
