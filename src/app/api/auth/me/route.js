import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guard";

export async function GET(req) {
  const auth = await requireRoles(["admin", "hr", "manager", "employee"]);
  if (!auth.ok) return NextResponse.json({ error: true, message: auth.error }, { status: auth.status });
  
  return NextResponse.json({ error: false, data: auth.user }, { status: 200 });
}
