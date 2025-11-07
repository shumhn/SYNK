import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

function addInterval(date, frequency, interval) {
  const d = new Date(date || Date.now());
  const i = interval || 1;
  if (frequency === "daily") d.setDate(d.getDate() + i);
  else if (frequency === "weekly") d.setDate(d.getDate() + i * 7);
  else if (frequency === "monthly") d.setMonth(d.getMonth() + i);
  else if (frequency === "yearly") d.setFullYear(d.getFullYear() + i);
  else d.setDate(d.getDate() + i * 7);
  return d;
}

export async function POST() {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  await connectToDatabase();

  const now = new Date();
  const tasks = await Task.find({ "recurring.enabled": true }).lean();
  let generated = 0;

  for (const t of tasks) {
    const freq = t.recurring?.frequency || "weekly";
    const interval = t.recurring?.interval || 1;
    const last = t.recurring?.lastGenerated ? new Date(t.recurring.lastGenerated) : null;
    const nextPoint = last ? addInterval(last, freq, interval) : now;
    const endDate = t.recurring?.endDate ? new Date(t.recurring.endDate) : null;

    if (endDate && now > endDate) continue;
    if (last && now < nextPoint) continue;

    const newDue = t.dueDate ? addInterval(new Date(t.dueDate), freq, interval) : undefined;

    await Task.create({
      project: t.project,
      milestone: t.milestone,
      title: t.title,
      description: t.description,
      assignee: t.assignee,
      assignees: t.assignees || [],
      status: "todo",
      priority: t.priority,
      taskType: t.taskType,
      dueDate: newDue,
      estimatedHours: t.estimatedHours,
      tags: t.tags || [],
      checklist: (t.checklist || []).map((i) => ({ text: i.text, completed: false, order: i.order || 0 })),
      attachments: [],
      parentTask: null,
      progress: 0,
    });

    await Task.updateOne({ _id: t._id }, { $set: { "recurring.lastGenerated": now } });
    generated++;
  }

  return NextResponse.json({ error: false, data: { generated } }, { status: 200 });
}
