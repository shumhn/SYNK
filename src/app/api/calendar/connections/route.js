import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import CalendarConnection from "@/models/CalendarConnection";

/**
 * GET /api/calendar/connections - Get user's calendar connections
 */
export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    await connectToDatabase();
    const connections = await CalendarConnection.find({ user: auth.user._id })
      .select("-accessToken -refreshToken")
      .lean();

    return NextResponse.json({ error: false, data: connections });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar/connections - Disconnect calendar
 */
export async function DELETE(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");

    await connectToDatabase();
    await CalendarConnection.findOneAndDelete({ user: auth.user._id, provider });

    return NextResponse.json({ error: false, message: "Calendar disconnected" });
  } catch (e) {
    return NextResponse.json({ error: true, message: e.message }, { status: 500 });
  }
}
