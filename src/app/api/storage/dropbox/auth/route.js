import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";

/**
 * GET /api/storage/dropbox/auth
 * Initiate Dropbox OAuth flow
 */
export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.DROPBOX_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Dropbox integration not configured" },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/dropbox/callback`;
    
    const authUrl = new URL("https://www.dropbox.com/oauth2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("token_access_type", "offline");
    authUrl.searchParams.set("state", user._id.toString());

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating Dropbox auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate authentication", details: error.message },
      { status: 500 }
    );
  }
}
