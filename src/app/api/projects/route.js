import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";
import Department from "@/models/Department";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const archived = searchParams.get("archived") === "true";
  
  const filter = { archived };
  if (q) filter.$or = [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }];
  if (status) filter.status = status;
  
  const projects = await Project.find(filter)
    .select("title description startDate endDate status progress budget departments managers members createdAt")
    .populate("departments", "name")
    .populate("managers", "username email")
    .sort({ createdAt: -1 })
    .lean();
  
  return NextResponse.json({ error: false, data: projects }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  const body = await req.json();
  const { title, description, startDate, endDate } = body;
  const departments = Array.isArray(body.departments) ? body.departments : [];
  const managers = Array.isArray(body.managers) ? body.managers : [];
  const members = Array.isArray(body.members) ? body.members : [];
  const budget = body.budget || { allocated: 0, spent: 0, currency: "USD" };
  
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });
  
  await connectToDatabase();
  // Validate departments exist and are not archived
  if (departments.length) {
    const depDocs = await Department.find({ _id: { $in: departments }, archived: false }).select("_id").lean();
    if (depDocs.length !== departments.length) {
      return NextResponse.json({ error: true, message: "One or more departments are invalid or archived" }, { status: 400 });
    }
  }
  
  // Validate managers have privileged roles
  if (managers.length) {
    const mgrDocs = await User.find({ _id: { $in: managers }, roles: { $in: ["admin", "hr", "manager"] } })
      .select("_id")
      .lean();
    if (mgrDocs.length !== managers.length) {
      return NextResponse.json({ error: true, message: "One or more managers are invalid or not allowed" }, { status: 400 });
    }
  }
  
  // Validate members are approved (non-empty roles)
  if (members.length) {
    const memDocs = await User.find({ _id: { $in: members }, roles: { $exists: true, $ne: [] } })
      .select("_id")
      .lean();
    if (memDocs.length !== members.length) {
      return NextResponse.json({ error: true, message: "One or more members are invalid or not approved" }, { status: 400 });
    }
  }
  
  // Ensure all managers are also members
  const membersSet = new Set([...(members || []), ...(managers || [])]);
  const normalizedMembers = Array.from(membersSet);
  
  const created = await Project.create({
    title: title.trim(),
    description,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    departments,
    managers,
    members: normalizedMembers,
    budget,
    createdBy: auth.user._id,
  });
  
  return NextResponse.json({ error: false, data: { id: created._id } }, { status: 201 });
}
