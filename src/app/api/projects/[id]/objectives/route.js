import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Objective from "@/models/Objective";
import Phase from "@/models/Phase";
import User from "@/models/User";
import Project from "@/models/Project";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const phase = searchParams.get("phase");

  await connectToDatabase();
  const filter = { project: id };
  if (phase && mongoose.isValidObjectId(phase)) filter.phase = phase;

  const objectives = await Objective.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return NextResponse.json({ error: false, data: objectives }, { status: 200 });
}

export async function POST(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid project id" }, { status: 400 });
  }

  const body = await req.json();
  const { title, description, dueDate, status, order, phase, owner } = body;
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });

  await connectToDatabase();

  // If phase is provided, ensure it belongs to the same project
  if (phase) {
    if (!mongoose.isValidObjectId(phase)) return NextResponse.json({ error: true, message: "Invalid phase id" }, { status: 400 });
    const phaseDoc = await Phase.findOne({ _id: phase, project: id }).select("_id").lean();
    if (!phaseDoc) return NextResponse.json({ error: true, message: "Phase not found for this project" }, { status: 400 });
  }

  // If owner is provided, ensure user is approved (non-empty roles)
  if (owner) {
    if (!mongoose.isValidObjectId(owner)) return NextResponse.json({ error: true, message: "Invalid owner id" }, { status: 400 });
    const ownerDoc = await User.findOne({ _id: owner, roles: { $exists: true, $ne: [] } }).select("_id").lean();
    if (!ownerDoc) return NextResponse.json({ error: true, message: "Owner user not found or not approved" }, { status: 400 });

    // Ensure owner is part of the project's managers or members
    const project = await Project.findById(id).select("managers members").lean();
    if (!project) return NextResponse.json({ error: true, message: "Project not found" }, { status: 404 });
    const isOnProject = [...(project.managers || []), ...(project.members || [])]
      .map((x) => x.toString())
      .includes(owner.toString());
    if (!isOnProject) return NextResponse.json({ error: true, message: "Owner must be a project manager or member" }, { status: 400 });
  }

  const created = await Objective.create({
    project: id,
    phase: phase || undefined,
    title: title.trim(),
    description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    status: status || undefined,
    owner: owner || undefined,
    order: typeof order === "number" ? order : 0,
  });

  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
