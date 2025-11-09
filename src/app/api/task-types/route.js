import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import TaskType from "@/models/TaskType";
import { requireRoles } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  await connectToDatabase();
  const types = await TaskType.find({ archived: { $ne: true } }).sort({ label: 1 }).lean();
  return NextResponse.json({ error: false, data: types }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const body = await req.json();
  const name = (body?.name || body?.label || "").trim().toLowerCase();
  const label = (body?.label || body?.name || "").trim();
  const color = (body?.color || "").trim();
  if (!name || !label) return NextResponse.json({ error: true, message: { name: ["Name/Label is required"] } }, { status: 400 });
  await connectToDatabase();
  const exists = await TaskType.findOne({ name }).lean();
  if (exists) return NextResponse.json({ error: true, message: "Task type already exists" }, { status: 400 });
  const created = await TaskType.create({ name, label, color: color || undefined });
  return NextResponse.json({ error: false, data: created }, { status: 201 });
}
