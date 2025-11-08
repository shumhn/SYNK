import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db/mongodb";
import Notification from "@/models/Notification";
import { requireRoles } from "@/lib/auth/guard";

/**
 * PATCH /api/notifications/[id]
 * Mark a single notification as read or clicked
 */
export async function PATCH(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid notification id" }, { status: 400 });
  }

  await connectToDatabase();

  const notification = await Notification.findOne({ _id: id, user: auth.user._id });
  if (!notification) {
    return NextResponse.json({ error: true, message: "Notification not found" }, { status: 404 });
  }

  const body = await req.json();
  const { isRead, clicked } = body;

  if (isRead !== undefined) {
    notification.isRead = isRead;
    if (isRead && !notification.readAt) {
      notification.readAt = new Date();
    }
  }

  if (clicked) {
    notification.clickedAt = new Date();
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
    }
  }

  await notification.save();

  return NextResponse.json({ error: false, data: notification }, { status: 200 });
}

/**
 * DELETE /api/notifications/[id]
 * Delete a single notification
 */
export async function DELETE(req, { params }) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: true, message: "Invalid notification id" }, { status: 400 });
  }

  await connectToDatabase();

  const result = await Notification.deleteOne({ _id: id, user: auth.user._id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: true, message: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ error: false, message: "Notification deleted" }, { status: 200 });
}
