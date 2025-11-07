import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import TaskTemplate from "@/models/TaskTemplate";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid template id" }, { status: 400 });
  }
  
  const body = await req.json();
  const { project, milestone, assignee, dueDate } = body;
  
  if (!project) {
    return NextResponse.json({ error: true, message: "Project ID required" }, { status: 400 });
  }
  
  await connectToDatabase();
  const template = await TaskTemplate.findById(id).lean();
  if (!template) return NextResponse.json({ error: true, message: "Template not found" }, { status: 404 });
  
  // Create main task from template
  const mainTask = await Task.create({
    project,
    milestone,
    title: template.name,
    description: template.description,
    assignee,
    taskType: template.taskType,
    priority: template.priority,
    estimatedHours: template.estimatedHours,
    tags: template.tags,
    checklist: template.checklist.map((item) => ({ ...item, completed: false })),
    dueDate: dueDate ? new Date(dueDate) : undefined,
  });
  
  // Create subtasks if any
  const subtaskIds = [];
  for (const st of template.subtasks || []) {
    const subtask = await Task.create({
      project,
      parentTask: mainTask._id,
      title: st.title,
      description: st.description,
      estimatedHours: st.estimatedHours,
      status: "todo",
    });
    subtaskIds.push(subtask._id);
  }
  
  return NextResponse.json({ error: false, data: { taskId: mainTask._id, subtaskIds } }, { status: 201 });
}
