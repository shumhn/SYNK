import { NextResponse } from "next/server";
import { getProviders } from "next-auth/react";
import { authOptions } from "@/lib/auth/nextAuthOptions";

export async function GET() {
  try {
    const providers = await getProviders();
    return NextResponse.json({ 
      success: true, 
      providers,
      googleProvider: !!providers?.google,
      envVars: {
        clientId: !!process.env.GOOGLE_CLIENT_ID,
        clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
