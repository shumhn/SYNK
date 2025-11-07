import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Project from "@/models/Project";
import Task from "@/models/Task";
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
  const { title, description, startDate, endDate, departments, managers, members, budget } = body;
  
  if (!title?.trim()) return NextResponse.json({ error: true, message: { title: ["Title is required"] } }, { status: 400 });
  
  await connectToDatabase();
  const created = await Project.create({
    title: title.trim(),
    description,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    departments: departments || [],
    managers: managers || [],
    members: members || [],
    budget: budget || { allocated: 0, spent: 0, currency: "USD" },
    createdBy: auth.user._id,
  });
  
  return NextResponse.json({ error: false, data: { id: created._id } }, { status: 201 });
}
