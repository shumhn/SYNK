import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import TimeLog from "@/models/TimeLog";
import { requireRoles } from "@/lib/auth/guard";

// GET /api/attendance/clock - Check current status
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  await connectToDatabase();

  // Find active attendance log (no endTime)
  const activeLog = await TimeLog.findOne({
    user: auth.user._id,
    type: "attendance",
    endTime: { $exists: false },
  }).sort({ startTime: -1 });

  return NextResponse.json({
    error: false,
    data: {
      isClockedIn: !!activeLog,
      startTime: activeLog?.startTime || null,
      logId: activeLog?._id || null,
    },
  });
}

// POST /api/attendance/clock - Clock In / Clock Out
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const body = await req.json();
  const { action } = body; // "in" or "out"

  await connectToDatabase();

  if (action === "in") {
    // Check if already clocked in
    const existing = await TimeLog.findOne({
      user: auth.user._id,
      type: "attendance",
      endTime: { $exists: false },
    });

    if (existing) {
      return NextResponse.json({ error: true, message: "Already clocked in" }, { status: 400 });
    }

    const newLog = await TimeLog.create({
      user: auth.user._id,
      type: "attendance",
      startTime: new Date(),
      status: "approved",
    });

    return NextResponse.json({ error: false, data: newLog, message: "Clocked in successfully" });
  } else if (action === "out") {
    // Find active log
    const activeLog = await TimeLog.findOne({
      user: auth.user._id,
      type: "attendance",
      endTime: { $exists: false },
    });

    if (!activeLog) {
      return NextResponse.json({ error: true, message: "Not clocked in" }, { status: 400 });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - activeLog.startTime) / 1000 / 60); // minutes

    activeLog.endTime = endTime;
    activeLog.duration = duration;
    await activeLog.save();

    // Also stop any running task timers
    const activeTask = await TimeLog.findOne({
      user: auth.user._id,
      type: "task",
      endTime: { $exists: false },
    });

    if (activeTask) {
      const taskDuration = Math.round((endTime - activeTask.startTime) / 1000 / 60);
      activeTask.endTime = endTime;
      activeTask.duration = taskDuration;
      await activeTask.save();
    }

    return NextResponse.json({ error: false, message: "Clocked out successfully" });
  }

  return NextResponse.json({ error: true, message: "Invalid action" }, { status: 400 });
}
