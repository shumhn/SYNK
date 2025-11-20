import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import UserNotificationPreferences from "@/models/UserNotificationPreferences";

/**
 * GET /api/notifications/preferences - Get current user's notification preferences
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    let preferences = await UserNotificationPreferences.findOne({
      user: auth.user._id,
    }).lean();

    // Return defaults if no preferences set yet
    if (!preferences) {
      preferences = {
        user: auth.user._id,
        email: {
          enabled: true,
          types: {
            task_assigned: true,
            task_comment: true,
            task_due_soon: true,
            task_overdue: true,
            project_invite: true,
            deadline_reminder: true,
            overdue_escalation: true,
            task_completed: false,
            file_uploaded: false,
            daily_digest: true,
          },
        },
        push: {
          enabled: true,
          types: {
            mention: true,
            task_assigned: true,
            task_comment: true,
            task_due_soon: true,
            task_overdue: true,
            file_uploaded: true,
            project_invite: true,
          },
        },
        inApp: {
          enabled: true,
          types: {
            mention: true,
            task_assigned: true,
            task_comment: true,
            task_due_soon: true,
            task_overdue: true,
            project_invite: true,
            deadline_reminder: true,
            overdue_escalation: true,
            task_completed: true,
            file_uploaded: true,
          },
        },
      };
    }

    return NextResponse.json(
      { error: false, data: preferences },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/preferences - Update current user's notification preferences
 */
export async function PATCH(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.json(
      { error: true, message: auth.error },
      { status: auth.status }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const allowedFields = ["email", "push", "inApp"];

    // Validate input structure
    for (const field of allowedFields) {
      if (body[field] && typeof body[field] !== "object") {
        return NextResponse.json(
          { error: true, message: `Invalid ${field} preferences structure` },
          { status: 400 }
        );
      }
    }

    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: true, message: "No valid preferences to update" },
        { status: 400 }
      );
    }

    const preferences = await UserNotificationPreferences.findOneAndUpdate(
      { user: auth.user._id },
      updateData,
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(
      { error: false, data: preferences },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: true, message: e.message },
      { status: 500 }
    );
  }
}
