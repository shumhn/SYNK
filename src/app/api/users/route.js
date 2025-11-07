import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import { CreateUserSchema } from "@/lib/validations/user";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const filter = q
    ? {
        $or: [
          { username: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
          { designation: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter)
    .select("username email image roles department team designation employmentType lastLoginAt isOnline createdAt updatedAt")
    .lean();

  return NextResponse.json({ error: false, data: users }, { status: 200 });
}

export async function POST(req) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: true, message: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectToDatabase();

  const { email, username } = parsed.data;
  const exists = await User.findOne({ $or: [{ email }, { username }] }).lean();
  if (exists) {
    return NextResponse.json({ error: true, message: "User already exists" }, { status: 400 });
  }

  const created = await User.create(parsed.data);

  return NextResponse.json(
    {
      error: false,
      data: {
        id: created._id,
        username: created.username,
        email: created.email,
        roles: created.roles,
      },
    },
    { status: 201 }
  );
}
