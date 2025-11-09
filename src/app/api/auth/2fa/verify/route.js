import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { getAuthUser } from "@/lib/auth/guard";

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA token during login
 */
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = body?.token;
  const email = body?.email;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  await connectToDatabase();

  // Prefer current authenticated user (works for Google SSO) and fall back to email
  let userDoc = null;
  const authUser = await getAuthUser();
  if (authUser) {
    userDoc = await User.findById(authUser._id).select("+twoFA.secret +twoFA.backupCodes");
  }
  if (!userDoc && email) {
    userDoc = await User.findOne({ email: email.toLowerCase() }).select("+twoFA.secret +twoFA.backupCodes");
  }

  const user = userDoc;
  if (!user || !user.twoFA?.enabled) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let verified = false;

  // Check if it's a backup code
  if (user.twoFA.backupCodes?.includes(token.toUpperCase())) {
    verified = true;
    // Remove used backup code
    user.twoFA.backupCodes = user.twoFA.backupCodes.filter((code) => code !== token.toUpperCase());
    await user.save();
  } else {
    // Verify TOTP token
    verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token,
      window: 2,
    });
  }

  if (!verified) {
    // Log failed attempt
    await AuditLog.create({
      user: user._id,
      action: "2fa_failed",
      status: "failure",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });
    
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Set 2FA verified cookie (1 hour)
  const cookieStore = await cookies();
  cookieStore.set("2fa_verified", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 3600, // 1 hour
  });

  // Log successful verification
  await AuditLog.create({
    user: user._id,
    action: "2fa_verified",
    status: "success",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ message: "2FA verified successfully" });
}
