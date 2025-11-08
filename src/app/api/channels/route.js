import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import Channel from "@/models/Channel";
import Department from "@/models/Department";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const dep = searchParams.get("department")?.trim();
  const archived = searchParams.get("archived");
  const filter = {
    ...(q ? { name: { $regex: q, $options: "i" } } : {}),
    ...(dep ? { departments: dep } : {}),
    ...(
      archived === "true" ? { archived: true } : archived === "false" ? { archived: { $ne: true } } : {}
    ),
  };
  const channels = await Channel.find(filter)
    .populate("departments", "name")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ error: false, data: channels }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const body = await req.json();
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  const departments = Array.isArray(body?.departments) ? body.departments.filter(Boolean) : [];
  if (!name) return NextResponse.json({ error: true, message: { name: ["Name is required"] } }, { status: 400 });
  await connectToDatabase();
  if (departments.length) {
    const count = await Department.countDocuments({ _id: { $in: departments } });
    if (count !== departments.length) return NextResponse.json({ error: true, message: "Invalid departments" }, { status: 400 });
  }
  const exists = await Channel.findOne({ name }).lean();
  if (exists) return NextResponse.json({ error: true, message: "Channel already exists" }, { status: 400 });
  const created = await Channel.create({ name, description, departments });
  return NextResponse.json({ error: false, data: { id: created._id } }, { status: 201 });
}
