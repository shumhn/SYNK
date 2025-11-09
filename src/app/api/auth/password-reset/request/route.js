import { NextResponse } from "next/server";
import crypto from "crypto";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import AuditLog from "@/models/AuditLog";
import { Resend } from "resend";

/**
 * POST /api/auth/password-reset/request
 * Request password reset email with token
 */
export async function POST(request) {
  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findOne({ email: email.toLowerCase() });
  
  // Don't reveal if user exists or not (security)
  if (!user) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
  }

  // Check if account is active
  if (user.isActive === false) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Store token
  await PasswordResetToken.create({
    email: email.toLowerCase(),
    token,
    expiresAt,
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
  });

  // Send email
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  
  try {
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "ZPB <noreply@yourdomain.com>",
        to: [email],
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your ZPB account.</p>
          <p>Click the link below to reset your password (valid for 30 minutes):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Thanks,<br>The ZPB Team</p>
        `,
      });
    } else {
      console.warn("RESEND_API_KEY missing; skipping email send.", { resetUrl });
    }
  } catch (error) {
    console.error("Error sending password reset email:", error);
  }

  // Log request
  await AuditLog.create({
    user: user._id,
    action: "password_reset_requested",
    status: "success",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
}
