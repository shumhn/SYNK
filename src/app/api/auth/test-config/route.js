import { NextResponse } from "next/server";

export async function GET() {
  const config = {
    googleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || "not set",
  };
  
  return NextResponse.json(config);
}
