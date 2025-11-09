import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import crypto from "crypto";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/auth/2fa/enable
 * Verify TOTP code and enable 2FA
 */
export async function POST(request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isPrivileged = (user.roles || []).some((r) => ["admin", "hr"].includes(r));
  if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { token } = body;

  if (!token || token.length !== 6) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  await connectToDatabase();

  // Get user with secret
  const dbUser = await User.findById(user._id).select("+twoFA.secret");
  if (!dbUser || !dbUser.twoFA?.secret) {
    return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
  }

  // Verify token
  const verified = speakeasy.totp.verify({
    secret: dbUser.twoFA.secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before/after
  });

  if (!verified) {
    // Log failed attempt
    await AuditLog.create({
      user: dbUser._id,
      action: "2fa_failed",
      status: "failure",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      userAgent: request.headers.get("user-agent"),
    });
    
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  // Enable 2FA
  dbUser.twoFA.enabled = true;
  dbUser.twoFA.backupCodes = backupCodes;
  dbUser.twoFA.verifiedAt = new Date();
  await dbUser.save();

  // Log successful enablement
  await AuditLog.create({
    user: user._id,
    action: "2fa_enabled",
    status: "success",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({
    message: "2FA enabled successfully",
    backupCodes, // Show once, user must save them
  });
}
