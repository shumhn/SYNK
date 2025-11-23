import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import TimeLog from "@/models/TimeLog";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

// GET /api/time-tracking - Get logs
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const taskId = searchParams.get("taskId");
  const userId = searchParams.get("userId");

  // Only admin/hr/manager can see others' logs
  if (userId && userId !== auth.user._id.toString() && !["admin", "hr", "manager"].some(r => auth.user.roles.includes(r))) {
    return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 403 });
  }

  const query = {
    user: userId || auth.user._id,
    type: "task",
  };

  if (startDate && endDate) {
    query.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (taskId) query.task = taskId;

  await connectToDatabase();
  const logs = await TimeLog.find(query)
    .populate("task", "title project")
    .populate("project", "title")
    .sort({ startTime: -1 })
    .lean();

  // Check for currently running task
  const activeTask = await TimeLog.findOne({
    user: auth.user._id,
    type: "task",
    endTime: { $exists: false },
  }).lean();

  return NextResponse.json({ error: false, data: logs, activeTask });
}

// POST /api/time-tracking - Start/Stop/Log
export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const body = await req.json();
  const { action, taskId, projectId, description, duration, date } = body;

  await connectToDatabase();

  if (action === "start") {
    if (!taskId) return NextResponse.json({ error: true, message: "Task ID required" }, { status: 400 });

    // Stop any currently running task timer
    const running = await TimeLog.findOne({
      user: auth.user._id,
      type: "task",
      endTime: { $exists: false },
    });

    if (running) {
      const now = new Date();
      running.endTime = now;
      running.duration = Math.round((now - running.startTime) / 1000 / 60);
      await running.save();
    }

    // Ensure user is clocked in (optional, but good practice)
    const attendance = await TimeLog.findOne({
      user: auth.user._id,
      type: "attendance",
      endTime: { $exists: false },
    });

    if (!attendance) {
      // Auto-clock in if not already
      await TimeLog.create({
        user: auth.user._id,
        type: "attendance",
        startTime: new Date(),
        status: "approved",
      });
    }

    // Get project from task
    const task = await Task.findById(taskId).select("project").lean();

    const newLog = await TimeLog.create({
      user: auth.user._id,
      type: "task",
      task: taskId,
      project: task?.project || projectId,
      startTime: new Date(),
      description,
      status: "approved",
    });

    return NextResponse.json({ error: false, data: newLog, message: "Timer started" });
  } 
  
  else if (action === "stop") {
    const running = await TimeLog.findOne({
      user: auth.user._id,
      type: "task",
      endTime: { $exists: false },
    });

    if (!running) return NextResponse.json({ error: true, message: "No timer running" }, { status: 400 });

    const now = new Date();
    running.endTime = now;
    running.duration = Math.round((now - running.startTime) / 1000 / 60);
    await running.save();

    return NextResponse.json({ error: false, data: running, message: "Timer stopped" });
  }

  else if (action === "log") {
    // Manual entry
    if (!taskId || !duration) return NextResponse.json({ error: true, message: "Missing fields" }, { status: 400 });
    
    const task = await Task.findById(taskId).select("project").lean();
    const logDate = date ? new Date(date) : new Date();
    const endTime = new Date(logDate.getTime() + duration * 60000);

    const newLog = await TimeLog.create({
      user: auth.user._id,
      type: "task",
      task: taskId,
      project: task?.project || projectId,
      startTime: logDate,
      endTime: endTime,
      duration: Number(duration),
      description,
      status: "approved",
    });

    return NextResponse.json({ error: false, data: newLog, message: "Time logged" });
  }

  return NextResponse.json({ error: true, message: "Invalid action" }, { status: 400 });
}
