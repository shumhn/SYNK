import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import ExternalStorageAccount from "@/models/ExternalStorageAccount";

/**
 * GET /api/storage/dropbox/callback
 * Handle Dropbox OAuth callback
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?error=dropbox_auth_failed`
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or state" },
        { status: 400 }
      );
    }

    const clientId = process.env.DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/dropbox/callback`;
    
    console.log("Dropbox callback - exchanging code for tokens");
    console.log("Client ID:", clientId);
    console.log("Redirect URI:", redirectUri);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log("Token exchange failed:", errorText);
      throw new Error(`Failed to exchange authorization code: ${tokenResponse.status} ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, account_id } = tokens;

    // Get user info from Dropbox
    const userInfoResponse = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const userInfo = await userInfoResponse.json();

    await connectToDatabase();

    // Save or update account
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;
    
    await ExternalStorageAccount.findOneAndUpdate(
      { user: state, provider: "dropbox" },
      {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        accountId: account_id || userInfo.account_id,
        accountEmail: userInfo.email,
        accountName: userInfo.name?.display_name,
        isActive: true,
        isRevoked: false,
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?dropbox_connected=true`
    );
  } catch (error) {
    console.error("Error in Dropbox callback:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/files?error=dropbox_connection_failed&details=${encodeURIComponent(error.message)}`
    );
  }
}
