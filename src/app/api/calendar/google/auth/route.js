import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";
import { getGoogleCalendarAuthUrl } from "@/lib/google-calendar";

/**
 * GET /api/calendar/google/auth
 * Initiate Google Calendar OAuth flow
 */
export async function GET() {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);

  try {
    const authUrl = getGoogleCalendarAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Google Calendar auth:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_auth_failed`
    );
  }
}
