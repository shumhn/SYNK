import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Milestone from "@/models/Milestone";
import Task from "@/models/Task";
import { requireRoles } from "@/lib/auth/guard";

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }
  
  await connectToDatabase();
  const original = await Project.findById(id).lean();
  if (!original) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  
  // Create duplicate project
  const duplicate = await Project.create({
    ...original,
    _id: undefined,
    title: `${original.title} (Copy)`,
    status: "planning",
    progress: 0,
    archived: false,
    createdBy: auth.user._id,
    createdAt: undefined,
    updatedAt: undefined,
  });
  
  // Duplicate milestones
  const milestones = await Milestone.find({ project: id }).lean();
  const milestoneMap = new Map();
  for (const m of milestones) {
    const newM = await Milestone.create({
      ...m,
      _id: undefined,
      project: duplicate._id,
      status: "pending",
      completedAt: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });
    milestoneMap.set(m._id.toString(), newM._id);
  }
  
  // Duplicate tasks
  const tasks = await Task.find({ project: id }).lean();
  for (const t of tasks) {
    await Task.create({
      ...t,
      _id: undefined,
      project: duplicate._id,
      milestone: t.milestone ? milestoneMap.get(t.milestone.toString()) : undefined,
      status: "todo",
      completedAt: undefined,
      actualHours: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });
  }
  
  return NextResponse.json({ error: false, data: { id: duplicate._id } }, { status: 201 });
}
