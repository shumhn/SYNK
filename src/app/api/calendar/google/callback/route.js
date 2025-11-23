import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import { requireRoles } from "@/lib/auth/guard";
import { getGoogleCalendarTokens } from "@/lib/google-calendar";
import CalendarConnection from "@/models/CalendarConnection";

/**
 * GET /api/calendar/google/callback
 * Handle Google Calendar OAuth callback
 */
export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_connection_denied`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_no_code`
      );
    }

    // Exchange code for tokens
    const tokens = await getGoogleCalendarTokens(code);

    await connectToDatabase();

    // Store or update calendar connection
    await CalendarConnection.findOneAndUpdate(
      { user: auth.user._id, provider: "google" },
      {
        user: auth.user._id,
        provider: "google",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        active: true,
        syncEnabled: true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar_connected=google`
    );
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_connection_failed`
    );
  }
}
