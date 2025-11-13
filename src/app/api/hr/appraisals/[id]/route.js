import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import AppraisalReview from "@/models/AppraisalReview";
import { broadcastEvent } from "@/app/api/events/subscribe/route";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });

    const review = await AppraisalReview.findById(id)
      .populate("employeeId", "username email department")
      .populate("managerId", "username email")
      .lean();
    if (!review) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

    const roles = auth.user?.roles || [];
    const isAdminOrHR = roles.includes("admin") || roles.includes("hr");
    const isManager = roles.includes("manager");
    const isEmployee = roles.includes("employee") && !isManager && !isAdminOrHR; // pure employee

    if (isEmployee && String(review.employeeId?._id || review.employeeId) !== String(auth.user._id)) {
      return NextResponse.json({ error: true, message: "Forbidden" }, { status: 403 });
    }
    if (isManager && !isAdminOrHR) {
      if (String(review.managerId?._id || review.managerId) !== String(auth.user._id)) {
        return NextResponse.json({ error: true, message: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ error: false, data: review });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });

    const existing = await AppraisalReview.findById(id).select("managerId").lean();
    if (!existing) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

    const roles = auth.user?.roles || [];
    const isAdminOrHR = roles.includes("admin") || roles.includes("hr");
    const isManager = roles.includes("manager");
    if (isManager && !isAdminOrHR && String(existing.managerId) !== String(auth.user._id)) {
      return NextResponse.json({ error: true, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const update = {};
    if (Array.isArray(body.scores)) update.scores = body.scores;
    if (typeof body.overall === "number") update.overall = body.overall;
    if (typeof body.notes === "string") update.notes = body.notes;
    if (body.status) update.status = body.status;
    if (body.status === "submitted") update.submittedAt = new Date();

    const updated = await AppraisalReview.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

    try { broadcastEvent({ type: "appraisal-updated", reviewId: String(updated._id) }); } catch {}

    return NextResponse.json({ error: false, data: updated });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
