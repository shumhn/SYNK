import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import AppraisalCycle from "@/models/AppraisalCycle";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });

    const cycle = await AppraisalCycle.findById(id).lean();
    if (!cycle) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

    return NextResponse.json({ error: false, data: cycle });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const update = {};
    if (body.name) update.name = body.name;
    if (body.periodStart) update.periodStart = new Date(body.periodStart);
    if (body.periodEnd) update.periodEnd = new Date(body.periodEnd);
    if (body.status) update.status = body.status;
    if (body.visibility) update.visibility = body.visibility;
    if (body.reviewerMode) update.reviewerMode = body.reviewerMode;
    if (Array.isArray(body.competencies)) update.competencies = body.competencies;

    const updated = await AppraisalCycle.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

    try { broadcastEvent({ type: "appraisal-cycle-updated", cycleId: String(updated._id) }); } catch {}

    return NextResponse.json({ error: false, data: updated });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
