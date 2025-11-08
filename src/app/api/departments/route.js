import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

export async function GET() {
  // Ensure connection before counting
  await connectToDatabase();
  // Allow viewing during initial setup if no departments exist
  const existingCount = await Department.countDocuments();
  if (existingCount === 0) {
    // No departments exist, allow viewing for authenticated users
    const auth = await requireRoles([]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  } else {
    // Departments exist, require admin/hr/manager roles
    const auth = await requireRoles(["admin", "hr", "manager"]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }
  const list = await Department.find().select("name description createdAt updatedAt").lean();
  return NextResponse.json({ error: false, data: list }, { status: 200 });
}

export async function POST(req) {
  // Ensure connection before counting
  await connectToDatabase();
  // Allow creation during initial setup if no departments exist
  const existingCount = await Department.countDocuments();
  if (existingCount === 0) {
    // No departments exist, allow creation for authenticated users
    const auth = await requireRoles([]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  } else {
    // Departments exist, require admin/hr roles
    const auth = await requireRoles(["admin", "hr"]);
    if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  if (!name) return NextResponse.json({ error: true, message: { name: ["Name is required"] } }, { status: 400 });
  const exists = await Department.findOne({ name }).lean();
  if (exists) return NextResponse.json({ error: true, message: "Department already exists" }, { status: 400 });
  const created = await Department.create({ name, description });
  return NextResponse.json({ error: false, data: { id: created._id, name: created.name, description: created.description } }, { status: 201 });
}
