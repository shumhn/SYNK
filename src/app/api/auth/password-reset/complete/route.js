import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/auth/password-reset/complete
 * Complete password reset with token and new password
 */
export async function POST(request) {
  const body = await request.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  await connectToDatabase();

  // Find and validate token
  const resetToken = await PasswordResetToken.findOne({ token, used: false });
  
  if (!resetToken) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  // Find user
  const user = await User.findOne({ email: resetToken.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update password (will be hashed by pre-save hook)
  user.password = password;
  await user.save();

  // Mark token as used
  resetToken.used = true;
  resetToken.usedAt = new Date();
  await resetToken.save();

  // Revoke all active sessions for security
  user.activeSessions = user.activeSessions.map((session) => ({
    ...session,
    revokedAt: new Date(),
  }));
  await user.save();

  // Log password reset
  await AuditLog.create({
    user: user._id,
    action: "password_reset_completed",
    status: "success",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ message: "Password reset successfully" });
}
