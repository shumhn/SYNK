import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth/jwt";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.id) return null;
  await connectToDatabase();
  // Update lastSeenAt if sessionId is present
  if (payload.sessionId) {
    await User.updateOne(
      { _id: payload.id, "activeSessions.sessionId": payload.sessionId },
      {
        $set: {
          "activeSessions.$.lastSeenAt": new Date(),
          isOnline: true,
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
  if (allowed.length === 0) return { ok: true, user };
  const has = (user.roles || []).some((r) => allowed.includes(r));
  if (!has) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user };
}
