import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { requireRoles } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";

/**
 * GET /api/auth/2fa/setup
 * Generate 2FA secret and QR code for setup
 */
export async function GET() {
  const auth = await requireRoles(["admin", "hr"]);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await connectToDatabase();

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `ZPB (${auth.user.email})`,
    issuer: "Zalient Productivity Board",
  });

  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

  // Temporarily store secret (user must verify to enable)
  await User.findByIdAndUpdate(auth.user._id, {
    "twoFA.secret": secret.base32,
  });

  return NextResponse.json({
    secret: secret.base32,
    qrCode: qrCodeDataURL,
    manualEntry: secret.otpauth_url,
  });
}
