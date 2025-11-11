import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import ExternalStorageAccount from "@/models/ExternalStorageAccount";

/**
 * GET /api/storage/google-drive/callback
 * Handle Google Drive OAuth callback
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?error=google_drive_auth_failed`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or state" },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/google-drive/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange authorization code");
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const userInfo = await userInfoResponse.json();

    await connectToDatabase();

    // Save or update account
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    await ExternalStorageAccount.findOneAndUpdate(
      { user: state, provider: "google_drive" },
      {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        accountId: userInfo.id,
        accountEmail: userInfo.email,
        accountName: userInfo.name,
        isActive: true,
        isRevoked: false,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?google_drive_connected=true`
    );
  } catch (error) {
    console.error("Error in Google Drive callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?error=google_drive_connection_failed`
    );
  }
}
