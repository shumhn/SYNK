import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";

/**
 * GET /api/storage/google-drive/auth
 * Initiate Google Drive OAuth flow
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Google Drive integration not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/google-drive/callback`;
    const scope = "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email";
    
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", user._id.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Google Drive auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication", details: error.message },
      { status: 500 }
    );
  }
}
