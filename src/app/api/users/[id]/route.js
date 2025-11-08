import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import { UpdateUserSchema } from "@/lib/validations/user";

function badId() {
  return NextResponse.json(
    { error: true, message: "Invalid user id" },
    { status: 400 }
  );
}

export async function GET(_req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const user = await User.findById(id)
    .select("-password")
    .populate("department", "name")
    .populate("team", "name")
    .lean();
  if (!user)
    return NextResponse.json(
      { error: true, message: "Not found" },
      { status: 404 }
    );
  return NextResponse.json({ error: false, data: user }, { status: 200 });
}

export async function PATCH(req, { params }) {
  const currentUser = await requireRoles([]); // Allow any authenticated user for self-update
  if (!currentUser.ok)
    return NextResponse.json(
      { error: true, message: currentUser.error },
      { status: currentUser.status }
    );

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();

  // Check if user is updating their own profile OR has admin/hr permissions
  const isSelfUpdate = currentUser.user._id.toString() === id;
  const hasAdminPermissions = (currentUser.user.roles || []).some((role) =>
    ["admin", "hr"].includes(role)
  );

  // Allow self-update during onboarding (no roles) OR admin/hr permissions
  if (!isSelfUpdate && !hasAdminPermissions) {
    return NextResponse.json(
      { error: true, message: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: true, message: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const update = { ...parsed.data };
  // Do not allow roles/permissions via this endpoint
  delete update.roles;
  delete update.permissions;

  await connectToDatabase();

  // Ensure email/username uniqueness if updating
  if (update.email || update.username) {
    const conflict = await User.findOne({
      _id: { $ne: id },
      $or: [
        update.email ? { email: update.email } : null,
        update.username ? { username: update.username } : null,
      ].filter(Boolean),
    }).lean();
    if (conflict)
      return NextResponse.json(
        { error: true, message: "Email or username already in use" },
        { status: 400 }
      );
  }

  const updated = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    select: "-password",
  });
  if (!updated)
    return NextResponse.json(
      { error: true, message: "Not found" },
      { status: 404 }
    );
  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}

export async function DELETE(_req, { params }) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();
  await connectToDatabase();
  const res = await User.findByIdAndDelete(id);
  if (!res)
    return NextResponse.json(
      { error: true, message: "Not found" },
      { status: 404 }
    );
  return NextResponse.json(
    { error: false, message: "User deleted" },
    { status: 200 }
  );
}
