import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db/mongodb";
import { getAuthUser } from "@/lib/auth/guard";
import User from "@/models/User";

// DEV-ONLY endpoint to reset 2FA for the currently authenticated admin/HR
// POST /api/auth/2fa/reset-dev
async function resetImpl() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isPrivileged = (user.roles || []).some((r) => ["admin", "hr"].includes(r));
  if (!isPrivileged) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectToDatabase();

  await User.findByIdAndUpdate(user._id, {
    $set: {
      "twoFA.enabled": false,
      "twoFA.secret": undefined,
      "twoFA.backupCodes": [],
      "twoFA.verifiedAt": undefined,
    },
  });

  // Clear verification cookie
  const cookieStore = await cookies();
  cookieStore.set("2fa_verified", "", { httpOnly: true, maxAge: 0, sameSite: "lax" });

  return NextResponse.json({ ok: true, message: "2FA reset for current user. Re-run setup." });
}

export async function POST() {
  return resetImpl();
}

export async function GET() {
  return resetImpl();
}
