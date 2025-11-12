import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guard";

export async function GET(req) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: true, message: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ error: false, data: user }, { status: 200 });
}
