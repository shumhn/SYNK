import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextAuthOptions";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth/jwt";

export async function POST() {
  await connectToDatabase();

  // Try NextAuth session (Google SSO)
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const sessionId = session?.user?.sessionId;
    if (userId && sessionId) {
      await User.updateOne(
        { _id: userId, "activeSessions.sessionId": sessionId },
        { $set: { "activeSessions.$.lastSeenAt": new Date() } }
      );
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch {}

  // Fallback to JWT cookie (credentials login)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.id && payload?.sessionId) {
        await User.updateOne(
          { _id: payload.id, "activeSessions.sessionId": payload.sessionId },
          { $set: { "activeSessions.$.lastSeenAt": new Date() } }
        );
        return NextResponse.json({ ok: true }, { status: 200 });
      }
    }
  } catch {}

  return NextResponse.json({ ok: false }, { status: 200 });
}
