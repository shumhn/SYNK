import { NextResponse } from "next/server";

/**
 * GET /api/push/vapid-public-key - Get VAPID public key for push notifications
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: true, message: "Push notifications not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: false, data: { publicKey } },
    { status: 200 }
  );
}
