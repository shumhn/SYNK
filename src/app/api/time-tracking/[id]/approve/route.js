import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import TimeLog from "@/models/TimeLog";
import { requireRoles } from "@/lib/auth/guard";

/**
 * PATCH /api/time-tracking/[id]/approve
 * Approve or reject a time log entry
 */
export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: true, message: "Invalid status" }, { status: 400 });
  }

  await connectToDatabase();
  const log = await TimeLog.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).populate("user", "username email");

  if (!log) {
    return NextResponse.json({ error: true, message: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ error: false, data: log, message: `Time log ${status}` });
}
