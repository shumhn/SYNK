import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "./nextAuthOptions";

export async function getAuthUser() {
  await connectToDatabase();
  
  // First check for NextAuth session (Google OAuth)
  const session = await getServerSession(authOptions);
  console.log("Session in getAuthUser:", session?.user);
  
  if (session?.user?.id) {
    const user = await User.findById(session.user.id).lean();
    console.log("User found from session:", user);
    if (user) return user;
  }

  // Fallback to custom JWT cookie (credentials login)
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return null;
  }

  if (
    typeof payload !== "object" ||
    !payload ||
    typeof payload.id !== "string"
  ) {
    return null;
  }
  
  // Update lastSeenAt if sessionId is present (online is derived from recent activity)
  if (payload.sessionId) {
    await User.updateOne(
      { _id: payload.id, "activeSessions.sessionId": payload.sessionId },
      {
        $set: {
          "activeSessions.$.lastSeenAt": new Date(),
        },
      }
    );
  }
  const user = await User.findById(payload.id).lean();
  if (!user) return null;
  return user;
}

export async function requireRoles(allowed = []) {
  const user = await getAuthUser();
  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  
  // Check if account is active
  if (user.isActive === false) {
    return { ok: false, status: 403, error: "Account deactivated" };
  }
  
  if (allowed.length === 0) return { ok: true, user };
  const has = (user.roles || []).some((r) => allowed.includes(r));
  if (!has) return { ok: false, status: 403, error: "Forbidden" };
  
  // Check 2FA requirement for admin/hr roles
  const requiresTwoFA = (user.roles || []).some((r) => ["admin", "hr"].includes(r));
  if (requiresTwoFA && user.twoFA?.enabled) {
    const cookieStore = await cookies();
    const twoFAVerified = cookieStore.get("2fa_verified")?.value;
    if (!twoFAVerified) {
      return { ok: false, status: 403, error: "2FA verification required", requiresTwoFA: true };
    }
  }
  
  return { ok: true, user };
}
