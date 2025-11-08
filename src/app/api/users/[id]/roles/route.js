import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { requireRoles } from "@/lib/auth/guard";
import { AssignRolesSchema } from "@/lib/validations/user";
import { notifyUserAboutDecision } from "@/lib/notifications";

function badId() {
  return NextResponse.json({ error: true, message: "Invalid user id" }, { status: 400 });
}

export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return badId();

  const body = await req.json();
  const parsed = AssignRolesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: true, message: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectToDatabase();

  // Get the user before updating to compare roles
  const userBeforeUpdate = await User.findById(id).select("username email roles");

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: { roles: parsed.data.roles, permissions: parsed.data.permissions || [] } },
    { new: true, select: "username email roles permissions" }
  );
  if (!updated) return NextResponse.json({ error: true, message: "Not found" }, { status: 404 });

  // If user was previously without roles and now has roles, notify them of approval
  const hadRolesBefore = userBeforeUpdate?.roles && userBeforeUpdate.roles.length > 0;
  const hasRolesNow = updated.roles && updated.roles.length > 0;

  if (!hadRolesBefore && hasRolesNow) {
    // User was approved - send notification
    try {
      await notifyUserAboutDecision(updated, "approved", auth.user);
    } catch (notificationError) {
      console.error("Failed to send approval notification:", notificationError);
      // Don't fail the role assignment if notification fails
    }
  }

  return NextResponse.json({ error: false, data: updated }, { status: 200 });
}
