import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  await connectToDatabase();
  const list = await Department.find().select("name description createdAt updatedAt").lean();
  return NextResponse.json({ error: false, data: list }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  if (!name) return NextResponse.json({ error: true, message: { name: ["Name is required"] } }, { status: 400 });
  await connectToDatabase();
  const exists = await Department.findOne({ name }).lean();
  if (exists) return NextResponse.json({ error: true, message: "Department already exists" }, { status: 400 });
  const created = await Department.create({ name, description });
  return NextResponse.json({ error: false, data: { id: created._id, name: created.name, description: created.description } }, { status: 201 });
}
