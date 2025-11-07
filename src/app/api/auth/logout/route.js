import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth/jwt";

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const payload = token ? verifyToken(token) : null;

    if (payload?.id) {
      await connectToDatabase();
      if (payload.sessionId) {
        await User.updateOne(
          { _id: payload.id, "activeSessions.sessionId": payload.sessionId },
          { $set: { "activeSessions.$.revokedAt": new Date(), isOnline: false } }
        );
        // Optionally re-check if other sessions exist to set isOnline accordingly
        const user = await User.findById(payload.id).lean();
        const hasActive = (user?.activeSessions || []).some((s) => !s.revokedAt);
        if (hasActive) {
          await User.updateOne({ _id: payload.id }, { $set: { isOnline: true } });
        }
      }
    }

    cookieStore.set({ name: "token", value: "", path: "/", httpOnly: true, maxAge: 0 });
    return NextResponse.json({ error: false, message: "Logged out" }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: true, message: "Internal Server Error" }, { status: 500 });
  }
}
