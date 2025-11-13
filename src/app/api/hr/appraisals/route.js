import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import AppraisalReview from "@/models/AppraisalReview";
import AppraisalCycle from "@/models/AppraisalCycle";
import User from "@/models/User";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const cycleId = searchParams.get("cycle");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const filter = {};
    if (cycleId && mongoose.isValidObjectId(cycleId)) filter.cycleId = new mongoose.Types.ObjectId(cycleId);
    if (department && mongoose.isValidObjectId(department)) filter.departmentId = new mongoose.Types.ObjectId(department);
    if (status) filter.status = status;

    const reviews = await AppraisalReview.find(filter)
      .populate("employeeId", "username email department")
      .populate("managerId", "username email")
      .lean();

    return NextResponse.json({ error: false, data: reviews });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { cycleId, employeeId, managerId } = body;

    if (!mongoose.isValidObjectId(cycleId) || !mongoose.isValidObjectId(employeeId)) {
      return NextResponse.json({ error: true, message: "Invalid cycle or employee id" }, { status: 400 });
    }

    const cycle = await AppraisalCycle.findById(cycleId).lean();
    if (!cycle) return NextResponse.json({ error: true, message: "Cycle not found" }, { status: 404 });
    if (cycle.status !== "open") return NextResponse.json({ error: true, message: "Cycle is not open" }, { status: 400 });

    const employee = await User.findById(employeeId).select("_id department").lean();
    if (!employee) return NextResponse.json({ error: true, message: "Employee not found" }, { status: 404 });

    const manager = managerId && mongoose.isValidObjectId(managerId) ? managerId : auth.user._id;

    // Upsert: one review per cycle+employee
    const existing = await AppraisalReview.findOne({ cycleId, employeeId }).lean();
    if (existing) {
      return NextResponse.json({ error: false, data: existing, message: "Review already exists" });
    }

    const scores = (cycle.competencies || []).map(c => ({ key: c.key, label: c.label, score: 0, weight: c.weight }));

    const created = await AppraisalReview.create({
      cycleId,
      employeeId,
      managerId: manager,
      departmentId: employee.department || null,
      status: "draft",
      scores,
      overall: 0,
    });

    try { broadcastEvent({ type: "appraisal-created", reviewId: created._id, cycleId }); } catch {}

    return NextResponse.json({ error: false, data: created });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
