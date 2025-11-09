import { NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getAuthUser } from "@/lib/auth/guard";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";

/**
 * GET /api/auth/2fa/setup
 * Generate 2FA secret and QR code for setup
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isPrivileged = (user.roles || []).some((r) => ["admin", "hr"].includes(r));
  if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectToDatabase();

  // Reuse existing secret if present and not yet enabled
  const dbUser = await User.findById(user._id).select("+twoFA.secret twoFA.enabled email");
  if (dbUser?.twoFA?.enabled) {
    return NextResponse.json({ error: "2FA already enabled" }, { status: 400 });
  }

  let secretBase32 = dbUser?.twoFA?.secret;
  let otpauthUrl;
  if (!secretBase32) {
    const secret = speakeasy.generateSecret({
      name: `ZPB (${user.email})`,
      issuer: "Zalient Productivity Board",
    });
    secretBase32 = secret.base32;
    otpauthUrl = secret.otpauth_url;
    await User.findByIdAndUpdate(user._id, { "twoFA.secret": secretBase32 });
  } else {
    // Build otpauth URL for existing secret
    otpauthUrl = speakeasy.otpauthURL({
      secret: secretBase32,
      label: `ZPB (${user.email})`,
      issuer: "Zalient Productivity Board",
      encoding: "base32",
    });
  }

  const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({
    secret: secretBase32,
    qrCode: qrCodeDataURL,
    manualEntry: otpauthUrl,
  });
}
