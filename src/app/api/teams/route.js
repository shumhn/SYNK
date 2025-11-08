import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Team from "@/models/Team";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req) {
  // Allow viewing during initial setup if no teams exist
  const existingCount = await Team.countDocuments();
  if (existingCount === 0) {
    // No teams exist, allow viewing for authenticated users
    const auth = await requireRoles([]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  } else {
    // Teams exist, require admin/hr/manager roles
    const auth = await requireRoles(["admin", "hr", "manager"]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const filter = department ? { department } : {};
  const list = await Team.find(filter)
    .select("name department description createdAt updatedAt")
    .populate("department", "name")
    .lean();
  return NextResponse.json({ error: false, data: list }, { status: 200 });
}

export async function POST(req) {
  // Allow creation during initial setup if no teams exist
  const existingCount = await Team.countDocuments();
  if (existingCount === 0) {
    // No teams exist, allow creation for authenticated users
    const auth = await requireRoles([]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  } else {
    // Teams exist, require admin/hr roles
    const auth = await requireRoles(["admin", "hr"]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }
  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const department = typeof body?.department === 'string' ? body.department : undefined;
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  if (!name) return NextResponse.json({ error: true, message: { name: ["Name is required"] } }, { status: 400 });
  await connectToDatabase();
  if (department) {
    const dep = await Department.findById(department).lean();
    if (!dep) return NextResponse.json({ error: true, message: "Department not found" }, { status: 404 });
  }
  const exists = await Team.findOne({ name, department: department || null }).lean();
  if (exists) return NextResponse.json({ error: true, message: "Team already exists" }, { status: 400 });
  const created = await Team.create({ name, department: department || undefined, description });
  return NextResponse.json({ error: false, data: { id: created._id, name: created.name, department: created.department, description: created.description } }, { status: 201 });
}
