import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Objective from "@/models/Objective";
import Project from "@/models/Project";
import Phase from "@/models/Phase";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

function badIds() {
  return NextResponse.json({ error: true, message: "Invalid id" }, { status: 400 });
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, objectiveId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(objectiveId)) return badIds();

  await connectToDatabase();
  const objective = await Objective.findOne({ _id: objectiveId, project: id }).lean();
  if (!objective) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: objective }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, objectiveId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(objectiveId)) return badIds();

  const body = await req.json();
  const update = {};
  if (body.title) update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (body.dueDate) update.dueDate = new Date(body.dueDate);
  if (body.status) update.status = body.status;
  if (typeof body.order === "number") update.order = body.order;
  if (body.completedAt) update.completedAt = new Date(body.completedAt);
  if (body.phase) update.phase = body.phase;
  if (body.owner) update.owner = body.owner;

  await connectToDatabase();
  // Validate phase belongs to project if provided
  if (update.phase) {
    if (!mongoose.isValidObjectId(update.phase)) return NextResponse.json({ error: true, message: "Invalid phase id" }, { status: 400 });
    const phaseDoc = await Phase.findOne({ _id: update.phase, project: id }).select("_id").lean();
    if (!phaseDoc) return NextResponse.json({ error: true, message: "Phase not found for this project" }, { status: 400 });
  }
  // Validate owner is approved and on project if provided
  if (update.owner) {
    if (!mongoose.isValidObjectId(update.owner)) return NextResponse.json({ error: true, message: "Invalid owner id" }, { status: 400 });
    const ownerDoc = await User.findOne({ _id: update.owner, roles: { $exists: true, $ne: [] } }).select("_id").lean();
    if (!ownerDoc) return NextResponse.json({ error: true, message: "Owner user not found or not approved" }, { status: 400 });
    const project = await Project.findById(id).select("managers members").lean();
    if (!project) return NextResponse.json({ error: true, message: "Project not found" }, { status: 404 });
    const isOnProject = [...(project.managers || []), ...(project.members || [])]
      .map((x) => x.toString())
      .includes(update.owner.toString());
    if (!isOnProject) return NextResponse.json({ error: true, message: "Owner must be a project manager or member" }, { status: 400 });
  }

  const updated = await Objective.findOneAndUpdate({ _id: objectiveId, project: id }, update, { new: true });
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const { id, objectiveId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(objectiveId)) return badIds();

  await connectToDatabase();
  const deleted = await Objective.findOneAndDelete({ _id: objectiveId, project: id });
  if (!deleted) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });
  return NextResponse.json({ error: false, message: "Objective deleted" }, { status: 200 });
}
