import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import { requireRoles } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA after verifying current token or backup code
 */
export async function POST(request) {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findById(auth.user._id).select("+twoFA.secret +twoFA.backupCodes");
  if (!user || !user.twoFA?.enabled) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }

  let verified = false;

  // Check if it's a backup code
  if (user.twoFA.backupCodes?.includes(token.toUpperCase())) {
    verified = true;
    // Remove used backup code
    user.twoFA.backupCodes = user.twoFA.backupCodes.filter((code) => code !== token.toUpperCase());
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
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Disable 2FA
  user.twoFA.enabled = false;
  user.twoFA.secret = undefined;
  user.twoFA.backupCodes = [];
  user.twoFA.verifiedAt = undefined;
  await user.save();

  // Log disable
  await AuditLog.create({
    user: user._id,
    action: "2fa_disabled",
    status: "success",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ message: "2FA disabled successfully" });
}
